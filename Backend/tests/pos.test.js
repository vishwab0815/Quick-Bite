/**
 * Counter billing (POS) API tests
 * Runs the real app against an in-memory MongoDB: npm test
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongo;
let app;
let User;
let MenuItem;
let Hotel;
let Bill;
let hotel;
let otherHotel;

const DAY_MS = 24 * 60 * 60 * 1000;

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
        FRONTEND_URL: 'http://localhost:5173',
        WHATSAPP_TOKEN: '',
    });

    app = require('../app');
    User = require('../models/userauthentication.model');
    MenuItem = require('../models/menuItem.model');
    Hotel = require('../models/hotel.model');
    Bill = require('../models/bill.model');
    await require('../db/db').ready;

    const paidUntil = new Date(Date.now() + 30 * DAY_MS);
    hotel = await Hotel.create({
        name: 'Test Hotel',
        slug: 'test-hotel',
        settings: { upiVpa: 'test@okaxis', gstScheme: 'regular', gstRate: 5, pricesIncludeGst: false },
        subscription: { plan: 'monthly', monthlyFee: 1000, paidUntil },
    });
    otherHotel = await Hotel.create({ name: 'Other Hotel', slug: 'other-hotel', subscription: { plan: 'trial', paidUntil } });

    const password = await bcrypt.hash(PASSWORD, 4);
    await User.create([
        { name: 'Owner', email: 'owner@test.com', password, role: 'admin', hotel: hotel._id },
        { name: 'Cashier', email: 'cashier@test.com', password, role: 'staff', hotel: hotel._id },
        { name: 'Customer', email: 'customer@test.com', password, role: 'user' },
        { name: 'Other Owner', email: 'other-owner@test.com', password, role: 'admin', hotel: otherHotel._id },
        { name: 'Other Cashier', email: 'other-cashier@test.com', password, role: 'staff', hotel: otherHotel._id },
        { name: 'Boss', email: 'boss@quickbite.app', password, role: 'superadmin' },
    ]);
    await MenuItem.create([
        { hotel: hotel._id, name: 'Masala Dosa', price: 249, counter: 'Dosa Counter', category: 'Dosa' },
        { hotel: hotel._id, name: 'Filter Coffee', price: 99, counter: 'Beverages', category: 'Beverages' },
        { hotel: otherHotel._id, name: 'Idli', price: 40, counter: 'Main Kitchen', category: 'Breakfast' },
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

    it('requires a staff login (old website customer accounts cannot sign in)', async () => {
        assert.equal((await request(app).get('/pos/menu')).status, 401);
        const customer = await request(app).post('/api/auth/login').send({ email: 'customer@test.com', password: PASSWORD });
        assert.equal(customer.status, 403);
        assert.equal((await request(app).post('/api/auth/register').send({ name: 'X', email: 'x@y.com', password: 'Abcd12345' })).status, 404);
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

        const display = await request(app).get('/pos/public/test-hotel/display');
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
        assert.deepEqual(summary.counterSpeed.map((entry) => entry.counter).sort(), ['Beverages', 'Dosa Counter']);
        assert.ok(summary.counterSpeed.every((entry) => entry.tokens === 1 && entry.avgMinutes >= 0));
    });

    it('serves the whole dashboard in one gzip-compressed request, revalidated with 304s', async () => {
        const res = await cashier.get('/pos/reports/dashboard').set('Accept-Encoding', 'gzip');
        assert.equal(res.status, 200);
        assert.equal(res.headers['content-encoding'], 'gzip');
        assert.equal(res.headers['cache-control'], 'private, no-cache');
        assert.equal(res.body.bills.length, 2);
        assert.equal(res.body.summary.total, 835);
        assert.equal(res.body.compare.billCount, 0);
        assert.equal(res.body.compare.date, require('../utils/billing').shiftBusinessDate(res.body.date, -7));

        const again = await cashier.get('/pos/reports/dashboard').set('If-None-Match', res.headers.etag);
        assert.equal(again.status, 304);
    });

    it('public landing info shows the restaurant and available dishes only, no private data', async () => {
        await cashier.patch(`/pos/menu/${coffee._id}/availability`).send({ isAvailable: false });
        const res = await request(app).get('/pos/public/info');
        assert.equal(res.status, 200);
        assert.equal(res.headers['cache-control'], 'public, max-age=60');
        assert.equal(res.body.restaurant.name, 'Test Hotel');
        assert.deepEqual(res.body.menu.map((item) => item.name), ['Masala Dosa']);
        assert.deepEqual(Object.keys(res.body.menu[0]).sort(), ['category', 'isVeg', 'name', 'price']);
        const body = JSON.stringify(res.body);
        assert.ok(!body.includes('okaxis') && !body.includes('gstin'), 'no UPI ID or GSTIN on the public page');
        await cashier.patch(`/pos/menu/${coffee._id}/availability`).send({ isAvailable: true });
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
        assert.equal((await MenuItem.findOne({ hotel: hotel._id, nameKey: 'masala dosa' })).price, 90);
        assert.equal((await MenuItem.findOne({ hotel: hotel._id, nameKey: 'tea' })).isAvailable, true);
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
});

describe('hotel isolation', () => {
    let other;
    let otherCashier;
    let testBill;

    before(async () => {
        other = await login('other-owner@test.com');
        otherCashier = await login('other-cashier@test.com');
        testBill = await Bill.findOne({ hotel: hotel._id }).lean();
    });

    it("never shows or changes another hotel's bills, menu, staff or customers", async () => {
        assert.equal((await other.get(`/pos/bills/${testBill._id}`)).status, 404);
        assert.equal((await other.patch(`/pos/bills/${testBill._id}/cancel`).send({ reason: 'hack' })).status, 404);
        assert.equal((await otherCashier.patch(`/pos/bills/${testBill._id}/stations`).send({ status: 'served' })).status, 404);
        assert.equal((await otherCashier.post('/pos/serve').send({ code: `/receipt/${testBill.publicId}` })).status, 404);
        assert.deepEqual((await other.get('/pos/bills').query({ date: testBill.businessDate })).body.bills, []);
        assert.deepEqual((await other.get('/pos/menu')).body.items.map((item) => item.name), ['Idli']);
        assert.deepEqual((await other.get('/pos/staff')).body.staff.map((user) => user.email).sort(), ['other-cashier@test.com', 'other-owner@test.com']);
        assert.deepEqual((await otherCashier.get('/pos/customers').query({ phone: '98765' })).body.customers, []);
        assert.equal((await other.get('/pos/reports/dashboard')).body.summary.total, 0);

        const testDosa = await MenuItem.findOne({ hotel: hotel._id, nameKey: 'masala dosa' }).lean();
        const billWithForeignItem = await otherCashier.post('/pos/bills').send({ items: [{ itemId: testDosa._id, quantity: 1 }], payment: { mode: 'cash' } });
        assert.equal(billWithForeignItem.status, 400);
        assert.equal((await other.put(`/pos/menu/${testDosa._id}`).send({ price: 1 })).status, 404);
    });

    it('keeps names, token numbers and bill numbers separate per hotel', async () => {
        const dosa = await other.post('/pos/menu').send({ name: 'Masala Dosa', price: 70, counter: 'Dosa Counter' });
        assert.equal(dosa.status, 201, dosa.body.message);

        const bill = await otherCashier.post('/pos/bills').send({ items: [{ itemId: dosa.body.item._id, quantity: 1 }], payment: { mode: 'upi' } });
        assert.equal(bill.status, 201, bill.body.message);
        assert.equal(bill.body.bill.tokenNumber, 1);
        assert.match(bill.body.bill.billNumber, /\/000001$/);

        const board = await request(app).get('/pos/public/other-hotel/display');
        assert.equal(board.body.hotelName, 'Other Hotel');
        assert.deepEqual(board.body.preparing, [1]);
        assert.equal((await request(app).get('/pos/public/no-such-hotel/display')).status, 404);
    });
});

describe('platform console', () => {
    let boss;

    before(async () => {
        boss = await login('boss@quickbite.app');
    });

    it('is invisible (404) to everyone except the platform owner', async () => {
        assert.equal((await request(app).get('/platform/overview')).status, 404);
        assert.equal((await request(app).get('/platform/overview').set('Cookie', 'token=forged.jwt.value')).status, 404);
        assert.equal((await (await login('owner@test.com')).get('/platform/hotels')).status, 404);
        assert.equal((await (await login('cashier@test.com')).get('/platform/overview')).status, 404);

        const res = await boss.get('/platform/overview');
        assert.equal(res.status, 200);
        assert.equal(res.headers['cache-control'], 'no-store');
    });

    it('signs the platform owner in for 8 hours and keeps them off the counter', async () => {
        const res = await request(app).post('/api/auth/login').send({ email: 'boss@quickbite.app', password: PASSWORD });
        const cookie = res.headers['set-cookie'].find((value) => value.startsWith('token='));
        const maxAge = Number(cookie.match(/Max-Age=(\d+)/)[1]);
        assert.ok(maxAge > 8 * 3600 - 10 && maxAge <= 8 * 3600, `cookie Max-Age was ${maxAge}`);
        assert.equal((await boss.get('/pos/menu')).status, 403);
    });

    it("shows every hotel's orders, income, best sellers and menu", async () => {
        const list = await boss.get('/platform/hotels');
        const testHotel = list.body.hotels.find((entry) => entry.slug === 'test-hotel');
        assert.equal(testHotel.stats.ordersAll, 1);
        assert.equal(testHotel.stats.salesAll, 835);
        assert.equal(testHotel.subscription.state, 'active');

        const detail = await boss.get(`/platform/hotels/${hotel._id}`);
        assert.equal(detail.status, 200);
        assert.equal(detail.body.daily.length, 30);
        assert.equal(detail.body.today.billCount, 1);
        assert.equal(detail.body.today.cancelledCount, 1);
        assert.ok(detail.body.topItems.some((item) => item.name === 'Masala Dosa'));
        assert.equal(detail.body.paymentMix.find((entry) => entry.mode === 'cash').sales, 835);
        assert.deepEqual(detail.body.owners.map((owner) => owner.email), ['owner@test.com']);

        const menu = await boss.get(`/platform/hotels/${hotel._id}/menu`);
        assert.ok(menu.body.items.length >= 2);
        const bills = await boss.get(`/platform/hotels/${hotel._id}/bills`);
        assert.equal(bills.body.bills.length, 2);
        assert.equal(bills.body.summary.total, 835);
        assert.equal((await boss.get('/platform/hotels/123')).status, 404);

        const overview = await boss.get('/platform/overview');
        assert.ok(overview.body.orders.ordersToday >= 2);
        assert.equal(overview.body.revenue.mrr, 1000);
        assert.equal(overview.body.daily.length, 30);
    });

    it('adds a hotel with its owner login, who can start billing straight away', async () => {
        const body = { name: 'New Cafe', owner: { name: 'Lakshmi', email: 'lakshmi@newcafe.in', password: 'Lakshmi1234' }, trialDays: 7 };
        assert.equal((await boss.post('/platform/hotels').send({ ...body, owner: { ...body.owner, password: 'weak' } })).status, 400);

        const created = await boss.post('/platform/hotels').send(body);
        assert.equal(created.status, 201, created.body.message);
        assert.equal(created.body.hotel.slug, 'new-cafe');
        assert.equal(created.body.hotel.subscription.plan, 'trial');

        assert.equal((await boss.post('/platform/hotels').send({ ...body, owner: { ...body.owner, email: 'x@newcafe.in' } })).status, 409);
        assert.equal(await Hotel.countDocuments({ slug: 'new-cafe' }), 1);

        const owner = await login('lakshmi@newcafe.in', 'Lakshmi1234');
        assert.deepEqual((await owner.get('/pos/menu')).body.items, []);
        assert.equal((await owner.get('/pos/settings')).body.settings.name, 'New Cafe');
    });

    it('disabling a hotel locks it out at once; enabling restores it', async () => {
        const cashier = await login('other-cashier@test.com');
        assert.equal((await boss.patch(`/platform/hotels/${otherHotel._id}/status`).send({ status: 'disabled' })).status, 400);
        const disabled = await boss.patch(`/platform/hotels/${otherHotel._id}/status`).send({ status: 'disabled', reason: 'Unpaid since March' });
        assert.equal(disabled.status, 200);
        assert.equal(disabled.body.hotel.subscription.state, 'disabled');

        const blocked = await cashier.get('/pos/menu');
        assert.equal(blocked.status, 403);
        assert.equal(blocked.body.code, 'HOTEL_DISABLED');
        const signin = await request(app).post('/api/auth/login').send({ email: 'other-owner@test.com', password: PASSWORD });
        assert.equal(signin.status, 403);
        assert.equal(signin.body.code, 'HOTEL_DISABLED');

        assert.equal((await boss.patch(`/platform/hotels/${otherHotel._id}/status`).send({ status: 'active' })).status, 200);
        assert.equal((await cashier.get('/pos/menu')).status, 200);
    });

    it('an expired subscription stops billing until a payment is recorded', async () => {
        const cashier = await login('other-cashier@test.com');
        const lapsed = new Date(Date.now() - 10 * DAY_MS).toISOString();
        assert.equal((await boss.patch(`/platform/hotels/${otherHotel._id}`).send({ subscription: { paidUntil: lapsed } })).status, 200);

        const blocked = await cashier.get('/pos/menu');
        assert.equal(blocked.status, 403);
        assert.equal(blocked.body.code, 'SUBSCRIPTION_EXPIRED');
        assert.equal((await boss.get('/platform/hotels')).body.hotels.find((entry) => entry.slug === 'other-hotel').subscription.state, 'expired');

        assert.equal((await boss.post(`/platform/hotels/${otherHotel._id}/payments`).send({ amount: 0, months: 1 })).status, 400);
        const paid = await boss.post(`/platform/hotels/${otherHotel._id}/payments`).send({ amount: 1499, months: 1, method: 'upi', reference: 'UTR998877' });
        assert.equal(paid.status, 201, paid.body.message);
        const paidUntil = new Date(paid.body.hotel.subscription.paidUntil).getTime();
        assert.ok(paidUntil > Date.now() + 27 * DAY_MS && paidUntil < Date.now() + 32 * DAY_MS);
        assert.equal(paid.body.hotel.subscription.plan, 'monthly');

        assert.equal((await cashier.get('/pos/menu')).status, 200);
        const payments = (await boss.get('/platform/payments')).body.payments;
        assert.equal(payments[0].hotelName, 'Other Hotel');
        assert.equal(payments[0].amount, 1499);
        assert.ok((await boss.get('/platform/overview')).body.revenue.collectedThisMonth >= 1499);
    });

    it("edits a hotel's details and resets its owner's password", async () => {
        const bad = await boss.patch(`/platform/hotels/${otherHotel._id}`).send({ settings: { upiVpa: 'not a upi id' } });
        assert.equal(bad.status, 400);
        const edited = await boss.patch(`/platform/hotels/${otherHotel._id}`).send({ settings: { upiVpa: 'other@okhdfc', hours: '7 AM - 10 PM', gstRate: 5 } });
        assert.equal(edited.status, 200, edited.body.message);
        const owner = await login('other-owner@test.com');
        assert.equal((await owner.get('/pos/settings')).body.settings.upiVpa, 'other@okhdfc');

        const ownerUser = await User.findOne({ email: 'other-owner@test.com' });
        assert.equal((await boss.patch(`/platform/hotels/${hotel._id}/staff/${ownerUser._id}/password`).send({ password: 'Fresh12345' })).status, 404);
        assert.equal((await boss.patch(`/platform/hotels/${otherHotel._id}/staff/${ownerUser._id}/password`).send({ password: 'Fresh12345' })).status, 200);
        await login('other-owner@test.com', 'Fresh12345');
    });

    it('audit-logs every console action', async () => {
        const actions = (await boss.get('/platform/audit')).body.entries.map((entry) => entry.action);
        for (const action of ['console.signin', 'hotel.create', 'hotel.disable', 'hotel.enable', 'payment.record', 'hotel.update', 'login.password_reset']) {
            assert.ok(actions.includes(action), `missing ${action}`);
        }
    });
});

describe('upgrading an existing single-restaurant database', () => {
    it('moves old data into the first hotel and keeps bill numbering going', async () => {
        const { assignToFirstHotel } = require('../utils/migrations');
        const Sequence = require('../models/sequence.model');

        await MenuItem.collection.insertOne({ name: 'Legacy Vada', nameKey: 'legacy vada', price: 30, counter: 'Main Kitchen' });
        await User.collection.insertOne({ name: 'Old Cashier', email: 'old@test.com', password: 'x', role: 'staff' });
        await Sequence.collection.insertOne({ _id: 'bill:2030-31', seq: 41 });

        const adopted = await assignToFirstHotel();
        assert.equal(String(adopted._id), String(hotel._id), 'existing data joins the oldest hotel');
        assert.equal(String((await MenuItem.findOne({ nameKey: 'legacy vada' })).hotel), String(hotel._id));
        assert.equal(String((await User.findOne({ email: 'old@test.com' })).hotel), String(hotel._id));
        assert.equal((await Sequence.findById(`${hotel._id}:bill:2030-31`)).seq, 41);
        assert.equal(await assignToFirstHotel(), null, 'running again does nothing');
    });
});
