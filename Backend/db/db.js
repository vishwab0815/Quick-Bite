const mongoose = require('mongoose');

const connectToDB = async (retries = 5, delay = 5000) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const conn = await mongoose.connect(process.env.MONGO_URI, {
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });

            console.log(`✅ MongoDB Connected Successfully: ${conn.connection.host}`);

            // Handle connection events
            mongoose.connection.on('error', (err) => {
                console.error('❌ MongoDB connection error:', err);
            });

            mongoose.connection.on('disconnected', () => {
                console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
            });

            mongoose.connection.on('reconnected', () => {
                console.log('✅ MongoDB reconnected successfully');
            });

            return conn;
        } catch (error) {
            console.error(`❌ MongoDB connection attempt ${attempt} failed:`, error.message);

            if (attempt === retries) {
                console.error('❌ Failed to connect to MongoDB after maximum retries. Exiting...');
                process.exit(1);
            }

            console.log(`⏳ Retrying in ${delay / 1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
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
