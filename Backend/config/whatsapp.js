/**
 * WhatsApp messages to customers
 *
 * Two modes:
 * 1. Cloud API (automatic) - the platform's WhatsApp Business number sends approved "Utility"
 *    template messages for every restaurant (the restaurant's name is in the message):
 *    - the order confirmation / bill, as soon as it is paid (bill template)
 *    - "your order is ready" when every counter has marked it ready (ready template, optional)
 *    Set up in the console (WhatsApp page; secrets stored encrypted), or - older setup - with
 *    WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_TEMPLATE_NAME, WHATSAPP_READY_TEMPLATE,
 *    WHATSAPP_APP_SECRET and WHATSAPP_VERIFY_TOKEN in the environment. The console wins.
 *    Delivery / read receipts arrive on the webhook /pos/whatsapp/webhook.
 * 2. Click-to-chat link (free fallback) - when the Cloud API is not set up (or fails), the
 *    counter gets a wa.me link with the receipt text pre-filled.
 *
 * Templates to create in Meta WhatsApp Manager (category "Utility", language English):
 *   order_receipt  🙏 Namaskara {{1}}!
 *
 *                  Your order at *{{2}}* is confirmed.
 *
 *                  🎟️ Token: *{{3}}*
 *                  🍽️ {{4}}
 *                  💰 {{5}}
 *
 *                  Track your order live: {{6}}
 *
 *                  Show your token at the counter to collect.
 *   order_ready    🔔 {{1}}, your order at *{{2}}* is ready!
 *
 *                  Token *{{3}}* - please collect it from {{4}}.
 *
 *                  Enjoy your meal 🙏
 */

const crypto = require('crypto');

/* ---------- Settings: from the console (kept in memory, refreshed) or the environment ---------- */

let stored = null;

/** Settings saved in the console (decrypted); null to fall back to the environment */
const useStoredSettings = (settings) => {
    stored = settings;
};

const settingsFromEnv = () => ({
    accessToken: process.env.WHATSAPP_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    receiptTemplate: process.env.WHATSAPP_TEMPLATE_NAME || '',
    readyTemplate: process.env.WHATSAPP_READY_TEMPLATE || '',
    language: process.env.WHATSAPP_TEMPLATE_LANG || 'en',
    appSecret: process.env.WHATSAPP_APP_SECRET || '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || '',
    source: 'environment'
});

/** The settings in use right now */
const current = () => (stored?.enabled && stored.accessToken && stored.phoneNumberId ? { ...stored, source: 'console' } : settingsFromEnv());

const isCloudApiConfigured = () => {
    const settings = current();
    return Boolean(settings.accessToken && settings.phoneNumberId && settings.receiptTemplate);
};

const getWhatsappMode = () => (isCloudApiConfigured() ? 'cloud' : 'link');

/* ---------- Message content ---------- */

const formatINR = (amount) => `₹${Number(amount).toFixed(2)}`;

const getReceiptBaseUrl = () => (process.env.PUBLIC_RECEIPT_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')[0]
    .trim()
    .replace(/\/+$/, '');

const getReceiptUrl = (bill) => `${getReceiptBaseUrl()}/receipt/${bill.publicId}`;

/** The customer's own order-tracking page (online orders) */
const getTrackingUrl = (orderPublicId) => `${getReceiptBaseUrl()}/order/${orderPublicId}`;

const MODE_LABEL = { cash: 'Cash', upi: 'UPI', card: 'Card' };

/** "2 x Masala Dose, 1 x Filter Coffee" - one line (template values cannot hold line breaks) */
const itemsSummary = (bill, max = 110) => {
    const parts = bill.items.map((item) => `${item.quantity} x ${item.name}`);
    let text = '';
    for (let index = 0; index < parts.length; index++) {
        const next = text ? `${text}, ${parts[index]}` : parts[index];
        if (next.length > max) return `${text} and ${parts.length - index} more`;
        text = next;
    }
    return text;
};

const paymentLine = (bill) => {
    if (bill.payment?.gateway === 'demo') return `${formatINR(bill.total)} (demo order, no payment)`;
    return `Paid ${formatINR(bill.total)}${MODE_LABEL[bill.payment?.mode] ? ` by ${MODE_LABEL[bill.payment.mode]}` : ''}`;
};

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

/* ---------- Cloud API ---------- */

const graphBase = () => `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || 'v23.0'}`;

const graphRequest = async (settings, method, path, body) => {
    const response = await fetch(`${graphBase()}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.accessToken}` },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(10000)
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) return data;
    const error = new Error(data?.error?.message || `WhatsApp API error (HTTP ${response.status})`);
    error.status = response.status;
    throw error;
};

/** Send one template message; returns the WhatsApp message id */
const sendTemplate = async ({ phone, template, parameters = [], language, settings = current() }) => {
    const data = await graphRequest(settings, 'POST', `/${settings.phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
            name: template,
            language: { code: language || settings.language || 'en' },
            ...(parameters.length && {
                components: [{ type: 'body', parameters: parameters.map((text) => ({ type: 'text', text: String(text) })) }]
            })
        }
    });
    return { messageId: data?.messages?.[0]?.id };
};

/** The values for the bill template ({{1}} to {{6}}, see the top of this file) */
const receiptParameters = (bill, settings, link) => [
    bill.customer?.name || 'there',
    settings.name,
    `#${bill.tokenNumber}`,
    itemsSummary(bill),
    paymentLine(bill),
    link || getReceiptUrl(bill)
];

/**
 * Send the order confirmation / bill on WhatsApp. `link` is where it points (the order
 * tracking page for online orders; the receipt otherwise).
 * Never throws - always returns a status plus a click-to-chat link as fallback.
 * @returns {{ status: 'sent'|'link'|'failed', link: string, messageId?: string, error?: string }}
 */
const sendBillReceipt = async (bill, settings, { link } = {}) => {
    const phone = bill.customer?.phone;
    if (!phone) {
        return { status: 'failed', link: null, error: 'Customer phone number is required' };
    }

    const chatLink = buildWhatsappLink(phone, buildReceiptText(bill, settings));

    if (!isCloudApiConfigured()) {
        return { status: 'link', link: chatLink };
    }

    try {
        const whatsapp = current();
        const { messageId } = await sendTemplate({ phone, template: whatsapp.receiptTemplate, parameters: receiptParameters(bill, settings, link), settings: whatsapp });
        console.log(`✅ WhatsApp receipt sent for bill ${bill.billNumber}`);
        return { status: 'sent', link: chatLink, messageId };
    } catch (error) {
        console.error(`❌ WhatsApp receipt failed for bill ${bill.billNumber}:`, error.message);
        return { status: 'failed', link: chatLink, error: error.message };
    }
};

/**
 * "Your order is ready" - sent once, when every counter on the bill has marked it ready.
 * Only with the Cloud API and a ready template; never throws.
 * @returns {Promise<{ status: 'sent'|'failed'|'skipped', messageId?: string, error?: string }>}
 */
const sendReadyNotice = async (bill, settings) => {
    const phone = bill.customer?.phone;
    const whatsapp = current();
    if (!phone || !isCloudApiConfigured() || !whatsapp.readyTemplate) return { status: 'skipped' };
    try {
        const { messageId } = await sendTemplate({
            phone,
            template: whatsapp.readyTemplate,
            settings: whatsapp,
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

/** Check an access token and phone number id with Meta: the number's name, or an error */
const checkConnection = async (settings) => {
    const data = await graphRequest(settings, 'GET', `/${encodeURIComponent(settings.phoneNumberId)}?fields=display_phone_number,verified_name,quality_rating`);
    return { displayNumber: data.display_phone_number, verifiedName: data.verified_name, quality: data.quality_rating };
};

/** Webhook handshake: Meta calls GET ?hub.mode=subscribe&hub.verify_token=...&hub.challenge=... */
const verifyWebhookHandshake = (query) => {
    const { verifyToken } = current();
    return Boolean(verifyToken && query['hub.mode'] === 'subscribe' && query['hub.verify_token'] === verifyToken);
};

/** Webhook body signature: X-Hub-Signature-256 = sha256=HMAC(raw body, app secret) */
const verifyWebhookSignature = (rawBody, header) => {
    const { appSecret } = current();
    if (!appSecret || !rawBody || !header) return false;
    const expected = `sha256=${crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;
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
    useStoredSettings,
    current,
    isCloudApiConfigured,
    getWhatsappMode,
    getReceiptBaseUrl,
    getReceiptUrl,
    getTrackingUrl,
    buildReceiptText,
    buildWhatsappLink,
    receiptParameters,
    sendTemplate,
    sendBillReceipt,
    sendReadyNotice,
    checkConnection,
    verifyWebhookHandshake,
    verifyWebhookSignature,
    statusUpdates
};
