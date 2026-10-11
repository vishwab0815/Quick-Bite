/**
 * Billing helpers for the counter POS
 * Business settings, GST calculation, business dates and financial years
 */

const DEFAULT_COUNTER = 'Main Kitchen';

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Hotel / business settings, read from environment variables
 */
const getBusinessSettings = () => {
    const name = process.env.HOTEL_NAME || 'QuickBite';
    const gstRate = Number(process.env.GST_RATE ?? 5);

    return {
        name,
        address: process.env.HOTEL_ADDRESS || '',
        phone: process.env.HOTEL_PHONE || '',
        gstin: process.env.HOTEL_GSTIN || '',
        gstScheme: process.env.GST_SCHEME === 'composition' ? 'composition' : 'regular',
        gstRate: Number.isFinite(gstRate) && gstRate >= 0 ? gstRate : 5,
        // Menu prices are final by default - GST is shown on the bill but never added on top
        pricesIncludeGst: process.env.PRICES_INCLUDE_GST !== 'false',
        // Print one token slip per food counter with every bill
        printCounterCoupons: process.env.PRINT_COUNTER_COUPONS !== 'false',
        sacCode: process.env.HOTEL_SAC_CODE || '996331',
        upiVpa: process.env.UPI_VPA || '',
        upiPayeeName: process.env.UPI_PAYEE_NAME || name,
        receiptFooter: process.env.RECEIPT_FOOTER || 'Thank you! Please show your token at the counter.',
        receiptPaperWidth: process.env.RECEIPT_PAPER_WIDTH === '58' ? 58 : 80,
        billPrefix: process.env.BILL_PREFIX || 'QB',
        timeZone: process.env.BUSINESS_TIMEZONE || 'Asia/Kolkata',
    };
};

/**
 * Calculate bill totals from line items ({ price, quantity })
 * - regular scheme: CGST + SGST split equally (prices exclusive or inclusive of GST)
 * - composition scheme: no GST is charged to the customer (Bill of Supply)
 * Grand total is rounded to the nearest rupee with a round-off line
 */
const computeTotals = (lines, { gstScheme, gstRate, pricesIncludeGst }) => {
    const subtotal = round2(lines.reduce((sum, line) => sum + line.price * line.quantity, 0));

    let taxableAmount = subtotal;
    let cgst = 0;
    let sgst = 0;

    if (gstScheme === 'regular' && gstRate > 0) {
        if (pricesIncludeGst) {
            taxableAmount = round2((subtotal * 100) / (100 + gstRate));
            const tax = round2(subtotal - taxableAmount);
            cgst = round2(tax / 2);
            sgst = round2(tax - cgst);
        } else {
            cgst = round2((taxableAmount * gstRate) / 200);
            sgst = cgst;
        }
    }

    const gross = round2(taxableAmount + cgst + sgst);
    const total = Math.round(gross);
    const roundOff = round2(total - gross);

    return { subtotal, taxableAmount, cgst, sgst, roundOff, total };
};

/**
 * Business date (YYYY-MM-DD) in the hotel's time zone - tokens reset daily
 */
const getBusinessDate = (date = new Date(), timeZone = getBusinessSettings().timeZone) => {
    // en-CA formats dates as YYYY-MM-DD
    return new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date);
};

/**
 * Indian financial year (April - March) for a business date, e.g. "2026-27"
 */
const getFinancialYear = (businessDate) => {
    const [year, month] = businessDate.split('-').map(Number);
    const startYear = month >= 4 ? year : year - 1;
    return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
};

/**
 * Move a business date (YYYY-MM-DD) by a number of days, e.g. -7 for the same weekday last week
 */
const shiftBusinessDate = (businessDate, days) => {
    const date = new Date(`${businessDate}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
};

/**
 * Normalize an Indian mobile number to WhatsApp format (91XXXXXXXXXX)
 * Returns null when the number is not valid
 */
const normalizeIndianPhone = (phone) => {
    if (!phone) return null;
    let digits = String(phone).replace(/\D/g, '');

    if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    if (digits.length === 10) digits = `91${digits}`;

    return /^91[6-9]\d{9}$/.test(digits) ? digits : null;
};

module.exports = {
    DEFAULT_COUNTER,
    round2,
    getBusinessSettings,
    computeTotals,
    getBusinessDate,
    getFinancialYear,
    shiftBusinessDate,
    normalizeIndianPhone,
};
