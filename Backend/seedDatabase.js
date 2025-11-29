/**
 * Database Seed Script
 * Clears all data and seeds fresh data including admin user and food items
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/userauthentication.model');
const Order = require('./models/order.model');
const Recipe = require('./models/fooditems.model');
const foodData = require('./food.json');

const seedDatabase = async () => {
    try {
        // Connect to MongoDB
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Step 1: Clear all existing data
        console.log('🗑️  Clearing existing data...');
        await User.deleteMany({});
        console.log('   ✓ Users cleared');
        await Order.deleteMany({});
        console.log('   ✓ Orders cleared');
        await Recipe.deleteMany({});
        console.log('   ✓ Food items cleared');
        console.log('✅ All data cleared\n');

        // Step 2: Create Admin User
        console.log('👨‍💼 Creating admin user...');
        const hashedPassword = await bcrypt.hash('Admin1234', 12);
        const adminUser = new User({
            name: 'Admin',
            email: 'admin@gmail.com',
            password: hashedPassword,
            role: 'admin'
        });
        await adminUser.save();
        console.log('✅ Admin user created');
        console.log('   📧 Email: admin@gmail.com');
        console.log('   🔑 Password: Admin1234');
        console.log('   👤 Role: admin\n');

        // Step 3: Seed Food Items
        console.log('🍕 Seeding food items...');
        const recipes = foodData.recipes || foodData;
        const foodItems = recipes.map(item => ({
            id: item.id,
            name: item.name,
            ingredients: item.ingredients || [],
            prepTimeMinutes: item.prepTimeMinutes || 20,
            cookTimeMinutes: item.cookTimeMinutes || 15,
            servings: item.servings || 2,
            difficulty: item.difficulty || 'Easy',
            cuisine: item.cuisine || 'Various',
            caloriesPerServing: item.caloriesPerServing || 300,
            tags: item.tags || [],
            userId: item.userId || 1,
            image: item.image,
            rating: item.rating || 4.5,
            reviewCount: item.reviewCount || 0,
            mealType: item.mealType || ['Lunch']
        }));

        await Recipe.insertMany(foodItems);
        console.log(`✅ ${foodItems.length} food items seeded\n`);

        // Summary
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎉 Database seeded successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n📊 Summary:');
        console.log(`   • Users: 1 (Admin)`);
        console.log(`   • Orders: 0`);
        console.log(`   • Food Items: ${foodItems.length}`);
        console.log('\n🔐 Admin Credentials:');
        console.log('   Email: admin@gmail.com');
        console.log('   Password: Admin1234');
        console.log('\n💡 Next Steps:');
        console.log('   1. Start backend: npm run dev');
        console.log('   2. Start frontend: npm run dev');
        console.log('   3. Login with admin credentials');
        console.log('   4. Access admin dashboard from profile menu');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Seed Error:', error);
        process.exit(1);
    }
};

// Run the seed script
seedDatabase();
