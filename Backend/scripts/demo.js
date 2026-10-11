/**
 * Demo mode - runs the backend on a temporary in-memory MongoDB with sample data.
 * No MongoDB install needed. Nothing is saved: everything resets when you stop it.
 * It can only ever write to its own in-memory database - never to a real one.
 *
 * Usage: npm run demo   (then start the frontend with VITE_API_URL=http://localhost:3000)
 * Logins: owner@quickbite.app / Platform1234 (console) · admin@gmail.com / Admin1234 · counter@quickbite.com / Counter1234
 */

const path = require('path');
const bcrypt = require('bcryptjs');
const { MongoMemoryServer } = require('mongodb-memory-server');

const BACKEND_DIR = path.join(__dirname, '..');

// Demo defaults - anything already set in the environment or Backend/.env wins (except the database)
const DEMO_ENV = {
    NODE_ENV: 'development',
    JWT_SECRET: 'demo-only-secret-do-not-use-in-production',
    HOTEL_NAME: 'Sri Ganesh Restaurant',
    HOTEL_ADDRESS: '12, MG Road, Bengaluru 560001',
    HOTEL_PHONE: '9876500000',
    UPI_VPA: 'demo-hotel@okaxis',
    UPI_PAYEE_NAME: 'Sri Ganesh Restaurant',
    HOTEL_HOURS: '6:30 AM – 10:30 PM',
};

// Sample South Indian counter menu
const SAMPLE_MENU = [
    ['Idli (2 pcs)', 40, 'Idli & Vada Counter', 'Breakfast'],
    ['Medu Vada (1 pc)', 35, 'Idli & Vada Counter', 'Breakfast'],
    ['Idli Vada', 70, 'Idli & Vada Counter', 'Breakfast'],
    ['Rava Idli', 55, 'Idli & Vada Counter', 'Breakfast'],
    ['Plain Dosa', 60, 'Dosa Counter', 'Dosa'],
    ['Masala Dosa', 80, 'Dosa Counter', 'Dosa'],
    ['Ghee Podi Dosa', 100, 'Dosa Counter', 'Dosa'],
    ['Set Dosa', 70, 'Dosa Counter', 'Dosa'],
    ['Rava Masala Dosa', 90, 'Dosa Counter', 'Dosa'],
    ['Onion Uttapam', 80, 'Dosa Counter', 'Dosa'],
    ['Mini Meals', 90, 'Meals Counter', 'Meals'],
    ['Full Meals', 140, 'Meals Counter', 'Meals'],
    ['Bisi Bele Bath', 70, 'Meals Counter', 'Rice'],
    ['Curd Rice', 60, 'Meals Counter', 'Rice'],
    ['Lemon Rice', 55, 'Meals Counter', 'Rice'],
    ['Kesari Bath', 45, 'Meals Counter', 'Sweets'],
    ['Filter Coffee', 30, 'Beverages', 'Beverages'],
    ['Tea', 25, 'Beverages', 'Beverages'],
    ['Badam Milk', 40, 'Beverages', 'Beverages'],
    ['Buttermilk', 25, 'Beverages', 'Beverages'],
];

const DAY_MS = 24 * 60 * 60 * 1000;

const loadSampleData = async () => {
    const Hotel = require('../models/hotel.model');
    const User = require('../models/userauthentication.model');
    const MenuItem = require('../models/menuItem.model');

    const [main, second] = await Hotel.create([
        {
            name: 'Sri Ganesh Restaurant',
            slug: 'sri-ganesh-restaurant',
            settings: { address: DEMO_ENV.HOTEL_ADDRESS, phone: DEMO_ENV.HOTEL_PHONE, hours: DEMO_ENV.HOTEL_HOURS, upiVpa: DEMO_ENV.UPI_VPA, upiPayeeName: 'Sri Ganesh Restaurant' },
            subscription: { plan: 'monthly', monthlyFee: 1499, paidUntil: new Date(Date.now() + 20 * DAY_MS) }
        },
        {
            name: 'Annapoorna Tiffin Room',
            slug: 'annapoorna-tiffin-room',
            settings: { address: 'Jayanagar, Bengaluru', hours: '7 AM – 9 PM', upiVpa: 'annapoorna@okicici' },
            subscription: { plan: 'trial', paidUntil: new Date(Date.now() + 5 * DAY_MS) }
        }
    ]);

    const hash = (password) => bcrypt.hash(password, 10);
    await User.create([
        { name: 'Platform Owner', email: 'owner@quickbite.app', password: await hash('Platform1234'), role: 'superadmin' },
        { name: 'Admin', email: 'admin@gmail.com', password: await hash('Admin1234'), role: 'admin', hotel: main._id },
        { name: 'Counter Staff', email: 'counter@quickbite.com', password: await hash('Counter1234'), role: 'staff', hotel: main._id },
        { name: 'Annapoorna Owner', email: 'annapoorna@quickbite.com', password: await hash('Annapoorna1234'), role: 'admin', hotel: second._id },
    ]);

    const menuFor = (hotel, items) => items.map(([name, price, counter, category], index) => ({
        hotel: hotel._id, name, nameKey: name.toLowerCase(), price, counter, category, sortOrder: index,
    }));
    await MenuItem.insertMany([
        ...menuFor(main, SAMPLE_MENU),
        ...menuFor(second, SAMPLE_MENU.slice(0, 8).map(([name, price, counter, category]) => [name, price - 5, counter, category])),
    ]);
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
    // Always the in-memory database, even if Backend/.env points at a real one
    process.env.MONGO_URI = mongo.getUri('quickbite-demo');

    require('../server');
    await require('../db/db').ready;
    await loadSampleData();

    console.log('⚠️  DEMO MODE: sample data lives in memory and is wiped when you stop the server.');
    console.log('   Console (platform owner): owner@quickbite.app / Platform1234  ->  /console');
    console.log('   Hotel logins: admin@gmail.com / Admin1234 · counter@quickbite.com / Counter1234\n');

    const stopMongo = () => mongo.stop().catch(() => {});
    process.on('SIGINT', stopMongo);
    process.on('SIGTERM', stopMongo);
})().catch((error) => {
    console.error('❌ Demo failed to start:', error.message);
    process.exit(1);
});
