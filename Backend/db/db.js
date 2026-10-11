const mongoose = require('mongoose');

const MAX_RETRY_DELAY = 60000;

// Last connection problem in plain words - shown on /health so it can be fixed without reading logs
let lastProblem = null;

const describeError = (error) => {
    const message = String(error?.message || '');
    if (!process.env.MONGO_URI) return 'MONGO_URI is not set';
    if (/bad auth|authentication failed/i.test(message)) {
        return 'Wrong database username or password in MONGO_URI';
    }
    if (/ENOTFOUND|querySrv|getaddrinfo/i.test(message)) {
        return 'Database host not found - check the cluster address in MONGO_URI';
    }
    if (/whitelist|Could not connect to any servers|Server selection timed out|ETIMEDOUT|ECONNREFUSED/i.test(message)) {
        return 'Cannot reach the database - allow 0.0.0.0/0 in MongoDB Atlas Network Access';
    }
    if (/Invalid scheme|Invalid connection string|must be a string/i.test(message)) {
        return 'MONGO_URI is not a valid connection string';
    }
    return 'Database connection failed - see server logs';
};

mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnected successfully');
});

// Resolves once the database is connected and startup upgrades have run
let markReady;
const ready = new Promise((resolve) => { markReady = resolve; });

const runMigrations = async () => {
    try {
        await require('../utils/migrations').runStartupMigrations();
    } catch (error) {
        console.error('❌ Startup upgrade failed:', error);
    } finally {
        markReady();
    }
};

// Keeps retrying (5s, 10s, 20s ... up to 60s) instead of exiting, so the server stays up
// and /health explains the problem. Exiting made Render restart it in a loop.
const connectToDB = async () => {
    let delay = 5000;
    for (let attempt = 1; ; attempt++) {
        try {
            const conn = await mongoose.connect(process.env.MONGO_URI, {
                serverSelectionTimeoutMS: 10000,
                socketTimeoutMS: 45000,
            });
            lastProblem = null;
            console.log(`✅ MongoDB Connected Successfully: ${conn.connection.host}`);
            await runMigrations();
            return conn;
        } catch (error) {
            lastProblem = describeError(error);
            console.error(`❌ MongoDB connection attempt ${attempt} failed: ${lastProblem} (${error.message})`);
            console.log(`⏳ Retrying in ${delay / 1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay = Math.min(delay * 2, MAX_RETRY_DELAY);
        }
    }
};

const getDbStatus = () => {
    const connected = mongoose.connection.readyState === 1;
    return { connected, problem: connected ? null : lastProblem };
};

// Graceful shutdown handler
const closeConnection = async () => {
    try {
        await mongoose.connection.close();
        console.log('✅ MongoDB connection closed gracefully');
    } catch (error) {
        console.error('❌ Error closing MongoDB connection:', error);
    }
};

process.on('SIGINT', async () => {
    await closeConnection();
    process.exit(0);
});

module.exports = connectToDB;
module.exports.getDbStatus = getDbStatus;
module.exports.ready = ready;
