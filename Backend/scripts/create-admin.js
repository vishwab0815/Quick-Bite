/**
 * Create the owner (admin) login, or turn an existing login into an admin and reset its password.
 * Use it once on a new database; after that the owner manages every login from /pos/staff.
 * It only adds or updates one user - it never deletes anything.
 *
 * Usage: npm run create-admin   (uses MONGO_URI from Backend/.env or the environment)
 */

const path = require('path');
const readline = require('readline');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/userauthentication.model');
const { isValidEmail, isValidPassword } = require('../middleware/validation');

const PASSWORD_RULE = 'At least 8 characters with 1 uppercase, 1 lowercase and 1 number';

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

    console.log('👤 Create the owner (admin) login\n');
    const email = (await ask('Email: ')).toLowerCase();
    if (!isValidEmail(email)) throw new Error('That is not a valid email address');

    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    console.log(`Connected to database "${mongoose.connection.name}"\n`);

    const existing = await User.findOne({ email });
    if (existing) {
        const answer = await ask(`${email} already exists (role: ${existing.role}). Make it admin and set a new password? (y/N): `);
        if (answer.toLowerCase() !== 'y') {
            console.log('Nothing changed.');
            return;
        }
    }

    const name = existing ? existing.name : (await ask('Name (e.g. Owner): ')) || 'Owner';
    const password = await askHidden(`Password (${PASSWORD_RULE}): `);
    if (!isValidPassword(password)) throw new Error(`Password too weak - ${PASSWORD_RULE}`);
    if (await askHidden('Repeat password: ') !== password) throw new Error('Passwords do not match');

    const hashed = await bcrypt.hash(password, 12);
    if (existing) {
        existing.role = 'admin';
        existing.password = hashed;
        await existing.save();
    } else {
        await User.create({ name, email, password: hashed, role: 'admin' });
    }

    console.log(`\n✅ ${email} is now an admin. Sign in at /signin, then add cashier logins at /pos/staff.`);
})()
    .catch((error) => {
        console.error(`\n❌ ${error.message}`);
        process.exitCode = 1;
    })
    .finally(() => {
        rl.close();
        return mongoose.disconnect();
    });
