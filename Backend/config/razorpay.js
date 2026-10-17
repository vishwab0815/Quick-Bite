/**
 * Razorpay - online payments for website / QR / kiosk orders
 *
 * Every hotel takes payments into its OWN Razorpay account, so customers' money goes straight
 * to the restaurant. The platform owner enters each hotel's keys in the console (Hotel →
 * Online orders); the key secret and webhook secret are stored encrypted. Each hotel adds its
 * own webhook in its Razorpay dashboard:
 *   URL     <backend>/pos/payments/razorpay/webhook/<hotel web address>
 *   Events  payment.captured, payment.failed, order.paid
 *
 * Older single-account setup (still honoured, for one hotel): RAZORPAY_KEY_ID,
 * RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET and ONLINE_ORDERS_HOTEL in the environment,
 * webhook URL <backend>/pos/payments/razorpay/webhook. A hotel's own keys take priority.
 */

const crypto = require('crypto');
const { open } = require('../utils/secretBox');

const API = 'https://api.razorpay.com/v1';

/** Add to a hotel query to load the stored (encrypted) secrets */
const SECRET_FIELDS = '+razorpay.keySecret +razorpay.webhookSecret';

const KEY_ID = /^rzp_(test|live)_[A-Za-z0-9]{8,32}$/;
const KEY_SECRET = /^[A-Za-z0-9]{16,64}$/;

const isRazorpayConfigured = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

/** The single account set in the environment (older setup), for ONLINE_ORDERS_HOTEL only */
const envAccountFor = (hotel) => (
    isRazorpayConfigured() &&
    hotel?.slug &&
    process.env.ONLINE_ORDERS_HOTEL &&
    hotel.slug === process.env.ONLINE_ORDERS_HOTEL.trim()
        ? { keyId: process.env.RAZORPAY_KEY_ID, keySecret: process.env.RAZORPAY_KEY_SECRET, webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '' }
        : null
);

/** The hotel has its own Razorpay account switched on (no secrets needed to tell) */
const hasOwnAccount = (hotel) => Boolean(hotel?.razorpay?.enabled && hotel.razorpay.keyId);

/** Whether this hotel may take online (prepaid) orders */
const acceptsOnlineOrders = (hotel) => hasOwnAccount(hotel) || Boolean(envAccountFor(hotel));

/**
 * The Razorpay credentials a hotel's payments use - the hotel must be loaded with SECRET_FIELDS.
 * Null when it takes no online payments, or its stored secret can no longer be read.
 */
const accountFor = (hotel) => {
    if (hasOwnAccount(hotel)) {
        const keySecret = open(hotel.razorpay.keySecret);
        if (!keySecret) return null;
        return { keyId: hotel.razorpay.keyId, keySecret, webhookSecret: open(hotel.razorpay.webhookSecret) || '' };
    }
    return envAccountFor(hotel);
};

/**
 * How this hotel takes online orders: 'razorpay' (paid), 'demo' (no payment - for showing the
 * ordering flow before payments are set up) or null (not at all). Razorpay always wins.
 */
const onlineOrderingMode = (hotel) => {
    if (acceptsOnlineOrders(hotel)) return 'razorpay';
    if (hotel?.onlineOrdersDemo) return 'demo';
    return null;
};

/** 'test' or 'live', from the key id */
const keyMode = (keyId) => (String(keyId).startsWith('rzp_live_') ? 'live' : 'test');

const toPaise = (rupees) => Math.round(Number(rupees) * 100);

/** Equal-length, constant-time comparison of two hex signatures */
const safeEqual = (a, b) => {
    const left = Buffer.from(String(a || ''), 'utf8');
    const right = Buffer.from(String(b || ''), 'utf8');
    return left.length === right.length && crypto.timingSafeEqual(left, right);
};

const hmac = (secret, data) => crypto.createHmac('sha256', secret).update(data).digest('hex');

/** Signature returned by Checkout: HMAC(order_id|payment_id, key secret) */
const verifyPaymentSignature = (account, { orderId, paymentId, signature }) =>
    Boolean(account?.keySecret && orderId && paymentId && signature) &&
    safeEqual(hmac(account.keySecret, `${orderId}|${paymentId}`), signature);

/** Signature on webhooks: HMAC(raw request body, webhook secret) */
const verifyWebhookSignature = (webhookSecret, rawBody, signature) =>
    Boolean(webhookSecret && rawBody && signature) &&
    safeEqual(hmac(webhookSecret, rawBody), signature);

class RazorpayError extends Error {
    constructor(message, status) {
        super(message);
        this.name = 'RazorpayError';
        this.status = status;
    }
}

const request = async (account, method, path, body) => {
    const auth = Buffer.from(`${account.keyId}:${account.keySecret}`).toString('base64');
    let response;
    try {
        response = await fetch(`${API}${path}`, {
            method,
            headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined,
            signal: AbortSignal.timeout(15000)
        });
    } catch (error) {
        throw new RazorpayError(`Could not reach Razorpay: ${error.message}`, 502);
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new RazorpayError(data?.error?.description || `Razorpay error (HTTP ${response.status})`, response.status);
    }
    return data;
};

/** Create a Razorpay order for an amount in rupees */
const createOrder = (account, { amount, receipt, notes }) => request(account, 'POST', '/orders', {
    amount: toPaise(amount),
    currency: 'INR',
    receipt: String(receipt).slice(0, 40),
    notes
});

const fetchPayment = (account, paymentId) => request(account, 'GET', `/payments/${encodeURIComponent(paymentId)}`);

const capturePayment = (account, paymentId, amountPaise) => request(account, 'POST', `/payments/${encodeURIComponent(paymentId)}/capture`, {
    amount: amountPaise,
    currency: 'INR'
});

/** Full refund (or `amount` rupees) of a captured payment */
const refundPayment = (account, paymentId, { amount, notes } = {}) => request(account, 'POST', `/payments/${encodeURIComponent(paymentId)}/refund`, {
    ...(amount !== undefined && { amount: toPaise(amount) }),
    speed: 'normal',
    notes
});

/*
 * Whether UPI is switched on for a Razorpay account (Razorpay's public list of the account's
 * payment methods, by key id). Cached for 10 minutes; unknown (null) if Razorpay can't be reached.
 */
const METHODS_CACHE_MS = 10 * 60 * 1000;
const methodsCache = new Map();

const upiEnabled = async (keyId) => {
    const cached = methodsCache.get(keyId);
    if (cached && cached.expiresAt > Date.now()) return cached.upi;
    try {
        const response = await fetch(`${API}/methods?key_id=${encodeURIComponent(keyId)}`, { signal: AbortSignal.timeout(5000) });
        if (!response.ok) return null;
        const methods = await response.json();
        const upi = methods?.upi === true;
        methodsCache.set(keyId, { upi, expiresAt: Date.now() + METHODS_CACHE_MS });
        return upi;
    } catch {
        return null;
    }
};

/** Check a key pair with Razorpay before saving it: true if Razorpay accepts it */
const checkKeys = async (keyId, keySecret) => {
    try {
        await request({ keyId, keySecret }, 'GET', '/payments?count=1');
        return true;
    } catch (error) {
        if (error.status === 401) return false;
        throw error;
    }
};

module.exports = {
    SECRET_FIELDS,
    KEY_ID,
    KEY_SECRET,
    isRazorpayConfigured,
    acceptsOnlineOrders,
    accountFor,
    onlineOrderingMode,
    keyMode,
    toPaise,
    verifyPaymentSignature,
    verifyWebhookSignature,
    createOrder,
    fetchPayment,
    capturePayment,
    refundPayment,
    checkKeys,
    upiEnabled,
    RazorpayError
};
