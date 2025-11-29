/**
 * Request Logging Middleware
 * Logs all incoming requests with relevant information
 */

/**
 * Simple request logger middleware
 * Logs method, URL, status code, and response time
 */
const requestLogger = (req, res, next) => {
    const startTime = Date.now();

    // Log request
    const requestInfo = {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        timestamp: new Date().toISOString()
    };

    // Capture response
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;

        // Color code based on status
        let statusColor = '\x1b[32m'; // Green for 2xx
        if (statusCode >= 400 && statusCode < 500) statusColor = '\x1b[33m'; // Yellow for 4xx
        if (statusCode >= 500) statusColor = '\x1b[31m'; // Red for 5xx

        console.log(
            `${requestInfo.timestamp} | ${statusColor}${statusCode}\x1b[0m | ` +
            `${req.method} ${req.originalUrl} | ${duration}ms | ${requestInfo.ip}`
        );
    });

    next();
};

/**
 * Error request logger
 * Logs detailed information for failed requests
 */
const errorLogger = (err, req, res, next) => {
    const errorInfo = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl,
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
    };

    console.error('\x1b[31m❌ ERROR:\x1b[0m', JSON.stringify(errorInfo, null, 2));

    next(err);
};

/**
 * API Analytics Logger
 * Tracks API endpoint usage statistics
 */
const apiStats = {};

const analyticsLogger = (req, res, next) => {
    const endpoint = `${req.method} ${req.route?.path || req.path}`;

    if (!apiStats[endpoint]) {
        apiStats[endpoint] = {
            count: 0,
            totalDuration: 0,
            errors: 0
        };
    }

    const startTime = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - startTime;
        apiStats[endpoint].count++;
        apiStats[endpoint].totalDuration += duration;

        if (res.statusCode >= 400) {
            apiStats[endpoint].errors++;
        }
    });

    next();
};

/**
 * Get API statistics
 */
const getApiStats = () => {
    const stats = {};

    Object.keys(apiStats).forEach(endpoint => {
        const data = apiStats[endpoint];
        stats[endpoint] = {
            calls: data.count,
            avgDuration: data.count > 0 ? (data.totalDuration / data.count).toFixed(2) + 'ms' : '0ms',
            errors: data.errors,
            errorRate: data.count > 0 ? ((data.errors / data.count) * 100).toFixed(2) + '%' : '0%'
        };
    });

    return stats;
};

module.exports = {
    requestLogger,
    errorLogger,
    analyticsLogger,
    getApiStats
};
