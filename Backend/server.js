require('dotenv').config();

// Use PORT from environment variables or default to 3000
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Refuse to start without a JWT secret - every login would fail otherwise
if (!process.env.JWT_SECRET) {
    console.error('❌ JWT_SECRET is not set. Add it to Backend/.env (see .env.example).');
    process.exit(1);
}
if (NODE_ENV === 'production' && process.env.JWT_SECRET.length < 32) {
    console.warn('⚠️  JWT_SECRET is short. Use a random 64+ character secret in production.');
}

const app = require('./app');

const server = app.listen(PORT, () => {
    console.log(`🚀 Server is running in ${NODE_ENV} mode on port ${PORT}`);
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM received. Closing server gracefully...');
    server.close(() => {
        console.log('✅ Server closed successfully');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\n👋 SIGINT received. Closing server gracefully...');
    server.close(() => {
        console.log('✅ Server closed successfully');
        process.exit(0);
    });
});





