/**
 * Demo mode - runs the backend on a temporary in-memory MongoDB with dummy data.
 * No MongoDB install needed. Nothing is saved: everything resets when you stop it.
 * For trying the app locally only - never for production.
 *
 * Usage: npm run demo   (then start the frontend with VITE_API_URL=http://localhost:3000)
 */

const path = require('path');
const { execFileSync } = require('child_process');
const { MongoMemoryServer } = require('mongodb-memory-server');

const BACKEND_DIR = path.join(__dirname, '..');

// Demo defaults - anything already set in the environment or Backend/.env wins
const DEMO_ENV = {
    NODE_ENV: 'development',
    JWT_SECRET: 'demo-only-secret-do-not-use-in-production',
    HOTEL_NAME: 'Sri Ganesh Tiffin Hotel (Demo)',
    HOTEL_ADDRESS: '12, MG Road, Bengaluru 560001',
    HOTEL_PHONE: '9876500000',
    UPI_VPA: 'demo-hotel@okaxis',
    UPI_PAYEE_NAME: 'Sri Ganesh Tiffin Hotel',
};

(async () => {
    if (process.env.NODE_ENV === 'production') {
        console.error('❌ Demo mode uses throwaway data and is not for production.');
        process.exit(1);
    }

    require('dotenv').config({ path: path.join(BACKEND_DIR, '.env') });
    for (const [key, value] of Object.entries(DEMO_ENV)) {
        if (!process.env[key]) process.env[key] = value;
    }
    process.env.NODE_ENV = 'development';

    console.log('🧪 Starting in-memory MongoDB (first run downloads it once)...');
    const mongo = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongo.getUri('quickbite-demo');

    execFileSync(process.execPath, ['seedDatabase.js'], { cwd: BACKEND_DIR, env: process.env, stdio: 'inherit' });

    console.log('⚠️  DEMO MODE: data lives in memory and is wiped when you stop the server.\n');
    require('../server');

    const stopMongo = () => mongo.stop().catch(() => {});
    process.on('SIGINT', stopMongo);
    process.on('SIGTERM', stopMongo);
})().catch((error) => {
    console.error('❌ Demo failed to start:', error.message);
    process.exit(1);
});
