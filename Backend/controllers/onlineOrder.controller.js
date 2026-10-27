/**
 * Online orders - placed by customers themselves (restaurant website, table QR, self-order kiosk)
 * and paid through Razorpay, with no cashier involved:
 *
 *   1. createOrder   prices the cart from the database and opens a Razorpay order
 *   2. Checkout      the customer pays by UPI in the Razorpay window (their UPI app, or a QR)
 *   3. verifyPayment the browser hands back the signed payment; the server checks the signature,
 *                    looks the payment up at Razorpay (amount, currency, captured) and issues the
 *                    bill with its token - the kitchen sees it at once
 *   4. webhook       Razorpay confirms independently, so an order is never lost if the customer
 *                    closes the page right after paying. Whichever arrives first creates the bill;
 *                    the other finds it already done.
 */

const crypto = require('crypto');
const OnlineOrder = require('../models/onlineOrder.model');
const Bill = require('../models/bill.model');
const Hotel = require('../models/hotel.model');
const razorpay = require('../config/razorpay');
const whatsapp = require('../config/whatsapp');
const { OrderError, priceOrderLines, issueBill } = require('../utils/orders');
const { getBusinessSettings, computeTotals, normalizeIndianPhone } = require('../utils/billing');

const SLUG = /^[a-z0-9-]{1,60}$/;
const PUBLIC_ID = /^[A-Za-z0-9_-]{8,64}$/;
const PAY_LINK_ID = /^pay_[A-Za-z0-9]{12,32}$/;
// A simulated payment link stays open this long
const PAY_LINK_MS = 10 * 60 * 1000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fail = (res, status, message) => res.status(status).json({ success: false, message });

/** The hotel, if it is active and takes online orders */
const findOrderingHotel = async (slug) => {
    if (!SLUG.test(String(slug || ''))) return null;
    const hotel = await Hotel.findOne({ slug }).select(razorpay.SECRET_FIELDS).lean();
    if (!hotel || !Hotel.accessStatus(hotel).ok || !razorpay.onlineOrderingMode(hotel)) return null;
    return hotel;
};

/** A hotel with the Razorpay credentials its payments use */
const loadPaymentHotel = async (hotelId) => {
    const hotel = await Hotel.findById(hotelId).select(razorpay.SECRET_FIELDS).lean();
    const account = razorpay.accountFor(hotel);
    if (!account) throw new OrderError('Online payments are not set up for this restaurant right now', 503);
    return { hotel, account };
};

/** Random letters and digits (payment link ids) */
const randomCode = (length) => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    return Array.from(crypto.randomBytes(length), (byte) => alphabet[byte % alphabet.length]).join('');
};

/** A 12-digit UPI-style transaction reference */
const transactionReference = () => `${6 + (crypto.randomBytes(1)[0] % 4)}${Array.from(crypto.randomBytes(11), (byte) => byte % 10).join('')}`;

/**
 * Turn a claimed, paid order into a bill with a token: the kitchen sees it at once and the
 * customer gets the WhatsApp confirmation. `claimed` must have been claimed (finalizing: true).
 */
const issueOrderBill = async (claimed, hotel, payment, orderFields = {}) => {
    try {
        const settings = getBusinessSettings(hotel);
        const bill = await issueBill({
            hotelId: hotel._id,
            settings,
            lines: claimed.items.map((line) => line.toObject()),
            totals: {
                subtotal: claimed.subtotal,
                taxableAmount: claimed.taxableAmount,
                cgst: claimed.cgst,
                sgst: claimed.sgst,
                roundOff: claimed.roundOff,
                total: claimed.total
            },
            payment,
            customer: { name: claimed.customer.name, phone: claimed.customer.phone },
            source: claimed.source,
            note: claimed.note
        });
        claimed.set({ status: 'paid', bill: bill._id, paidAt: new Date(), finalizing: false, ...orderFields });
        await claimed.save();
        sendReceiptInBackground(bill, settings, claimed.publicId);
        return claimed;
    } catch (error) {
        await OnlineOrder.updateOne({ _id: claimed._id }, { $set: { finalizing: false } });
        throw error;
    }
};

/** What the customer's order page shows - never the phone number or payment ids */
const orderView = async (order) => {
    const bill = order.bill ? await Bill.findById(order.bill).select('publicId tokenNumber status stations billNumber total payment.gateway payment.method updatedAt').lean() : null;
    const hotel = await Hotel.findById(order.hotel).select('name settings.address settings.phone').lean();
    return {
        publicId: order.publicId,
        status: order.status,
        total: order.total,
        items: order.items.map((line) => ({ name: line.name, quantity: line.quantity, amount: line.amount })),
        customerName: order.customer?.name,
        // Only the last digits - enough for "we'll WhatsApp you on ••••3210"
        phoneEnding: String(order.customer?.phone || '').slice(-4),
        note: order.note,
        source: order.source,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
        // A test payment (simulated UPI, or an older demo order): no money moved
        testPayment: ['simulated', 'demo'].includes(bill?.payment?.gateway),
        paymentMethod: order.razorpay?.method || null,
        paymentReference: order.payLink?.reference || null,
        restaurant: { name: hotel?.name, address: hotel?.settings?.address, phone: hotel?.settings?.phone },
        bill: bill && {
            publicId: bill.publicId,
            tokenNumber: bill.tokenNumber,
            billNumber: bill.billNumber,
            status: bill.status,
            updatedAt: bill.updatedAt,
            stations: bill.stations.map((station) => ({ counter: station.counter, status: station.status }))
        }
    };
};

/** Send the WhatsApp confirmation, linking to the order's own tracking page; store the result (in the background) */
const sendReceiptInBackground = (bill, settings, orderPublicId) => {
    whatsapp.sendBillReceipt(bill, settings, { link: whatsapp.getTrackingUrl(orderPublicId) })
        .then((result) => Bill.updateOne({ _id: bill._id }, {
            $set: {
                'receipt.whatsapp': {
                    status: result.status,
                    messageId: result.messageId,
                    error: result.error,
                    sentAt: result.status === 'sent' ? new Date() : undefined
                }
            }
        }))
        .catch((error) => console.error('❌ Error recording WhatsApp receipt:', error.message));
};

/**
 * Turn a verified, captured payment into a bill. Safe to call twice (Checkout + webhook):
 * only one caller can claim the order; the other waits for the bill to appear.
 */
const finalizeOrder = async (orderId, paymentId) => {
    let order = await OnlineOrder.findById(orderId);
    if (!order) throw new OrderError('Order not found', 404);
    if (order.bill) return order;

    // Never trust the browser: ask Razorpay what was actually paid (on the hotel's own account)
    const { hotel, account } = await loadPaymentHotel(order.hotel);
    let payment = await razorpay.fetchPayment(account, paymentId);
    if (payment.order_id !== order.razorpay.orderId) throw new OrderError('This payment belongs to a different order');
    if (payment.currency !== 'INR' || payment.amount !== razorpay.toPaise(order.total)) {
        throw new OrderError('The amount paid does not match the order. Please contact the restaurant.');
    }
    if (payment.status === 'authorized') payment = await razorpay.capturePayment(account, paymentId, payment.amount);
    if (payment.status !== 'captured') throw new OrderError('The payment is not complete yet', 409);

    const claimed = await OnlineOrder.findOneAndUpdate(
        { _id: order._id, bill: null, finalizing: { $ne: true } },
        { $set: { finalizing: true } },
        { new: true }
    );
    if (!claimed) {
        // The other confirmation is creating the bill right now - wait for it
        for (let attempt = 0; attempt < 20; attempt++) {
            await sleep(250);
            order = await OnlineOrder.findById(orderId);
            if (order?.bill) return order;
        }
        throw new OrderError('Still confirming your payment. Please refresh in a moment.', 409);
    }

    return issueOrderBill(claimed, hotel, {
        mode: payment.method === 'upi' ? 'upi' : 'card',
        gateway: 'razorpay',
        gatewayOrderId: claimed.razorpay.orderId,
        gatewayPaymentId: payment.id,
        method: payment.method,
        reference: payment.id
    }, { 'razorpay.paymentId': payment.id, 'razorpay.method': payment.method });
};

const handleError = (res, error, what) => {
    if (error instanceof OrderError) return fail(res, error.status, error.message);
    if (error instanceof razorpay.RazorpayError) {
        console.error(`❌ Razorpay error while ${what}:`, error.message);
        return fail(res, 502, 'The payment service is not responding. Please try again.');
    }
    console.error(`❌ Error while ${what}:`, error);
    return fail(res, 500, `Something went wrong while ${what}`);
};

/**
 * Public: start an online order - returns what the Razorpay Checkout window needs
 */
module.exports.createOrder = async (req, res) => {
    try {
        const hotel = await findOrderingHotel(req.params.slug);
        if (!hotel) return fail(res, 404, 'Online ordering is not available right now');

        const { items, customer = {}, source } = req.body;
        const note = String(req.body.note || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 140) || undefined;
        // The name is optional - the mobile number is what the token is sent to
        const name = String(customer.name || '').trim().replace(/[<>]/g, '').slice(0, 60) || 'Guest';
        const phone = normalizeIndianPhone(customer.phone);
        if (!phone) return fail(res, 400, 'Enter a valid 10-digit mobile number');

        const settings = getBusinessSettings(hotel);
        const lines = await priceOrderLines(hotel._id, items);
        const totals = computeTotals(lines, settings);
        if (totals.total < 1) return fail(res, 400, 'The order total must be at least ₹1');

        const publicId = crypto.randomBytes(12).toString('base64url');
        if (razorpay.onlineOrderingMode(hotel) === 'simulated') {
            // A test UPI payment: the order waits on its own payment link until someone pays it
            const order = await OnlineOrder.create({
                hotel: hotel._id,
                publicId,
                items: lines,
                ...totals,
                customer: { name, phone },
                source: source === 'kiosk' ? 'kiosk' : 'qr',
                note,
                razorpay: { orderId: `sim_${publicId}` },
                payLink: { id: `pay_${randomCode(16)}`, expiresAt: new Date(Date.now() + PAY_LINK_MS) }
            });
            return res.status(201).json({
                success: true,
                simulated: true,
                order: { publicId: order.publicId, total: order.total },
                payment: { id: order.payLink.id, amount: order.total, expiresAt: order.payLink.expiresAt, payee: settings.name }
            });
        }

        const account = razorpay.accountFor(hotel);
        if (!account) return fail(res, 503, 'Online payments are not set up for this restaurant right now');
        const gatewayOrder = await razorpay.createOrder(account, {
            amount: totals.total,
            receipt: publicId,
            notes: { hotel: hotel.slug, order: publicId }
        });

        const order = await OnlineOrder.create({
            hotel: hotel._id,
            publicId,
            items: lines,
            ...totals,
            customer: { name, phone },
            source: source === 'kiosk' ? 'kiosk' : 'qr',
            note,
            razorpay: { orderId: gatewayOrder.id }
        });

        const count = lines.reduce((sum, line) => sum + line.quantity, 0);
        res.status(201).json({
            success: true,
            order: { publicId: order.publicId, total: order.total },
            checkout: {
                key: account.keyId,
                orderId: gatewayOrder.id,
                amount: gatewayOrder.amount,
                currency: 'INR',
                name: settings.name,
                description: `${count} item${count === 1 ? '' : 's'} · ${settings.name}`,
                prefill: { name, contact: `+${phone}` },
                // UPI only (apps on phones, QR on computers) when the account has UPI switched on;
                // otherwise whatever the account allows, so checkout never comes up empty
                upiOnly: (await razorpay.upiEnabled(account.keyId)) !== false
            }
        });
    } catch (error) {
        handleError(res, error, 'starting the order');
    }
};

/**
 * Public: the Razorpay Checkout window hands back the signed payment
 */
module.exports.verifyPayment = async (req, res) => {
    try {
        if (!PUBLIC_ID.test(req.params.publicId)) return fail(res, 404, 'Order not found');
        const order = await OnlineOrder.findOne({ publicId: req.params.publicId });
        if (!order) return fail(res, 404, 'Order not found');

        const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;
        const { account } = await loadPaymentHotel(order.hotel);
        if (orderId !== order.razorpay.orderId || !razorpay.verifyPaymentSignature(account, { orderId, paymentId, signature })) {
            return fail(res, 400, 'The payment could not be verified');
        }

        const finished = await finalizeOrder(order._id, paymentId);
        res.status(200).json({ success: true, order: await orderView(finished) });
    } catch (error) {
        handleError(res, error, 'confirming the payment');
    }
};

/**
 * Public: the customer's order page polls this for the token and kitchen status
 */
module.exports.getOrder = async (req, res) => {
    try {
        if (!PUBLIC_ID.test(req.params.publicId)) return fail(res, 404, 'Order not found');
        const order = await OnlineOrder.findOne({ publicId: req.params.publicId }).lean();
        if (!order) return fail(res, 404, 'Order not found');
        res.set('Cache-Control', 'no-store');
        res.status(200).json({ success: true, order: await orderView(order) });
    } catch (error) {
        handleError(res, error, 'loading the order');
    }
};

/* ---------- Simulated UPI payments: the order's own payment link ---------- */

const UPI_HANDLE = (hotel) => hotel.settings?.upiVpa || `${hotel.slug.replace(/-/g, '').slice(0, 20)}@upi`;

/** What the payment page shows */
const payLinkView = async (order) => {
    const hotel = await Hotel.findById(order.hotel).select('name slug settings.upiVpa').lean();
    const expired = !order.bill && order.payLink.expiresAt < new Date();
    return {
        id: order.payLink.id,
        status: order.bill ? 'paid' : expired ? 'expired' : 'pending',
        amount: order.total,
        payee: hotel?.name,
        upiId: hotel ? UPI_HANDLE(hotel) : '',
        orderPublicId: order.publicId,
        // A short code people can read out: letters and digits only
        orderCode: order.publicId.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase(),
        items: order.items.map((line) => ({ name: line.name, quantity: line.quantity })),
        expiresAt: order.payLink.expiresAt,
        paidAt: order.paidAt || null,
        reference: order.payLink.reference || null
    };
};

/**
 * Public: a payment link (what scanning the QR opens)
 */
module.exports.getPayLink = async (req, res) => {
    try {
        if (!PAY_LINK_ID.test(req.params.linkId)) return fail(res, 404, 'This payment link is not valid');
        const order = await OnlineOrder.findOne({ 'payLink.id': req.params.linkId });
        if (!order) return fail(res, 404, 'This payment link is not valid');
        res.set('Cache-Control', 'no-store');
        res.status(200).json({ success: true, payment: await payLinkView(order) });
    } catch (error) {
        handleError(res, error, 'loading the payment');
    }
};

/**
 * Public: pay a simulated payment link. The order becomes a bill with a token, exactly as a
 * real payment would make it; paying twice is harmless (the second answers with the first).
 */
module.exports.paySimulated = async (req, res) => {
    try {
        if (!PAY_LINK_ID.test(req.params.linkId)) return fail(res, 404, 'This payment link is not valid');
        let order = await OnlineOrder.findOne({ 'payLink.id': req.params.linkId });
        if (!order) return fail(res, 404, 'This payment link is not valid');
        if (order.bill) return res.status(200).json({ success: true, payment: await payLinkView(order) });
        if (order.payLink.expiresAt < new Date()) return fail(res, 410, 'This payment request has expired. Please start the order again.');

        const hotel = await Hotel.findById(order.hotel).lean();
        if (!hotel || razorpay.onlineOrderingMode(hotel) !== 'simulated') return fail(res, 409, 'Test payments are switched off for this restaurant');

        const reference = transactionReference();
        const claimed = await OnlineOrder.findOneAndUpdate(
            { _id: order._id, bill: null, finalizing: { $ne: true }, 'payLink.expiresAt': { $gt: new Date() } },
            { $set: { finalizing: true } },
            { new: true }
        );
        if (!claimed) {
            for (let attempt = 0; attempt < 20; attempt++) {
                await sleep(250);
                order = await OnlineOrder.findById(order._id);
                if (order?.bill) return res.status(200).json({ success: true, payment: await payLinkView(order) });
            }
            return fail(res, 409, 'Still confirming the payment. Please refresh in a moment.');
        }

        const paid = await issueOrderBill(claimed, hotel, {
            mode: 'upi',
            gateway: 'simulated',
            method: 'upi',
            reference: `Test UPI ${reference}`
        }, { 'razorpay.method': 'upi', 'razorpay.paymentId': `sim_${reference}`, 'payLink.reference': reference });
        res.status(200).json({ success: true, payment: await payLinkView(paid) });
    } catch (error) {
        handleError(res, error, 'completing the payment');
    }
};

/**
 * Razorpay webhook (raw body). Each hotel's webhook is /pos/payments/razorpay/webhook/<slug>,
 * signed with that hotel's webhook secret; the older /webhook (no slug) uses RAZORPAY_WEBHOOK_SECRET.
 */
module.exports.razorpayWebhook = async (req, res) => {
    const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
    const { slug } = req.params;
    let hotelId = null;
    let secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (slug !== undefined) {
        const hotel = SLUG.test(slug) ? await Hotel.findOne({ slug }).select(razorpay.SECRET_FIELDS).lean().catch(() => null) : null;
        hotelId = hotel?._id;
        secret = razorpay.accountFor(hotel)?.webhookSecret;
    }
    if (!razorpay.verifyWebhookSignature(secret, raw, req.get('X-Razorpay-Signature'))) {
        return fail(res, 400, 'Invalid signature');
    }

    let event;
    try {
        event = JSON.parse(raw);
    } catch {
        return fail(res, 400, 'Invalid payload');
    }

    try {
        const payment = event.payload?.payment?.entity;
        if (payment?.order_id) {
            const order = await OnlineOrder.findOne({ 'razorpay.orderId': payment.order_id, ...(hotelId && { hotel: hotelId }) });
            if (order && ['payment.captured', 'order.paid'].includes(event.event) && !order.bill) {
                await finalizeOrder(order._id, payment.id);
            } else if (order && event.event === 'payment.failed' && !order.bill) {
                await OnlineOrder.updateOne({ _id: order._id }, {
                    $set: { 'razorpay.lastError': String(payment.error_description || 'Payment failed').slice(0, 200) }
                });
            }
        }
    } catch (error) {
        // Answer 200 anyway for problems on our side that a retry cannot fix; log for the owner
        console.error(`❌ Razorpay webhook (${event.event}) could not be processed:`, error.message);
        if (error instanceof razorpay.RazorpayError) return fail(res, 502, 'Retry later');
    }
    res.status(200).json({ received: true });
};

// Webhook statuses only move forward (they can arrive out of order)
const STATUS_RANK = { sent: 1, delivered: 2, read: 3 };

/**
 * WhatsApp Cloud API webhook: GET is Meta's handshake, POST brings delivery / read receipts
 */
module.exports.whatsappWebhookVerify = (req, res) => {
    // Read the raw query: the request sanitiser rewrites keys containing dots (hub.mode)
    const query = Object.fromEntries(new URL(req.originalUrl, 'http://localhost').searchParams);
    if (!whatsapp.verifyWebhookHandshake(query)) return res.sendStatus(403);
    res.status(200).type('text/plain').send(String(query['hub.challenge'] || ''));
};

module.exports.whatsappWebhook = async (req, res) => {
    const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
    if (!whatsapp.verifyWebhookSignature(raw, req.get('X-Hub-Signature-256'))) return res.sendStatus(401);

    try {
        for (const update of whatsapp.statusUpdates(JSON.parse(raw))) {
            for (const field of ['receipt.whatsapp', 'receipt.readyNotice']) {
                if (update.status === 'failed') {
                    await Bill.updateOne({ [`${field}.messageId`]: update.messageId }, {
                        $set: { [`${field}.status`]: 'failed', [`${field}.error`]: update.error || 'Not delivered' }
                    });
                    continue;
                }
                const rank = STATUS_RANK[update.status];
                if (!rank) continue;
                const earlier = Object.keys(STATUS_RANK).filter((status) => STATUS_RANK[status] < rank);
                await Bill.updateOne(
                    { [`${field}.messageId`]: update.messageId, [`${field}.status`]: { $in: earlier } },
                    {
                        $set: {
                            [`${field}.status`]: update.status,
                            ...(field === 'receipt.whatsapp' && update.status === 'delivered' && { 'receipt.whatsapp.deliveredAt': update.at }),
                            ...(field === 'receipt.whatsapp' && update.status === 'read' && { 'receipt.whatsapp.readAt': update.at })
                        }
                    }
                );
            }
        }
    } catch (error) {
        console.error('❌ WhatsApp webhook could not be processed:', error.message);
    }
    res.sendStatus(200);
};

module.exports.finalizeOrder = finalizeOrder;
