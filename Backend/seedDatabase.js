/**
 * Database Seed Script
 * Clears all data and seeds fresh data: admin + counter staff logins,
 * website food items and the sample counter menu
 *
 * ⚠️  Wipes ALL data (users, orders, bills). Refuses to run with
 *    NODE_ENV=production unless started with --force.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/userauthentication.model');
const Order = require('./models/order.model');
const Recipe = require('./models/fooditems.model');
const MenuItem = require('./models/menuItem.model');
const Bill = require('./models/bill.model');
const Sequence = require('./models/sequence.model');
const foodData = require('./food.json');
const menuData = require('./menu.json');

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Login details for seeded accounts. Development falls back to the documented
 * demo passwords; production must set them in the environment.
 */
const getSeedAccount = (role, defaults) => {
    const prefix = `SEED_${role.toUpperCase()}`;
    const password = process.env[`${prefix}_PASSWORD`];

    if (!password && isProduction) {
        throw new Error(`${prefix}_PASSWORD must be set when seeding in production`);
    }

    return {
        email: (process.env[`${prefix}_EMAIL`] || defaults.email).toLowerCase(),
        password: password || defaults.password,
        passwordSource: password ? `from ${prefix}_PASSWORD` : defaults.password,
    };
};

const seedDatabase = async () => {
    try {
        if (isProduction && !process.argv.includes('--force')) {
            console.error('❌ Refusing to seed: NODE_ENV=production and seeding deletes ALL data.');
            console.error('   If you really mean it, run: node seedDatabase.js --force');
            process.exit(1);
        }

        const admin = getSeedAccount('admin', { email: 'admin@gmail.com', password: 'Admin1234' });
        const staff = getSeedAccount('staff', { email: 'counter@quickbite.com', password: 'Counter1234' });

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
        await MenuItem.deleteMany({});
        await Bill.deleteMany({});
        await Sequence.deleteMany({});
        console.log('   ✓ Counter menu, bills & token numbers cleared');
        console.log('✅ All data cleared\n');

        // Step 2: Create Admin User
        console.log('👨‍💼 Creating admin user...');
        await User.create({
            name: 'Admin',
            email: admin.email,
            password: await bcrypt.hash(admin.password, 12),
            role: 'admin'
        });
        console.log('✅ Admin user created');
        console.log(`   📧 Email: ${admin.email}`);
        console.log(`   🔑 Password: ${admin.passwordSource}`);
        console.log('   👤 Role: admin\n');

        // Step 2b: Create Counter Staff User (billing counter & kitchen screens)
        console.log('🧑‍🍳 Creating counter staff user...');
        await User.create({
            name: 'Counter Staff',
            email: staff.email,
            password: await bcrypt.hash(staff.password, 12),
            role: 'staff'
        });
        console.log('✅ Counter staff user created');
        console.log(`   📧 Email: ${staff.email}`);
        console.log(`   🔑 Password: ${staff.passwordSource}`);
        console.log('   👤 Role: staff\n');

        // Step 3: Seed Food Items (customer website)
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
            price: item.price || 0,
            rating: item.rating || 4.5,
            reviewCount: item.reviewCount || 0,
            mealType: item.mealType || ['Lunch']
        }));

        await Recipe.insertMany(foodItems);
        console.log(`✅ ${foodItems.length} food items seeded\n`);

        // Step 4: Seed the sample counter menu (billing counter)
        console.log('🧾 Seeding sample counter menu...');
        const menuItems = menuData.items.map((item, index) => ({
            ...item,
            nameKey: item.name.trim().toLowerCase(),
            sortOrder: index
        }));
        await MenuItem.insertMany(menuItems);
        console.log(`✅ ${menuItems.length} counter menu items seeded (sample - replace from /pos/menu)\n`);

        // Summary
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎉 Database seeded successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n📊 Summary:');
        console.log(`   • Users: 2 (Admin, Counter Staff)`);
        console.log(`   • Orders: 0`);
        console.log(`   • Food Items: ${foodItems.length}`);
        console.log(`   • Counter Menu Items: ${menuItems.length}`);
        console.log('\n💡 Next Steps:');
        console.log('   1. Start backend: npm run dev');
        console.log('   2. Start frontend: npm run dev');
        console.log('   3. Login with admin credentials');
        console.log('   4. Access admin dashboard from profile menu');
        console.log('   5. Counter billing: login as counter staff, open /pos');
        console.log('   6. Change the default passwords from /pos/staff');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Seed Error:', error.message || error);
        process.exit(1);
    }
};

// Run the seed script
seedDatabase();
