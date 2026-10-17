/**
 * Create Udupi Sri Krishna Naivedya - the restaurant the website (/) belongs to - with its owner
 * login, exactly as the console's "New hotel" does. The website looks it up by its web address
 * "udupi-sri-krishna-naivedya", so once this has run the site shows its menu, address and hours.
 * It only adds one hotel and one login; it never changes or deletes anything else, and stops if
 * the hotel or the owner email already exists.
 *
 * Usage (from Backend/):
 *   npm run create-restaurant              uses MONGO_URI from Backend/.env or the environment
 *   Live database (settings in .env.render), in PowerShell:
 *     $env:ENV_FILE='.env.render'; npm run create-restaurant
 */

const path = require('path');
const readline = require('readline');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.join(__dirname, '..', process.env.ENV_FILE || '.env') });

const Hotel = require('../models/hotel.model');
const User = require('../models/userauthentication.model');
const { isValidEmail, isValidPassword } = require('../middleware/validation');

const RESTAURANT = {
    name: 'Udupi Sri Krishna Naivedya',
    slug: 'udupi-sri-krishna-naivedya',
    settings: {
        address: 'Yelahanka, Bengaluru',
        upiPayeeName: 'Udupi Sri Krishna Naivedya',
        billPrefix: 'USKN',
    },
};
const TRIAL_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RULE = 'At least 8 characters with 1 uppercase, 1 lowercase and 1 number';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

// While muted (password entry) nothing typed is echoed to the screen
let muted = false;
rl._writeToOutput = (text) => {
    if (!muted) rl.output.write(text);
    else if (text.includes('\n')) rl.output.write('\n');
};

const lines = [];
const waiting = [];
let inputEnded = false;
rl.on('line', (line) => (waiting.length ? waiting.shift()(line) : lines.push(line)));
rl.on('close', () => {
    inputEnded = true;
    while (waiting.length) waiting.shift()(null);
});

const readAnswer = async (question, hidden) => {
    muted = false;
    if (inputEnded) process.stdout.write(`${question}\n`);
    else {
        rl.setPrompt(question);
        rl.prompt();
    }
    muted = hidden;
    const line = lines.length ? lines.shift() : inputEnded ? null : await new Promise((resolve) => waiting.push(resolve));
    muted = false;
    if (line === null) throw new Error('Cancelled');
    return line;
};

const ask = async (question) => (await readAnswer(question, false)).trim();
const askHidden = (question) => readAnswer(question, true);

(async () => {
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not set. Add it to Backend/.env (or use ENV_FILE=.env.render).');

    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    console.log(`Connected to database "${mongoose.connection.name}"\n`);

    if (await Hotel.exists({ slug: RESTAURANT.slug })) {
        console.log(`✅ ${RESTAURANT.name} already exists (${RESTAURANT.slug}). Nothing changed.`);
        return;
    }

    if ((await ask(`Create "${RESTAURANT.name}" in this database? (y/N): `)).toLowerCase() !== 'y') {
        console.log('Nothing changed.');
        return;
    }

    console.log('\nThe owner login - used to sign in at /signin, add the menu and run the counter.');
    const ownerName = await ask('Owner name: ');
    if (ownerName.length < 2 || ownerName.length > 60) throw new Error('Owner name must be 2 to 60 characters');
    const email = (await ask('Owner email (login ID): ')).toLowerCase();
    if (!isValidEmail(email)) throw new Error('That is not a valid email address');
    if (await User.exists({ email })) throw new Error('An account with this email already exists - use another one');
    const password = await askHidden(`Password (${PASSWORD_RULE}): `);
    if (!isValidPassword(password)) throw new Error(`Password too weak - ${PASSWORD_RULE}`);
    if (await askHidden('Repeat password: ') !== password) throw new Error('Passwords do not match');

    const hotel = await Hotel.create({
        name: RESTAURANT.name,
        slug: RESTAURANT.slug,
        settings: RESTAURANT.settings,
        subscription: { plan: 'trial', monthlyFee: 0, paidUntil: new Date(Date.now() + TRIAL_DAYS * DAY_MS) },
    });
    try {
        await User.create({ name: ownerName, email, password: await bcrypt.hash(password, 12), role: 'admin', hotel: hotel._id });
    } catch (error) {
        // No half-created restaurant
        await Hotel.deleteOne({ _id: hotel._id }).catch(() => {});
        throw error;
    }

    console.log(`\n✅ ${RESTAURANT.name} created (${RESTAURANT.slug}).`);
    console.log(`   Sign in at /signin as ${email} → add the menu, phone and opening hours in Settings.`);
})()
    .catch((error) => {
        console.error(`\n❌ ${error.message}`);
        process.exitCode = 1;
    })
    .finally(() => {
        rl.close();
        return mongoose.disconnect();
    });
