/**
 * WhatsApp messages to customers
 *
 * Two modes:
 * 1. Cloud API (automatic) - set WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID and
 *    WHATSAPP_TEMPLATE_NAME. Sends approved "Utility" template messages:
 *    - the bill, as soon as it is paid (WHATSAPP_TEMPLATE_NAME)
 *    - "your token is ready" when the kitchen marks it ready (WHATSAPP_READY_TEMPLATE, optional)
 *    Delivery / read receipts arrive on the webhook (WHATSAPP_VERIFY_TOKEN, WHATSAPP_APP_SECRET).
 * 2. Click-to-chat link (free fallback) - when the Cloud API is not configured
 *    (or fails), the counter gets a wa.me link with the receipt text pre-filled,
 *    which opens the hotel's WhatsApp Business app in one tap.
 *
 * Templates to create in Meta WhatsApp Manager (category "Utility", language en):
 *   Bill  - Hi {{1}}, thank you for ordering at {{2}}! Your token number is {{3}}.
 *           Bill no: {{4}}, Amount paid: {{5}}. View your receipt: {{6}}
 *           Please show your token at the counter.
 *   Ready - Hi {{1}}, your order at {{2}} is ready! Token {{3}} - please collect it
 *           from {{4}}.
 */

const crypto = require('crypto');

const isCloudApiConfigured = () => Boolean(
    process.env.WHATSAPP_TOKEN &&
    process.env.WHATSAPP_PHONE_NUMBER_ID &&
    process.env.WHATSAPP_TEMPLATE_NAME
);

const getWhatsappMode = () => (isCloudApiConfigured() ? 'cloud' : 'link');

const formatINR = (amount) => `₹${Number(amount).toFixed(2)}`;

const getReceiptBaseUrl = () => (process.env.PUBLIC_RECEIPT_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')[0]
    .trim()
    .replace(/\/+$/, '');

const getReceiptUrl = (bill) => `${getReceiptBaseUrl()}/receipt/${bill.publicId}`;

/**
 * Plain-text receipt used for the click-to-chat link
 */
const buildReceiptText = (bill, settings) => {
    const lines = [
        `🧾 *${settings.name}*`,
        `Token: *#${bill.tokenNumber}*`,
        `Bill No: ${bill.billNumber}`,
        '',
        ...bill.items.map((item) => `${item.quantity} x ${item.name} - ${formatINR(item.amount)}`),
        '',
    ];

    if (bill.gstScheme === 'regular' && (bill.cgst > 0 || bill.sgst > 0)) {
        lines.push(`Taxable: ${formatINR(bill.taxableAmount)}`);
        lines.push(`CGST ${bill.gstRate / 2}%: ${formatINR(bill.cgst)}`);
        lines.push(`SGST ${bill.gstRate / 2}%: ${formatINR(bill.sgst)}`);
    }
    if (bill.roundOff) {
        lines.push(`Round off: ${formatINR(bill.roundOff)}`);
    }
    lines.push(`*Total: ${formatINR(bill.total)}* (${bill.payment.mode.toUpperCase()})`);
    lines.push('');
    lines.push(`View receipt: ${getReceiptUrl(bill)}`);
    lines.push(`Please show token #${bill.tokenNumber} at the counter.`);

    return lines.join('\n');
};

const buildWhatsappLink = (phone, text) => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

const graphUrl = () => {
    const version = process.env.WHATSAPP_API_VERSION || 'v23.0';
    return `https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
};

/** Send one template message; returns the WhatsApp message id */
const sendTemplate = async ({ phone, template, parameters }) => {
    const response = await fetch(graphUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: phone,
            type: 'template',
            template: {
                name: template,
                language: { code: process.env.WHATSAPP_TEMPLATE_LANG || 'en' },
                components: [{ type: 'body', parameters: parameters.map((text) => ({ type: 'text', text: String(text) })) }]
            }
        }),
        signal: AbortSignal.timeout(10000)
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok) return { messageId: body?.messages?.[0]?.id };
    throw new Error(body?.error?.message || `WhatsApp API error (HTTP ${response.status})`);
};

const sendTemplateMessage = (bill, settings, phone) => sendTemplate({
    phone,
    template: process.env.WHATSAPP_TEMPLATE_NAME,
    parameters: [
        bill.customer?.name || 'Customer',
        settings.name,
        `#${bill.tokenNumber}`,
        bill.billNumber,
        formatINR(bill.total),
        getReceiptUrl(bill)
    ]
});

/**
 * Send a bill receipt on WhatsApp.
 * Never throws - always returns a status plus a click-to-chat link as fallback.
 * @returns {{ status: 'sent'|'link'|'failed', link: string, messageId?: string, error?: string }}
 */
const sendBillReceipt = async (bill, settings) => {
    const phone = bill.customer?.phone;
    if (!phone) {
        return { status: 'failed', link: null, error: 'Customer phone number is required' };
    }

    const link = buildWhatsappLink(phone, buildReceiptText(bill, settings));

    if (!isCloudApiConfigured()) {
        return { status: 'link', link };
    }

    try {
        const { messageId } = await sendTemplateMessage(bill, settings, phone);
        console.log(`✅ WhatsApp receipt sent for bill ${bill.billNumber}`);
        return { status: 'sent', link, messageId };
    } catch (error) {
        console.error(`❌ WhatsApp receipt failed for bill ${bill.billNumber}:`, error.message);
        return { status: 'failed', link, error: error.message };
    }
};

/**
 * "Your token is ready" - sent once, when every counter on the bill has marked it ready.
 * Only with the Cloud API and a ready template; never throws.
 * @returns {Promise<{ status: 'sent'|'failed'|'skipped', messageId?: string, error?: string }>}
 */
const sendReadyNotice = async (bill, settings) => {
    const phone = bill.customer?.phone;
    if (!phone || !isCloudApiConfigured() || !process.env.WHATSAPP_READY_TEMPLATE) return { status: 'skipped' };
    try {
        const { messageId } = await sendTemplate({
            phone,
            template: process.env.WHATSAPP_READY_TEMPLATE,
            parameters: [
                bill.customer?.name || 'Customer',
                settings.name,
                `#${bill.tokenNumber}`,
                bill.stations.map((station) => station.counter).join(', ')
            ]
        });
        console.log(`✅ WhatsApp ready notice sent for token #${bill.tokenNumber}`);
        return { status: 'sent', messageId };
    } catch (error) {
        console.error(`❌ WhatsApp ready notice failed for token #${bill.tokenNumber}:`, error.message);
        return { status: 'failed', error: error.message };
    }
};

/** Webhook handshake: Meta calls GET ?hub.mode=subscribe&hub.verify_token=...&hub.challenge=... */
const verifyWebhookHandshake = (query) => Boolean(
    process.env.WHATSAPP_VERIFY_TOKEN &&
    query['hub.mode'] === 'subscribe' &&
    query['hub.verify_token'] === process.env.WHATSAPP_VERIFY_TOKEN
);

/** Webhook body signature: X-Hub-Signature-256 = sha256=HMAC(raw body, app secret) */
const verifyWebhookSignature = (rawBody, header) => {
    if (!process.env.WHATSAPP_APP_SECRET || !rawBody || !header) return false;
    const expected = `sha256=${crypto.createHmac('sha256', process.env.WHATSAPP_APP_SECRET).update(rawBody).digest('hex')}`;
    const a = Buffer.from(expected);
    const b = Buffer.from(String(header));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
};

/** Message status updates (sent / delivered / read / failed) from a webhook payload */
const statusUpdates = (payload) => (payload?.entry || [])
    .flatMap((entry) => entry.changes || [])
    .flatMap((change) => change.value?.statuses || [])
    .map((status) => ({
        messageId: status.id,
        status: status.status,
        at: status.timestamp ? new Date(Number(status.timestamp) * 1000) : new Date(),
        error: status.errors?.[0]?.title
    }));

module.exports = {
    getWhatsappMode,
    getReceiptBaseUrl,
    getReceiptUrl,
    buildReceiptText,
    buildWhatsappLink,
    sendBillReceipt,
    sendReadyNotice,
    verifyWebhookHandshake,
    verifyWebhookSignature,
    statusUpdates
};
