/**
 * Create the QuickBite platform owner (superadmin) login - the only account that can open the
 * hidden console at /console and manage every hotel. Run again with the same email to reset its password.
 * This script is the ONLY way to create a platform owner: no API or screen can grant that role.
 * It only adds or updates one user - it never deletes anything.
 *
 * Usage: npm run create-platform-owner   (uses MONGO_URI from Backend/.env or the environment)
 * Hotels and their owner logins are created from the console.
 */

const path = require('path');
const readline = require('readline');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/userauthentication.model');
const { isValidEmail, isValidPassword } = require('../middleware/validation');

const PASSWORD_RULE = 'At least 12 characters with 1 uppercase, 1 lowercase and 1 number';
const MIN_LENGTH = 12;

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

// While muted (password entry) nothing typed is echoed to the screen
let muted = false;
rl._writeToOutput = (text) => {
    if (!muted) rl.output.write(text);
    else if (text.includes('\n')) rl.output.write('\n');
};

// Lines are queued, so answers typed (or piped in) early are never lost
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
    if (inputEnded) {
        process.stdout.write(`${question}\n`);
    } else {
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
    if (!process.env.MONGO_URI) {
        console.error('❌ MONGO_URI is not set. Add it to Backend/.env first.');
        process.exit(1);
    }

    console.log('👤 Create the QuickBite platform owner login (console access)\n');
    const email = (await ask('Email: ')).toLowerCase();
    if (!isValidEmail(email)) throw new Error('That is not a valid email address');

    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    console.log(`Connected to database "${mongoose.connection.name}"\n`);

    const existing = await User.findOne({ email });
    if (existing && existing.role !== 'superadmin') {
        throw new Error(`${email} is a ${existing.role} login. Use a different email for the platform owner.`);
    }
    if (existing) {
        const answer = await ask(`${email} is already the platform owner. Set a new password? (y/N): `);
        if (answer.toLowerCase() !== 'y') {
            console.log('Nothing changed.');
            return;
        }
    }

    const name = existing ? existing.name : (await ask('Name: ')) || 'Platform Owner';
    const password = await askHidden(`Password (${PASSWORD_RULE}): `);
    if (password.length < MIN_LENGTH || !isValidPassword(password)) throw new Error(`Password too weak - ${PASSWORD_RULE}`);
    if (await askHidden('Repeat password: ') !== password) throw new Error('Passwords do not match');

    const hashed = await bcrypt.hash(password, 12);
    if (existing) {
        existing.password = hashed;
        await existing.save();
    } else {
        await User.create({ name, email, password: hashed, role: 'superadmin' });
    }

    console.log(`\n✅ ${email} is the platform owner. Sign in at /signin to open the console.`);
})()
    .catch((error) => {
        console.error(`\n❌ ${error.message}`);
        process.exitCode = 1;
    })
    .finally(() => {
        rl.close();
        return mongoose.disconnect();
    });
