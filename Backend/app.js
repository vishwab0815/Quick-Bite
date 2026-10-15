require('dotenv').config();
const express = require('express');
const connectToDB = require('./db/db');
const { getDbStatus } = connectToDB;
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('@exortek/express-mongo-sanitize');
const { requestLogger, errorLogger } = require('./middleware/logger');

const authRouter = require('./router/userAuth.router');
const posRouter = require('./router/pos.router');
const platformRouter = require('./router/platform.router');

const app = express();

// Behind a hosting proxy (Render, Nginx) trust its forwarded client IP, so rate limits apply
// per customer instead of one shared limit for everybody. TRUST_PROXY = number of proxy hops.
const trustProxyHops = Number(process.env.TRUST_PROXY ?? (process.env.NODE_ENV === 'production' ? 1 : 0));
if (trustProxyHops > 0) app.set('trust proxy', trustProxyHops);

// Security middleware - Helmet helps secure Express apps by setting HTTP headers
app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
}));

// Gzip responses - bill lists and reports shrink to a fraction of their size
app.use(compression());

// Rate limiting - Prevent brute force attacks
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply rate limiting to all routes
app.use('/api/', limiter);

// Stricter rate limiting for authentication routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login requests per windowMs
    message: 'Too many login attempts, please try again after 15 minutes.',
    skipSuccessfulRequests: true,
});

// Data sanitization against NoSQL injection
app.use(mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
        console.warn(`Request sanitized - removed potentially malicious characters from ${key}`);
    },
}));

// Request logging middleware
if (process.env.NODE_ENV !== 'test') {
    app.use(requestLogger);
}

// Enhanced CORS configuration - supports multiple origins
const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
    : ['http://localhost:5173'];

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true,  // This is crucial for cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['set-cookie']
}));

// Middleware
// Small body limit: the largest request (a 500-item menu import) is well under 1 MB
// Webhooks are verified against their exact bytes, so keep those bodies raw
app.use(['/pos/payments/razorpay/webhook', '/pos/whatsapp/webhook'], express.raw({ type: '*/*', limit: '1mb' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Health check endpoint
// Also used by the keep-alive ping (.github/workflows/keep-alive.yml).
// Open it in a browser to see why the database is not connecting.
app.get('/health', (req, res) => {
    const { connected, problem } = getDbStatus();
    res.set('Cache-Control', 'no-store');
    res.status(200).json({
        status: 'ok',
        db: connected ? 'connected' : 'disconnected',
        ...(problem && { dbProblem: problem }),
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    });
});

// Answer at once with a clear message while the database is unreachable,
// instead of every request hanging and failing with a generic error
app.use((req, res, next) => {
    const { connected, problem } = getDbStatus();
    if (connected || !problem) return next();
    res.status(503).json({
        success: false,
        message: 'The server cannot reach the database right now. Please try again in a minute.'
    });
});

// Routes
// Stricter rate limiting only on login - profile checks on every page load
// must not count towards the 5 failed attempts (that locked staff out of shared counter PCs)
app.use('/api/auth/login', authLimiter);
app.use('/api/auth', authRouter);
app.use('/pos', posRouter); // Counter billing, kitchen screens & token display (polled - kept off the /api limiter)
app.use('/platform', platformRouter); // Platform owner console - superadmin only, invisible (404) to everyone else


// 404 handler - must be after all routes
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.originalUrl
    });
});

// Error logging middleware
app.use(errorLogger);

// Global error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Global error handler:', err.stack);

    // Handle specific error types
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation Error',
            errors: err.errors
        });
    }

    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Token expired'
        });
    }

    // Default error response
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        message: process.env.NODE_ENV === 'development'
            ? err.message
            : 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

connectToDB();

module.exports = app;