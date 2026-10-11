/**
 * Counter billing (POS) API tests
 * Runs the real app against an in-memory MongoDB: npm test
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { execFileSync } = require('child_process');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongo;
let app;
let User;
let MenuItem;

const PASSWORD = 'Test1234';

const login = async (email, password = PASSWORD) => {
    const agent = request.agent(app);
    const res = await agent.post('/api/auth/login').send({ email, password });
    assert.equal(res.status, 200, `login failed for ${email}: ${res.body.message}`);
    return agent;
};

before(async () => {
    mongo = await MongoMemoryServer.create();
    Object.assign(process.env, {
        MONGO_URI: mongo.getUri('quickbite-test'),
        JWT_SECRET: 'test-secret',
        NODE_ENV: 'test',
        HOTEL_NAME: 'Test Hotel',
        UPI_VPA: 'test@okaxis',
        FRONTEND_URL: 'http://localhost:5173',
        GST_SCHEME: 'regular',
        GST_RATE: '5',
        PRICES_INCLUDE_GST: 'false',
        WHATSAPP_TOKEN: '',
    });

    app = require('../app');
    User = require('../models/userauthentication.model');
    MenuItem = require('../models/menuItem.model');
    await mongoose.connection.asPromise();

    const password = await bcrypt.hash(PASSWORD, 4);
    await User.create([
        { name: 'Owner', email: 'owner@test.com', password, role: 'admin' },
        { name: 'Cashier', email: 'cashier@test.com', password, role: 'staff' },
        { name: 'Customer', email: 'customer@test.com', password, role: 'user' },
    ]);
    await MenuItem.create([
        { name: 'Masala Dosa', price: 249, counter: 'Dosa Counter', category: 'Dosa' },
        { name: 'Filter Coffee', price: 99, counter: 'Beverages', category: 'Beverages' },
    ]);
});

after(async () => {
    await mongoose.disconnect();
    await mongo.stop();
});

describe('counter billing', () => {
    let cashier;
    let admin;
    let dosa;
    let coffee;
    let bill1;
    let bill2;

    before(async () => {
        cashier = await login('cashier@test.com');
        admin = await login('owner@test.com');
        const menu = (await cashier.get('/pos/menu')).body.items;
        dosa = menu.find((item) => item.name === 'Masala Dosa');
        coffee = menu.find((item) => item.name === 'Filter Coffee');
    });

    it('requires a staff login', async () => {
        assert.equal((await request(app).get('/pos/menu')).status, 401);
        const customer = await login('customer@test.com');
        assert.equal((await customer.get('/pos/menu')).status, 403);
    });

    it('creates a cash bill with server-side prices, GST, round off and change', async () => {
        const res = await cashier.post('/pos/bills').send({
            items: [{ itemId: dosa._id, quantity: 2, price: 1 }, { itemId: coffee._id, quantity: 3 }],
            payment: { mode: 'cash', cashReceived: 1000 },
        });
        assert.equal(res.status, 201, res.body.message);
        bill1 = res.body.bill;
        assert.equal(bill1.tokenNumber, 1);
        assert.match(bill1.billNumber, /^QB\/\d{4}-\d{2}\/000001$/);
        assert.equal(bill1.subtotal, 795);
        assert.equal(bill1.cgst, 19.88);
        assert.equal(bill1.sgst, 19.88);
        assert.equal(bill1.roundOff, 0.24);
        assert.equal(bill1.total, 835);
        assert.equal(bill1.payment.changeReturned, 165);
        assert.equal(bill1.stations.length, 2);
    });

    it('rejects short cash, missing phone for WhatsApp and bad phone numbers', async () => {
        const base = { items: [{ itemId: dosa._id, quantity: 1 }] };
        assert.equal((await cashier.post('/pos/bills').send({ ...base, payment: { mode: 'cash', cashReceived: 10 } })).status, 400);
        assert.equal((await cashier.post('/pos/bills').send({ ...base, payment: { mode: 'upi' }, sendWhatsapp: true })).status, 400);
        assert.equal((await cashier.post('/pos/bills').send({ ...base, payment: { mode: 'upi' }, customer: { phone: '12345' } })).status, 400);
    });

    it('returns a WhatsApp click-to-chat link when the Cloud API is not configured', async () => {
        const res = await cashier.post('/pos/bills').send({
            items: [{ itemId: dosa._id, quantity: 1 }],
            payment: { mode: 'upi', reference: 'UTR123' },
            customer: { name: 'Ravi', phone: '98765 43210' },
            sendWhatsapp: true,
        });
        assert.equal(res.status, 201);
        bill2 = res.body.bill;
        assert.equal(bill2.tokenNumber, 2);
        assert.equal(res.body.whatsapp.status, 'link');
        assert.ok(res.body.whatsapp.link.startsWith('https://wa.me/919876543210?text='));
        assert.ok(decodeURIComponent(res.body.whatsapp.link).includes(`/receipt/${bill2.publicId}`));
    });

    it('remembers customers so the counter can find them by the first digits', async () => {
        // The visit is recorded in the background - give it a moment
        let customers = [];
        for (let attempt = 0; attempt < 20 && customers.length === 0; attempt++) {
            customers = (await cashier.get('/pos/customers').query({ phone: '98765' })).body.customers;
            if (customers.length === 0) await new Promise((resolve) => setTimeout(resolve, 50));
        }
        assert.equal(customers.length, 1);
        assert.equal(customers[0].phone, '9876543210');
        assert.equal(customers[0].name, 'Ravi');
        assert.equal(customers[0].visits, 1);
        assert.deepEqual(customers[0].lastItems.map((item) => item.name), ['Masala Dosa']);

        assert.deepEqual((await cashier.get('/pos/customers').query({ phone: '98' })).body.customers, []);
        assert.deepEqual((await cashier.get('/pos/customers').query({ phone: '70000' })).body.customers, []);
    });

    it('shows each counter only its own items and tracks ready / served', async () => {
        const kitchen = await cashier.get('/pos/kitchen').query({ counter: 'Beverages' });
        assert.equal(kitchen.body.tickets.length, 1);
        assert.deepEqual(kitchen.body.tickets[0].items.map((item) => item.name), ['Filter Coffee']);

        const ready = await cashier.patch(`/pos/bills/${bill1._id}/stations`).send({ counter: 'Dosa Counter', status: 'ready' });
        assert.equal(ready.body.bill.status, 'preparing');

        const display = await request(app).get('/pos/display');
        assert.ok(display.body.ready.some((entry) => entry.tokenNumber === 1 && entry.counters.includes('Dosa Counter')));
        assert.ok(!JSON.stringify(display.body).includes('total'), 'display must not expose amounts');
    });

    it('serves a token once per counter (scan by token number or receipt QR)', async () => {
        assert.equal((await cashier.post('/pos/serve').send({ code: '1', counter: 'Dosa Counter' })).status, 200);
        const again = await cashier.post('/pos/serve').send({ code: '1', counter: 'Dosa Counter' });
        assert.equal(again.status, 409);
        assert.equal(again.body.alreadyServed, true);

        const byQr = await cashier.post('/pos/serve').send({ code: `http://localhost:5173/receipt/${bill1.publicId}`, counter: 'Beverages' });
        assert.equal(byQr.status, 200);
        assert.equal(byQr.body.bill.status, 'served');
    });

    it('public receipt hides the phone number', async () => {
        const res = await request(app).get(`/pos/receipt/${bill2.publicId}`);
        assert.equal(res.status, 200);
        assert.equal(res.body.bill.customer.phone, undefined);
        assert.equal(res.body.settings.name, 'Test Hotel');
    });

    it('only an admin can cancel, with a reason, and reports exclude cancelled bills', async () => {
        assert.equal((await cashier.patch(`/pos/bills/${bill2._id}/cancel`).send({ reason: 'x' })).status, 403);
        assert.equal((await admin.patch(`/pos/bills/${bill2._id}/cancel`).send({})).status, 400);
        assert.equal((await admin.patch(`/pos/bills/${bill2._id}/cancel`).send({ reason: 'Customer left' })).status, 200);

        const { summary } = (await cashier.get('/pos/reports/summary')).body;
        assert.equal(summary.billCount, 1);
        assert.equal(summary.cancelledCount, 1);
        assert.equal(summary.total, 835);
        assert.equal(summary.byMode.cash.total, 835);
    });

    it('rejects sold-out items', async () => {
        assert.equal((await cashier.patch(`/pos/menu/${coffee._id}/availability`).send({ isAvailable: false })).status, 200);
        const res = await cashier.post('/pos/bills').send({ items: [{ itemId: coffee._id, quantity: 1 }], payment: { mode: 'upi' } });
        assert.equal(res.status, 400);
        assert.match(res.body.message, /sold out/);
        await cashier.patch(`/pos/menu/${coffee._id}/availability`).send({ isAvailable: true });
    });
});

describe('menu management', () => {
    let admin;
    let cashier;

    before(async () => {
        admin = await login('owner@test.com');
        cashier = await login('cashier@test.com');
    });

    it('lets only admins change the menu', async () => {
        const res = await cashier.post('/pos/menu').send({ name: 'Rava Idli', price: 55, counter: 'Idli Counter' });
        assert.equal(res.status, 403);
    });

    it('adds, edits and removes items, keeping names unique', async () => {
        const created = await admin.post('/pos/menu').send({ name: 'Rava Idli', price: 55, counter: 'Idli Counter', isVeg: true });
        assert.equal(created.status, 201, created.body.message);
        const id = created.body.item._id;

        assert.equal((await admin.post('/pos/menu').send({ name: 'rava idli', price: 60, counter: 'Idli Counter' })).status, 409);
        assert.equal((await admin.post('/pos/menu').send({ name: 'X', price: 0, counter: '' })).status, 400);

        const updated = await admin.put(`/pos/menu/${id}`).send({ price: 60, category: 'Breakfast' });
        assert.equal(updated.status, 200);
        assert.equal(updated.body.item.price, 60);
        assert.equal(updated.body.item.name, 'Rava Idli');

        assert.equal((await admin.delete(`/pos/menu/${id}`)).status, 200);
        assert.equal((await admin.delete(`/pos/menu/${id}`)).status, 404);
    });

    it('imports a menu: adds new names, updates existing ones, all-or-nothing on errors', async () => {
        const bad = await admin.post('/pos/menu/import').send({
            items: [{ name: 'Tea', price: 25, counter: 'Beverages' }, { name: 'Bad', price: -1, counter: 'Beverages' }],
        });
        assert.equal(bad.status, 400);
        assert.equal(bad.body.errors[0].row, 2);
        assert.equal(await MenuItem.countDocuments({ name: 'Tea' }), 0);

        const ok = await admin.post('/pos/menu/import').send({
            items: [
                { name: 'Tea', price: 25, counter: 'Beverages' },
                { name: 'MASALA DOSA', price: 90, counter: 'Dosa Counter', isAvailable: true, isVeg: true, category: 'Dosa', sortOrder: 1 },
            ],
        });
        assert.equal(ok.status, 200, ok.body.message);
        assert.equal(ok.body.created, 1);
        assert.equal(ok.body.updated, 1);
        assert.equal((await MenuItem.findOne({ nameKey: 'masala dosa' })).price, 90);
        assert.equal((await MenuItem.findOne({ nameKey: 'tea' })).isAvailable, true);
    });
});

describe('staff management', () => {
    let admin;

    before(async () => {
        admin = await login('owner@test.com');
    });

    it('adds a staff login that can bill, resets its password, and removal ends the session at once', async () => {
        const cashierAgent = await login('cashier@test.com');
        assert.equal((await cashierAgent.get('/pos/staff')).status, 403);

        assert.equal((await admin.post('/pos/staff').send({ name: 'Ramu', email: 'ramu@test.com', password: 'weak' })).status, 400);
        const created = await admin.post('/pos/staff').send({ name: 'Ramu', email: 'Ramu@Test.com', password: 'Ramu12345' });
        assert.equal(created.status, 201, created.body.message);
        assert.equal(created.body.staff.role, 'staff');
        assert.equal((await admin.post('/pos/staff').send({ name: 'Ramu', email: 'ramu@test.com', password: 'Ramu12345' })).status, 409);

        const ramu = await login('ramu@test.com', 'Ramu12345');
        assert.equal((await ramu.get('/pos/menu')).status, 200);

        const id = created.body.staff._id;
        assert.equal((await admin.patch(`/pos/staff/${id}/password`).send({ password: 'NewPass123' })).status, 200);
        await login('ramu@test.com', 'NewPass123');

        assert.equal((await admin.delete(`/pos/staff/${id}`)).status, 200);
        assert.equal((await ramu.get('/pos/menu')).status, 401);
    });

    it('cannot remove an admin account', async () => {
        const owner = await User.findOne({ email: 'owner@test.com' });
        assert.equal((await admin.delete(`/pos/staff/${owner._id}`)).status, 404);
    });
});

describe('security', () => {
    it('login sessions last 24 hours (cookie and token expire together)', async () => {
        const res = await request(app).post('/api/auth/login').send({ email: 'cashier@test.com', password: PASSWORD });
        assert.equal(res.status, 200);
        const cookie = res.headers['set-cookie'].find((value) => value.startsWith('token='));
        const maxAge = Number(cookie.match(/Max-Age=(\d+)/)[1]);
        assert.ok(maxAge > 86390 && maxAge <= 86400, `cookie Max-Age was ${maxAge}`);

        const token = cookie.split(';')[0].slice('token='.length);
        const { iat, exp } = require('jsonwebtoken').decode(token);
        assert.equal(exp - iat, 24 * 60 * 60);
    });

    it('failed profile checks do not count towards the login rate limit', async () => {
        for (let i = 0; i < 8; i++) {
            assert.equal((await request(app).get('/api/auth/profile')).status, 401);
        }
        await login('cashier@test.com');
    });

    it('seeding refuses to run in production without --force', () => {
        let error;
        try {
            execFileSync(process.execPath, ['seedDatabase.js'], {
                cwd: path.join(__dirname, '..'),
                env: { ...process.env, NODE_ENV: 'production' },
                stdio: 'pipe',
            });
        } catch (err) {
            error = err;
        }
        assert.ok(error, 'seed should exit with an error');
        assert.match(String(error.stderr), /Refusing to seed/);
    });
});
