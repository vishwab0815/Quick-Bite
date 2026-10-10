/**
 * WhatsApp Receipt Service
 *
 * Two modes:
 * 1. Cloud API (automatic) - set WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID and
 *    WHATSAPP_TEMPLATE_NAME. Sends an approved "utility" template message.
 * 2. Click-to-chat link (free fallback) - when the Cloud API is not configured
 *    (or fails), the counter gets a wa.me link with the receipt text pre-filled,
 *    which opens the hotel's WhatsApp Business app in one tap.
 *
 * Template body (create in Meta WhatsApp Manager, category "Utility"):
 *   Hi {{1}}, thank you for ordering at {{2}}! Your token number is {{3}}.
 *   Bill no: {{4}}, Amount paid: {{5}}. View your receipt: {{6}}
 *   Please show your token at the counter.
 */

const https = require('https');

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

/**
 * POST JSON using the built-in https module (works on Node 16+)
 */
const postJson = (url, body, headers) => new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const request = https.request(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
            ...headers
        },
        timeout: 10000
    }, (response) => {
        let data = '';
        response.on('data', (chunk) => { data += chunk; });
        response.on('end', () => {
            let parsed = {};
            try {
                parsed = data ? JSON.parse(data) : {};
            } catch {
                parsed = { raw: data };
            }
            resolve({ status: response.statusCode, body: parsed });
        });
    });

    request.on('timeout', () => request.destroy(new Error('WhatsApp API request timed out')));
    request.on('error', reject);
    request.write(payload);
    request.end();
});

const sendTemplateMessage = async (bill, settings, phone) => {
    const version = process.env.WHATSAPP_API_VERSION || 'v23.0';
    const url = `https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const parameters = [
        bill.customer?.name || 'Customer',
        settings.name,
        `#${bill.tokenNumber}`,
        bill.billNumber,
        formatINR(bill.total),
        getReceiptUrl(bill)
    ].map((text) => ({ type: 'text', text: String(text) }));

    const response = await postJson(url, {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
            name: process.env.WHATSAPP_TEMPLATE_NAME,
            language: { code: process.env.WHATSAPP_TEMPLATE_LANG || 'en' },
            components: [{ type: 'body', parameters }]
        }
    }, {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`
    });

    if (response.status >= 200 && response.status < 300) {
        return { messageId: response.body?.messages?.[0]?.id };
    }

    throw new Error(response.body?.error?.message || `WhatsApp API error (HTTP ${response.status})`);
};

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

module.exports = {
    getWhatsappMode,
    getReceiptBaseUrl,
    getReceiptUrl,
    buildReceiptText,
    buildWhatsappLink,
    sendBillReceipt
};
