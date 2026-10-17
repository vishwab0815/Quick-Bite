/**
 * Razorpay - online payments for website / QR / kiosk orders
 *
 * Money goes straight into the restaurant's own Razorpay account. Set in the environment
 * (never in code):
 *   RAZORPAY_KEY_ID          rzp_live_... (rzp_test_... while testing)
 *   RAZORPAY_KEY_SECRET      from Razorpay Dashboard → Account & Settings → API keys
 *   RAZORPAY_WEBHOOK_SECRET  the secret typed when adding the webhook
 *   ONLINE_ORDERS_HOTEL      slug of the hotel this Razorpay account belongs to - only that
 *                            hotel can take online orders, so no other hotel's customers can
 *                            ever pay into this account
 *
 * Webhook (Dashboard → Webhooks): URL <backend>/pos/payments/razorpay/webhook,
 * events payment.captured, payment.failed, order.paid
 */

const crypto = require('crypto');

const API = 'https://api.razorpay.com/v1';

const isRazorpayConfigured = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

/** Whether this hotel may take online (prepaid) orders */
const acceptsOnlineOrders = (hotel) => Boolean(
    isRazorpayConfigured() &&
    hotel?.slug &&
    process.env.ONLINE_ORDERS_HOTEL &&
    hotel.slug === process.env.ONLINE_ORDERS_HOTEL.trim()
);

/**
 * How this hotel takes online orders: 'razorpay' (paid), 'demo' (no payment - for showing the
 * ordering flow before payments are set up) or null (not at all). Razorpay always wins.
 */
const onlineOrderingMode = (hotel) => {
    if (acceptsOnlineOrders(hotel)) return 'razorpay';
    if (hotel?.onlineOrdersDemo) return 'demo';
    return null;
};

const toPaise = (rupees) => Math.round(Number(rupees) * 100);

/** Equal-length, constant-time comparison of two hex signatures */
const safeEqual = (a, b) => {
    const left = Buffer.from(String(a || ''), 'utf8');
    const right = Buffer.from(String(b || ''), 'utf8');
    return left.length === right.length && crypto.timingSafeEqual(left, right);
};

const hmac = (secret, data) => crypto.createHmac('sha256', secret).update(data).digest('hex');

/** Signature returned by Checkout: HMAC(order_id|payment_id, key secret) */
const verifyPaymentSignature = ({ orderId, paymentId, signature }) =>
    Boolean(orderId && paymentId && signature && process.env.RAZORPAY_KEY_SECRET) &&
    safeEqual(hmac(process.env.RAZORPAY_KEY_SECRET, `${orderId}|${paymentId}`), signature);

/** Signature on webhooks: HMAC(raw request body, webhook secret) */
const verifyWebhookSignature = (rawBody, signature) =>
    Boolean(process.env.RAZORPAY_WEBHOOK_SECRET && rawBody && signature) &&
    safeEqual(hmac(process.env.RAZORPAY_WEBHOOK_SECRET, rawBody), signature);

class RazorpayError extends Error {
    constructor(message, status) {
        super(message);
        this.name = 'RazorpayError';
        this.status = status;
    }
}

const request = async (method, path, body) => {
    const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
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
const createOrder = ({ amount, receipt, notes }) => request('POST', '/orders', {
    amount: toPaise(amount),
    currency: 'INR',
    receipt: String(receipt).slice(0, 40),
    notes
});

const fetchPayment = (paymentId) => request('GET', `/payments/${encodeURIComponent(paymentId)}`);

const capturePayment = (paymentId, amountPaise) => request('POST', `/payments/${encodeURIComponent(paymentId)}/capture`, {
    amount: amountPaise,
    currency: 'INR'
});

/** Full refund (or `amount` rupees) of a captured payment */
const refundPayment = (paymentId, { amount, notes } = {}) => request('POST', `/payments/${encodeURIComponent(paymentId)}/refund`, {
    ...(amount !== undefined && { amount: toPaise(amount) }),
    speed: 'normal',
    notes
});

module.exports = {
    isRazorpayConfigured,
    acceptsOnlineOrders,
    onlineOrderingMode,
    toPaise,
    verifyPaymentSignature,
    verifyWebhookSignature,
    createOrder,
    fetchPayment,
    capturePayment,
    refundPayment,
    RazorpayError
};
