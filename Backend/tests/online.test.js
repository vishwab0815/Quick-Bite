/**
 * Online orders paid through Razorpay, and WhatsApp messages (Cloud API).
 * Razorpay and Meta are never called: global fetch is replaced with a fake that
 * behaves like their APIs, so no keys or real money are involved.
 */
const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const DAY_MS = 24 * 60 * 60 * 1000;
const PASSWORD = 'Test1234';
const KEY_SECRET = 'rzp-test-secret';
const WEBHOOK_SECRET = 'rzp-webhook-secret';
const APP_SECRET = 'meta-app-secret';
const HOTEL_KEY_ID = 'rzp_test_SecondHotel01';
const HOTEL_KEY_SECRET = 'SecondHotelSecret0123456';
const HOTEL_WEBHOOK_SECRET = 'second-hotel-webhook-secret';

let mongo;
let app;
let Bill;
let OnlineOrder;
let dosa;
let coffee;
let soldOut;

// ---------- Fake Razorpay + WhatsApp ----------
const fake = { payments: new Map(), refunds: [], whatsapp: [], failRefund: false, orderSeq: 0, messageSeq: 0, keyChecks: [], orderKeys: [] };
const realFetch = global.fetch;

const json = (status, body) => ({ ok: status < 300, status, json: async () => body });

global.fetch = async (url, options = {}) => {
    const { pathname } = new URL(url);
    const body = options.body ? JSON.parse(options.body) : {};
    if (url.startsWith('https://api.razorpay.com/v1')) {
        if (pathname === '/v1/payments') {
            // Key check: only the hotel's real key pair is accepted
            const [keyId, secret] = Buffer.from(String(options.headers.Authorization).slice(6), 'base64').toString().split(':');
            fake.keyChecks.push(keyId);
            return secret === HOTEL_KEY_SECRET || secret === KEY_SECRET ? json(200, { items: [] }) : json(401, { error: { description: 'Authentication failed' } });
        }
        if (pathname === '/v1/orders') {
            fake.orderSeq += 1;
            fake.orderKeys.push(Buffer.from(String(options.headers.Authorization).slice(6), 'base64').toString().split(':')[0]);
            return json(200, { id: `order_T${fake.orderSeq}`, amount: body.amount, currency: body.currency, receipt: body.receipt });
        }
        const refund = pathname.match(/^\/v1\/payments\/([^/]+)\/refund$/);
        if (refund) {
            if (fake.failRefund) return json(400, { error: { description: 'Refund amount exceeds balance' } });
            const payment = fake.payments.get(refund[1]);
            fake.refunds.push(refund[1]);
            return json(200, { id: `rfnd_${refund[1]}`, status: 'processed', amount: payment.amount });
        }
        const capture = pathname.match(/^\/v1\/payments\/([^/]+)\/capture$/);
        if (capture) {
            const payment = { ...fake.payments.get(capture[1]), status: 'captured' };
            fake.payments.set(capture[1], payment);
            return json(200, payment);
        }
        const lookup = pathname.match(/^\/v1\/payments\/([^/]+)$/);
        if (lookup) return fake.payments.has(lookup[1]) ? json(200, fake.payments.get(lookup[1])) : json(404, { error: { description: 'Not found' } });
    }
    if (url.startsWith('https://graph.facebook.com/')) {
        fake.messageSeq += 1;
        fake.whatsapp.push({ to: body.to, template: body.template.name, parameters: body.template.components[0].parameters.map((p) => p.text) });
        return json(200, { messages: [{ id: `wamid.${fake.messageSeq}` }] });
    }
    return realFetch(url, options);
};

const sign = (secret, data) => crypto.createHmac('sha256', secret).update(data).digest('hex');

/** The customer pays in the Razorpay window: returns what Checkout hands back */
const pay = (orderId, amount, { method = 'upi', status = 'captured' } = {}) => {
    const paymentId = `pay_${crypto.randomBytes(5).toString('hex')}`;
    fake.payments.set(paymentId, { id: paymentId, order_id: orderId, amount, currency: 'INR', status, method });
    return {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: sign(KEY_SECRET, `${orderId}|${paymentId}`)
    };
};

const webhook = (event, payment, secret = WEBHOOK_SECRET) => {
    const raw = JSON.stringify({ event, payload: { payment: { entity: payment } } });
    return request(app).post('/pos/payments/razorpay/webhook')
        .set('Content-Type', 'application/json')
        .set('X-Razorpay-Signature', sign(secret, raw))
        .send(raw);
};

const startOrder = (overrides = {}) => request(app).post('/pos/public/naivedya/orders').send({
    items: [{ itemId: String(dosa._id), quantity: 2 }, { itemId: String(coffee._id), quantity: 1, price: 1 }],
    customer: { name: 'Meena', phone: '98765 43210' },
    ...overrides
});

const waitFor = async (check, label) => {
    for (let attempt = 0; attempt < 40; attempt++) {
        if (await check()) return;
        await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.fail(`timed out waiting for ${label}`);
};

const login = async (email) => {
    const agent = request.agent(app);
    const res = await agent.post('/api/auth/login').send({ email, password: PASSWORD });
    assert.equal(res.status, 200, res.body.message);
    return agent;
};

before(async () => {
    mongo = await MongoMemoryServer.create();
    Object.assign(process.env, {
        MONGO_URI: mongo.getUri('online-test'),
        JWT_SECRET: 'test-secret',
        NODE_ENV: 'test',
        FRONTEND_URL: 'http://localhost:5173',
        RAZORPAY_KEY_ID: 'rzp_test_key',
        RAZORPAY_KEY_SECRET: KEY_SECRET,
        RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET,
        ONLINE_ORDERS_HOTEL: 'naivedya',
        WHATSAPP_TOKEN: 'wa-token',
        WHATSAPP_PHONE_NUMBER_ID: '1234',
        WHATSAPP_TEMPLATE_NAME: 'order_receipt',
        WHATSAPP_READY_TEMPLATE: 'order_ready',
        WHATSAPP_APP_SECRET: APP_SECRET,
        WHATSAPP_VERIFY_TOKEN: 'verify-me',
    });

    app = require('../app');
    const Hotel = require('../models/hotel.model');
    const User = require('../models/userauthentication.model');
    const MenuItem = require('../models/menuItem.model');
    Bill = require('../models/bill.model');
    OnlineOrder = require('../models/onlineOrder.model');
    await require('../db/db').ready;

    const paidUntil = new Date(Date.now() + 30 * DAY_MS);
    const hotel = await Hotel.create({
        name: 'Udupi Sri Krishna Naivedya',
        slug: 'naivedya',
        settings: { gstScheme: 'regular', gstRate: 5, pricesIncludeGst: true },
        subscription: { plan: 'monthly', paidUntil },
    });
    const other = await Hotel.create({ name: 'Other Hotel', slug: 'other-hotel', subscription: { plan: 'trial', paidUntil } });
    [dosa, coffee, soldOut] = await MenuItem.create([
        { hotel: hotel._id, name: 'Masala Dosa', price: 80, counter: 'Dosa Counter', category: 'Dosa' },
        { hotel: hotel._id, name: 'Filter Coffee', price: 30, counter: 'Beverages', category: 'Beverages' },
        { hotel: hotel._id, name: 'Kesari Bath', price: 45, counter: 'Sweets', isAvailable: false },
    ]);
    await MenuItem.create({ hotel: other._id, name: 'Idli', price: 40, counter: 'Main' });
    const password = await bcrypt.hash(PASSWORD, 4);
    await User.create([
        { name: 'Owner', email: 'owner@naivedya.test', password, role: 'admin', hotel: hotel._id },
        { name: 'Kitchen', email: 'kitchen@naivedya.test', password, role: 'staff', hotel: hotel._id },
        { name: 'Platform', email: 'platform@quickbite.test', password, role: 'superadmin' },
    ]);
    const second = await Hotel.create({ name: 'Second Hotel', slug: 'second-hotel', subscription: { plan: 'trial', paidUntil } });
    await MenuItem.create({ hotel: second._id, name: 'Rava Idli', price: 50, counter: 'Main' });
});

after(async () => {
    global.fetch = realFetch;
    await mongoose.disconnect();
    await mongo.stop();
});

beforeEach(() => {
    fake.whatsapp.length = 0;
    fake.refunds.length = 0;
    fake.failRefund = false;
});

describe('online orders (Razorpay)', () => {
    it('opens online ordering only for the hotel that owns the Razorpay account', async () => {
        assert.equal((await request(app).get('/pos/public/naivedya/info')).body.restaurant.onlineOrdering, true);
        assert.equal((await request(app).get('/pos/public/other-hotel/info')).body.restaurant.onlineOrdering, false);
        const res = await request(app).post('/pos/public/other-hotel/orders').send({ items: [], customer: { name: 'A B', phone: '9876543210' } });
        assert.equal(res.status, 404);
    });

    it('prices the order from the menu, never from the browser, and opens a Razorpay order', async () => {
        const res = await startOrder();
        assert.equal(res.status, 201, res.body.message);
        assert.equal(res.body.order.total, 190, '2 × 80 + 30, the client price is ignored');
        assert.equal(res.body.checkout.amount, 19000, 'amount in paise');
        assert.equal(res.body.checkout.key, 'rzp_test_key');
        assert.equal(res.body.checkout.prefill.contact, '+919876543210');
        assert.ok(!JSON.stringify(res.body).includes(KEY_SECRET), 'the key secret never leaves the server');
        assert.equal(await Bill.countDocuments(), 0, 'no bill or token before payment');
    });

    it('rejects a sold-out dish or a bad mobile number; the name is optional', async () => {
        assert.equal((await startOrder({ items: [{ itemId: String(soldOut._id), quantity: 1 }] })).body.message, 'Kesari Bath is sold out');
        const unnamed = await startOrder({ customer: { name: '', phone: '9876543210' } });
        assert.equal(unnamed.status, 201);
        assert.equal((await OnlineOrder.findOne({ publicId: unnamed.body.order.publicId })).customer.name, 'Guest');
        assert.equal((await startOrder({ customer: { name: 'Meena', phone: '12345' } })).status, 400);
    });

    it('issues a bill with a token only after a verified payment, exactly once', async () => {
        const { body } = await startOrder();
        const forged = { ...pay(body.checkout.orderId, 19000), razorpay_signature: 'f'.repeat(64) };
        const rejected = await request(app).post(`/pos/public/orders/${body.order.publicId}/verify`).send(forged);
        assert.equal(rejected.status, 400);
        assert.equal(await Bill.countDocuments(), 0);

        const paid = pay(body.checkout.orderId, 19000, { method: 'upi' });
        const res = await request(app).post(`/pos/public/orders/${body.order.publicId}/verify`).send(paid);
        assert.equal(res.status, 200, res.body.message);
        assert.equal(res.body.order.status, 'paid');
        assert.equal(res.body.order.bill.tokenNumber, 1);
        assert.ok(!JSON.stringify(res.body).includes('9876543210'), 'the order page never shows the phone number');

        const bill = await Bill.findOne();
        assert.equal(bill.total, 190);
        assert.equal(bill.source, 'qr');
        assert.equal(bill.payment.mode, 'upi');
        assert.equal(bill.payment.gateway, 'razorpay');
        assert.equal(bill.payment.gatewayPaymentId, paid.razorpay_payment_id);

        // The same payment confirmed again, and by the webhook, still makes one bill
        await request(app).post(`/pos/public/orders/${body.order.publicId}/verify`).send(paid).expect(200);
        await webhook('payment.captured', fake.payments.get(paid.razorpay_payment_id)).expect(200);
        assert.equal(await Bill.countDocuments(), 1);

        // The kitchen sees it straight away
        const kitchen = await login('kitchen@naivedya.test');
        const tickets = (await kitchen.get('/pos/kitchen')).body.tickets;
        assert.ok(tickets.some((ticket) => ticket.tokenNumber === 1));

        // The bill went to the customer on WhatsApp automatically
        await waitFor(async () => (await Bill.findById(bill._id)).receipt.whatsapp.status === 'sent', 'WhatsApp receipt');
        assert.equal(fake.whatsapp[0].to, '919876543210');
        assert.equal(fake.whatsapp[0].template, 'order_receipt');
    });

    it('creates the bill from the webhook alone when the customer closes the page after paying', async () => {
        const { body } = await startOrder({ source: 'kiosk' });
        const paid = pay(body.checkout.orderId, 19000, { method: 'card', status: 'authorized' });
        await webhook('payment.captured', fake.payments.get(paid.razorpay_payment_id), 'wrong-secret').expect(400);
        await webhook('payment.captured', fake.payments.get(paid.razorpay_payment_id)).expect(200);

        const order = (await request(app).get(`/pos/public/orders/${body.order.publicId}`)).body.order;
        assert.equal(order.status, 'paid');
        const bill = await Bill.findOne({ publicId: order.bill.publicId });
        assert.equal(bill.payment.mode, 'card');
        assert.equal(bill.source, 'kiosk');
        assert.equal(fake.payments.get(paid.razorpay_payment_id).status, 'captured', 'an authorised payment is captured');
    });

    it('never lets the browser and the webhook both create a bill', async () => {
        const { body } = await startOrder();
        const paid = pay(body.checkout.orderId, 19000);
        const before = await Bill.countDocuments();
        await Promise.all([
            request(app).post(`/pos/public/orders/${body.order.publicId}/verify`).send(paid),
            webhook('payment.captured', fake.payments.get(paid.razorpay_payment_id)),
            webhook('order.paid', fake.payments.get(paid.razorpay_payment_id)),
        ]);
        assert.equal(await Bill.countDocuments(), before + 1);
    });

    it('refuses a payment for the wrong amount', async () => {
        const { body } = await startOrder();
        const res = await request(app).post(`/pos/public/orders/${body.order.publicId}/verify`).send(pay(body.checkout.orderId, 100));
        assert.equal(res.status, 400);
        assert.match(res.body.message, /does not match/);
        assert.equal((await OnlineOrder.findOne({ publicId: body.order.publicId })).bill, undefined);
    });

    it('refunds an online payment when the owner cancels the bill - and keeps the bill if the refund fails', async () => {
        const { body } = await startOrder();
        const paid = pay(body.checkout.orderId, 19000);
        const done = (await request(app).post(`/pos/public/orders/${body.order.publicId}/verify`).send(paid)).body.order;
        const bill = await Bill.findOne({ publicId: done.bill.publicId });
        const owner = await login('owner@naivedya.test');

        fake.failRefund = true;
        const failed = await owner.patch(`/pos/bills/${bill._id}/cancel`).send({ reason: 'Customer left' });
        assert.equal(failed.status, 502);
        assert.equal((await Bill.findById(bill._id)).status, 'preparing', 'not cancelled without a refund');

        fake.failRefund = false;
        const res = await owner.patch(`/pos/bills/${bill._id}/cancel`).send({ reason: 'Customer left' });
        assert.equal(res.status, 200, res.body.message);
        assert.match(res.body.message, /₹190 refunded/);
        assert.deepEqual(fake.refunds, [paid.razorpay_payment_id]);
        assert.equal((await Bill.findById(bill._id)).payment.refund.status, 'processed');
    });
});

describe('demo ordering (no payments set up)', () => {
    it('takes the order straight to the kitchen with no payment, clearly marked as a demo', async () => {
        const Hotel = require('../models/hotel.model');
        const MenuItem = require('../models/menuItem.model');
        const hotel = await Hotel.create({
            name: 'Demo Hotel', slug: 'demo-orders', onlineOrdersDemo: true,
            subscription: { plan: 'trial', paidUntil: new Date(Date.now() + DAY_MS) },
        });
        const idli = await MenuItem.create({ hotel: hotel._id, name: 'Idli', price: 40, counter: 'Tiffin' });

        const info = (await request(app).get('/pos/public/demo-orders/info')).body.restaurant;
        assert.equal(info.onlineOrdering, true);
        assert.equal(info.orderingDemo, true);
        const ordersBefore = fake.orderSeq;

        const res = await request(app).post('/pos/public/demo-orders/orders')
            .send({ items: [{ itemId: String(idli._id), quantity: 3 }], customer: { phone: '9876543210' } });
        assert.equal(res.status, 201, res.body.message);
        assert.equal(res.body.demo, true);
        assert.equal(res.body.checkout, undefined, 'no payment window');
        assert.equal(fake.orderSeq, ordersBefore, 'Razorpay is never called');

        const order = (await request(app).get(`/pos/public/orders/${res.body.order.publicId}`)).body.order;
        assert.equal(order.status, 'paid');
        assert.ok(order.bill.tokenNumber >= 1, 'the customer gets a token');
        const bill = await Bill.findOne({ publicId: order.bill.publicId });
        assert.equal(bill.total, 120);
        assert.equal(bill.payment.gateway, 'demo');
    });

    it('lets real Razorpay payments take over once they are set up', async () => {
        const Hotel = require('../models/hotel.model');
        await Hotel.updateOne({ slug: 'naivedya' }, { $set: { onlineOrdersDemo: true } });
        const res = await startOrder();
        assert.equal(res.status, 201);
        assert.equal(res.body.demo, undefined);
        assert.ok(res.body.checkout.orderId.startsWith('order_'));
        await Hotel.updateOne({ slug: 'naivedya' }, { $set: { onlineOrdersDemo: false } });
    });
});

describe("each hotel's own Razorpay account (set in the console)", () => {
    let platform;
    let hotelId;
    let rava;

    before(async () => {
        const Hotel = require('../models/hotel.model');
        const MenuItem = require('../models/menuItem.model');
        platform = await login('platform@quickbite.test');
        hotelId = String((await Hotel.findOne({ slug: 'second-hotel' }))._id);
        rava = await MenuItem.findOne({ name: 'Rava Idli' });
    });

    it('refuses keys Razorpay does not accept, and never stores or shows a secret in plain text', async () => {
        const bad = await platform.put(`/platform/hotels/${hotelId}/online-payments`).send({ keyId: HOTEL_KEY_ID, keySecret: 'WrongSecret000000000000' });
        assert.equal(bad.status, 400);
        assert.equal((await request(app).get('/pos/public/second-hotel/info')).body.restaurant.onlineOrdering, false);

        const res = await platform.put(`/platform/hotels/${hotelId}/online-payments`)
            .send({ keyId: HOTEL_KEY_ID, keySecret: HOTEL_KEY_SECRET, webhookSecret: HOTEL_WEBHOOK_SECRET });
        assert.equal(res.status, 200, res.body.message);
        assert.equal(res.body.online.enabled, true);
        assert.equal(res.body.online.mode, 'test');
        assert.equal(res.body.online.webhookSecretSaved, true);
        assert.ok(!JSON.stringify(res.body).includes(HOTEL_KEY_SECRET));
        assert.ok(!JSON.stringify((await platform.get(`/platform/hotels/${hotelId}`)).body).includes('keySecret'));

        const stored = await mongoose.connection.db.collection('hotels').findOne({ slug: 'second-hotel' });
        assert.ok(stored.razorpay.keySecret.startsWith('v1.'), 'encrypted at rest');
        assert.ok(!JSON.stringify(stored).includes(HOTEL_KEY_SECRET));
    });

    it("takes the payment on the hotel's own account and confirms it through its own webhook", async () => {
        await new Promise((resolve) => setTimeout(resolve, 15100)); // public details are cached for 15 s
        assert.equal((await request(app).get('/pos/public/second-hotel/info')).body.restaurant.onlineOrdering, true);
        const started = await request(app).post('/pos/public/second-hotel/orders')
            .send({ items: [{ itemId: String(rava._id), quantity: 2 }], customer: { phone: '9876543210' } });
        assert.equal(started.status, 201, started.body.message);
        assert.equal(started.body.checkout.key, HOTEL_KEY_ID);
        assert.equal(fake.orderKeys.at(-1), HOTEL_KEY_ID, 'the order is opened on the hotel account');

        const { razorpay_payment_id: paymentId } = pay(started.body.checkout.orderId, 10000);
        const payment = fake.payments.get(paymentId);
        const wrong = await webhook('payment.captured', payment, WEBHOOK_SECRET).then(() => null);
        assert.equal(wrong, null);
        const raw = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: payment } } });
        const unsigned = await request(app).post('/pos/payments/razorpay/webhook/second-hotel').set('Content-Type', 'application/json')
            .set('X-Razorpay-Signature', sign(WEBHOOK_SECRET, raw)).send(raw);
        assert.equal(unsigned.status, 400, "another account's webhook secret is refused");
        const signed = await request(app).post('/pos/payments/razorpay/webhook/second-hotel').set('Content-Type', 'application/json')
            .set('X-Razorpay-Signature', sign(HOTEL_WEBHOOK_SECRET, raw)).send(raw);
        assert.equal(signed.status, 200);
        const order = await OnlineOrder.findOne({ publicId: started.body.order.publicId });
        assert.equal(order.status, 'paid');
        assert.ok(order.bill);
    });

    it('switches online orders off, and disconnects', async () => {
        const off = await platform.put(`/platform/hotels/${hotelId}/online-payments`).send({ enabled: false });
        assert.equal(off.body.online.enabled, false);
        const gone = await platform.delete(`/platform/hotels/${hotelId}/online-payments`);
        assert.equal(gone.body.online.keyId, '');
        assert.equal(gone.body.online.keySecretSaved, false);
    });
});

describe('WhatsApp (Cloud API)', () => {
    it('tells the customer once when the whole order is ready, and tracks delivery', async () => {
        const { body } = await startOrder();
        const done = (await request(app).post(`/pos/public/orders/${body.order.publicId}/verify`).send(pay(body.checkout.orderId, 19000))).body.order;
        const bill = await Bill.findOne({ publicId: done.bill.publicId });
        const kitchen = await login('kitchen@naivedya.test');
        await waitFor(() => fake.whatsapp.length === 1, 'receipt');

        await kitchen.patch(`/pos/bills/${bill._id}/stations`).send({ counter: 'Dosa Counter', status: 'ready' }).expect(200);
        await new Promise((resolve) => setTimeout(resolve, 150));
        assert.equal(fake.whatsapp.length, 1, 'not ready until every counter is');

        await kitchen.patch(`/pos/bills/${bill._id}/stations`).send({ counter: 'Beverages', status: 'ready' }).expect(200);
        await waitFor(async () => (await Bill.findById(bill._id)).receipt.readyNotice?.status === 'sent', 'ready notice');
        const notice = fake.whatsapp[1];
        assert.equal(notice.template, 'order_ready');
        assert.deepEqual(notice.parameters, ['Meena', 'Udupi Sri Krishna Naivedya', `#${bill.tokenNumber}`, 'Dosa Counter, Beverages']);

        // Back to preparing and ready again: still only one message
        await kitchen.patch(`/pos/bills/${bill._id}/stations`).send({ counter: 'Beverages', status: 'preparing' }).expect(200);
        await kitchen.patch(`/pos/bills/${bill._id}/stations`).send({ counter: 'Beverages', status: 'ready' }).expect(200);
        await new Promise((resolve) => setTimeout(resolve, 150));
        assert.equal(fake.whatsapp.length, 2);

        // Delivery receipts move forward only
        const messageId = (await Bill.findById(bill._id)).receipt.whatsapp.messageId;
        const status = (value) => {
            const raw = JSON.stringify({ entry: [{ changes: [{ value: { statuses: [{ id: messageId, status: value, timestamp: '1760000000' }] } }] }] });
            return request(app).post('/pos/whatsapp/webhook').set('Content-Type', 'application/json')
                .set('X-Hub-Signature-256', `sha256=${sign(APP_SECRET, raw)}`).send(raw);
        };
        await status('read').expect(200);
        await status('delivered').expect(200);
        assert.equal((await Bill.findById(bill._id)).receipt.whatsapp.status, 'read');

        const unsigned = await request(app).post('/pos/whatsapp/webhook').set('Content-Type', 'application/json').send('{}');
        assert.equal(unsigned.status, 401);
    });

    it('answers the Meta webhook handshake only with the right verify token', async () => {
        const ok = await request(app).get('/pos/whatsapp/webhook').query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'verify-me', 'hub.challenge': '12345' });
        assert.equal(ok.status, 200);
        assert.equal(ok.text, '12345');
        const bad = await request(app).get('/pos/whatsapp/webhook').query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'nope', 'hub.challenge': '1' });
        assert.equal(bad.status, 403);
    });
});
