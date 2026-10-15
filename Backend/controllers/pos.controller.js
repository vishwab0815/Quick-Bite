const Bill = require('../models/bill.model');
const MenuItem = require('../models/menuItem.model');
const Hotel = require('../models/hotel.model');
const { isValidObjectId } = require('../middleware/validation');
const { buildSummary, SUMMARY_FIELDS } = require('../utils/reports');
const { OrderError, priceOrderLines, issueBill } = require('../utils/orders');
const { sendBillReceipt, sendReadyNotice, getWhatsappMode, getReceiptBaseUrl } = require('../config/whatsapp');
const razorpay = require('../config/razorpay');
const {
    DEFAULT_COUNTER,
    round2,
    getBusinessSettings,
    computeTotals,
    getBusinessDate,
    shiftBusinessDate,
    normalizeIndianPhone
} = require('../utils/billing');

const PAYMENT_MODES = ['cash', 'upi', 'card'];
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const isValidDate = (date) => /^\d{4}-\d{2}-\d{2}$/.test(date);

const recordWhatsappResult = (bill, result) => {
    bill.receipt.whatsapp = {
        status: result.status,
        messageId: result.messageId,
        error: result.error,
        sentAt: result.status === 'sent' ? new Date() : undefined
    };
};

const notifyReady = (bill, settings) => {
    sendReadyNotice(bill, settings)
        .then((result) => {
            if (result.status === 'skipped') return null;
            return Bill.updateOne({ _id: bill._id }, {
                $set: {
                    'receipt.readyNotice': {
                        status: result.status,
                        messageId: result.messageId,
                        error: result.error,
                        sentAt: new Date()
                    }
                }
            });
        })
        .catch((error) => console.error('❌ Error recording WhatsApp ready notice:', error.message));
};

/**
 * POS settings for the counter screens
 */
module.exports.getSettings = async (req, res) => {
    try {
        const counters = await MenuItem.distinct('counter', { hotel: req.hotelId });

        res.status(200).json({
            success: true,
            settings: {
                ...getBusinessSettings(req.hotel),
                isDemo: Boolean(req.hotel?.isDemo),
                counters: counters.length > 0 ? counters.sort() : [DEFAULT_COUNTER],
                whatsappMode: getWhatsappMode(),
                receiptBaseUrl: getReceiptBaseUrl()
            }
        });
    } catch (error) {
        console.error('❌ Error fetching POS settings:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch settings' });
    }
};

/**
 * Create a counter bill
 * Prices always come from the database, never from the client
 */
module.exports.createBill = async (req, res) => {
    try {
        const { items, payment = {}, customer = {}, sendWhatsapp = false, source = 'counter' } = req.body;
        const settings = getBusinessSettings(req.hotel);

        const lines = await priceOrderLines(req.hotelId, items);
        const totals = computeTotals(lines, settings);

        // Validate payment
        if (!PAYMENT_MODES.includes(payment.mode)) {
            return res.status(400).json({ success: false, message: 'Payment mode must be cash, upi or card' });
        }

        const billPayment = { mode: payment.mode };
        if (payment.mode === 'cash') {
            const cashReceived = payment.cashReceived === undefined || payment.cashReceived === null || payment.cashReceived === ''
                ? totals.total
                : Number(payment.cashReceived);

            if (!Number.isFinite(cashReceived) || cashReceived < totals.total) {
                return res.status(400).json({
                    success: false,
                    message: `Cash received must be at least ₹${totals.total}`
                });
            }
            billPayment.cashReceived = round2(cashReceived);
            billPayment.changeReturned = round2(cashReceived - totals.total);
        } else if (payment.reference) {
            billPayment.reference = String(payment.reference).trim().slice(0, 64);
        }

        // Validate customer (optional, needed only for WhatsApp)
        const billCustomer = {};
        if (customer.name) {
            billCustomer.name = String(customer.name).trim().replace(/[<>]/g, '').slice(0, 60);
        }
        if (customer.phone) {
            const phone = normalizeIndianPhone(customer.phone);
            if (!phone) {
                return res.status(400).json({ success: false, message: 'Enter a valid 10-digit mobile number' });
            }
            billCustomer.phone = phone;
        }
        if (sendWhatsapp && !billCustomer.phone) {
            return res.status(400).json({ success: false, message: 'Mobile number is required to send the WhatsApp receipt' });
        }

        const bill = await issueBill({
            hotelId: req.hotelId,
            settings,
            lines,
            totals,
            payment: billPayment,
            customer: billCustomer,
            source,
            createdBy: req.user?.id
        });
        const { tokenNumber } = bill;

        // Send after saving so the receipt link in the message always works
        let whatsapp = null;
        if (sendWhatsapp) {
            whatsapp = await sendBillReceipt(bill, settings);
            recordWhatsappResult(bill, whatsapp);
            await bill.save();
        }

        res.status(201).json({
            success: true,
            message: `Token #${tokenNumber} created`,
            bill,
            whatsapp
        });
    } catch (error) {
        if (error instanceof OrderError) {
            return res.status(error.status).json({ success: false, message: error.message });
        }
        console.error('❌ Error creating bill:', error);
        res.status(500).json({ success: false, message: 'Failed to create bill' });
    }
};

/**
 * List bills for a business day (default: today)
 */
module.exports.listBills = async (req, res) => {
    try {
        const settings = getBusinessSettings(req.hotel);
        const date = req.query.date || getBusinessDate(new Date(), settings.timeZone);

        if (!isValidDate(date)) {
            return res.status(400).json({ success: false, message: 'Date must be in YYYY-MM-DD format' });
        }

        const bills = await Bill.find({ hotel: req.hotelId, businessDate: date })
            .sort({ tokenNumber: -1 })
            .limit(1000)
            .lean();

        res.status(200).json({ success: true, date, count: bills.length, bills });
    } catch (error) {
        console.error('❌ Error listing bills:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch bills' });
    }
};

/**
 * Get a single bill
 */
module.exports.getBill = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid bill ID' });
        }

        const bill = await Bill.findOne({ _id: req.params.id, hotel: req.hotelId }).lean();
        if (!bill) {
            return res.status(404).json({ success: false, message: 'Bill not found' });
        }

        res.status(200).json({ success: true, bill });
    } catch (error) {
        console.error('❌ Error fetching bill:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch bill' });
    }
};

/**
 * Open tickets for the kitchen screen (optionally for one counter)
 */
module.exports.getKitchenTickets = async (req, res) => {
    try {
        const settings = getBusinessSettings(req.hotel);
        const counter = req.query.counter ? String(req.query.counter) : '';
        const businessDate = getBusinessDate(new Date(), settings.timeZone);

        const query = { hotel: req.hotelId, businessDate, status: { $in: ['preparing', 'ready'] } };
        if (counter) {
            query.stations = { $elemMatch: { counter, status: { $ne: 'served' } } };
        }

        const bills = await Bill.find(query)
            .select('tokenNumber billNumber items stations status createdAt customer.name source')
            .sort({ tokenNumber: 1 })
            .lean();

        const tickets = bills.map((bill) => ({
            ...bill,
            items: counter ? bill.items.filter((item) => item.counter === counter) : bill.items
        }));

        res.status(200).json({ success: true, businessDate, tickets });
    } catch (error) {
        console.error('❌ Error fetching kitchen tickets:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch kitchen tickets' });
    }
};

const applyStationStatus = (station, status) => {
    station.status = status;
    if (status === 'preparing') {
        station.readyAt = undefined;
        station.servedAt = undefined;
    }
    if (status === 'ready') {
        station.readyAt = new Date();
        station.servedAt = undefined;
    }
    if (status === 'served') {
        station.readyAt = station.readyAt || new Date();
        station.servedAt = new Date();
    }
};

/**
 * Update a counter's status on a bill (preparing -> ready -> served)
 */
module.exports.updateStation = async (req, res) => {
    try {
        const { counter, status } = req.body;

        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid bill ID' });
        }
        if (!['preparing', 'ready', 'served'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Status must be preparing, ready or served' });
        }

        const bill = await Bill.findOne({ _id: req.params.id, hotel: req.hotelId });
        if (!bill) {
            return res.status(404).json({ success: false, message: 'Bill not found' });
        }
        if (bill.status === 'cancelled') {
            return res.status(409).json({ success: false, message: 'This bill was cancelled' });
        }

        const stations = counter
            ? bill.stations.filter((station) => station.counter === counter)
            : bill.stations;

        if (stations.length === 0) {
            return res.status(404).json({ success: false, message: `Token #${bill.tokenNumber} has no items for ${counter}` });
        }

        const wasReady = bill.status !== 'preparing';
        stations.forEach((station) => applyStationStatus(station, status));
        bill.refreshStatus();
        await bill.save();

        // Tell the customer on WhatsApp the moment the whole order is ready (once, in the background)
        if (!wasReady && bill.status === 'ready' && bill.customer?.phone && !bill.receipt?.readyNotice?.status) {
            notifyReady(bill, getBusinessSettings(req.hotel));
        }

        res.status(200).json({ success: true, bill });
    } catch (error) {
        console.error('❌ Error updating station:', error);
        res.status(500).json({ success: false, message: 'Failed to update token' });
    }
};

/**
 * Serve a token by scanning its QR / typing the token number.
 * A token can be served only once per counter (prevents reuse).
 * Accepts: receipt URL from the printed QR, publicId, or today's token number
 */
module.exports.serveByCode = async (req, res) => {
    try {
        const { counter } = req.body;
        const code = String(req.body.code || '').trim();

        if (!code) {
            return res.status(400).json({ success: false, message: 'Scan a token or enter the token number' });
        }

        const settings = getBusinessSettings(req.hotel);
        let bill;

        if (/^\d{1,6}$/.test(code)) {
            bill = await Bill.findOne({
                hotel: req.hotelId,
                businessDate: getBusinessDate(new Date(), settings.timeZone),
                tokenNumber: Number(code)
            });
        } else {
            const publicId = code.match(/receipt\/([A-Za-z0-9_-]+)/)?.[1] || code;
            if (/^[A-Za-z0-9_-]{8,64}$/.test(publicId)) {
                bill = await Bill.findOne({ publicId, hotel: req.hotelId });
            }
        }

        if (!bill) {
            return res.status(404).json({ success: false, message: 'Token not found' });
        }
        if (bill.status === 'cancelled') {
            return res.status(409).json({ success: false, message: `Token #${bill.tokenNumber} was cancelled` });
        }

        const stations = counter
            ? bill.stations.filter((station) => station.counter === counter)
            : bill.stations;

        if (stations.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Token #${bill.tokenNumber} has no items for ${counter}`
            });
        }

        const pending = stations.filter((station) => station.status !== 'served');
        if (pending.length === 0) {
            return res.status(409).json({
                success: false,
                alreadyServed: true,
                message: `Token #${bill.tokenNumber} was already served`,
                servedAt: stations[0].servedAt
            });
        }

        pending.forEach((station) => applyStationStatus(station, 'served'));
        bill.refreshStatus();
        await bill.save();

        res.status(200).json({
            success: true,
            message: `Token #${bill.tokenNumber} served`,
            bill
        });
    } catch (error) {
        console.error('❌ Error serving token:', error);
        res.status(500).json({ success: false, message: 'Failed to serve token' });
    }
};

/**
 * Cancel a bill (admin only - protects against cash being pocketed after billing)
 */
module.exports.cancelBill = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid bill ID' });
        }

        const reason = String(req.body.reason || '').trim().slice(0, 200);
        if (!reason) {
            return res.status(400).json({ success: false, message: 'A reason is required to cancel a bill' });
        }

        const bill = await Bill.findOne({ _id: req.params.id, hotel: req.hotelId });
        if (!bill) {
            return res.status(404).json({ success: false, message: 'Bill not found' });
        }
        if (bill.status === 'cancelled') {
            return res.status(409).json({ success: false, message: 'Bill is already cancelled' });
        }

        // Paid online: give the money back through Razorpay before cancelling
        if (bill.payment?.gateway === 'razorpay' && bill.payment.gatewayPaymentId && !bill.payment.refund?.id) {
            try {
                const refund = await razorpay.refundPayment(bill.payment.gatewayPaymentId, {
                    notes: { bill: bill.billNumber, reason: reason.slice(0, 200) }
                });
                bill.payment.refund = { id: refund.id, status: refund.status, amount: refund.amount / 100, at: new Date() };
            } catch (error) {
                console.error(`❌ Refund failed for bill ${bill.billNumber}:`, error.message);
                return res.status(502).json({
                    success: false,
                    message: `The refund could not be started (${error.message}). The bill was not cancelled - please try again.`
                });
            }
        }

        bill.status = 'cancelled';
        bill.cancelledAt = new Date();
        bill.cancelledBy = req.user?.id;
        bill.cancelReason = reason;
        await bill.save();

        console.log(`✅ Bill ${bill.billNumber} cancelled: ${reason}`);

        res.status(200).json({
            success: true,
            message: bill.payment?.refund?.id ? `Bill cancelled - ₹${bill.payment.refund.amount} refunded to the customer` : 'Bill cancelled',
            bill
        });
    } catch (error) {
        console.error('❌ Error cancelling bill:', error);
        res.status(500).json({ success: false, message: 'Failed to cancel bill' });
    }
};

/**
 * Send / resend the WhatsApp receipt (optionally with a new phone number)
 */
module.exports.sendWhatsappReceipt = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid bill ID' });
        }

        const bill = await Bill.findOne({ _id: req.params.id, hotel: req.hotelId });
        if (!bill) {
            return res.status(404).json({ success: false, message: 'Bill not found' });
        }

        if (req.body.phone) {
            const phone = normalizeIndianPhone(req.body.phone);
            if (!phone) {
                return res.status(400).json({ success: false, message: 'Enter a valid 10-digit mobile number' });
            }
            bill.customer.phone = phone;
        }
        if (!bill.customer?.phone) {
            return res.status(400).json({ success: false, message: 'Mobile number is required' });
        }

        const whatsapp = await sendBillReceipt(bill, getBusinessSettings(req.hotel));
        recordWhatsappResult(bill, whatsapp);
        await bill.save();

        res.status(200).json({ success: true, whatsapp, bill });
    } catch (error) {
        console.error('❌ Error sending WhatsApp receipt:', error);
        res.status(500).json({ success: false, message: 'Failed to send WhatsApp receipt' });
    }
};

/**
 * Mark a bill's receipt as printed
 */
module.exports.markPrinted = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid bill ID' });
        }

        const bill = await Bill.findOneAndUpdate(
            { _id: req.params.id, hotel: req.hotelId },
            { 'receipt.printed': true },
            { new: true }
        ).lean();

        if (!bill) {
            return res.status(404).json({ success: false, message: 'Bill not found' });
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('❌ Error marking bill printed:', error);
        res.status(500).json({ success: false, message: 'Failed to update bill' });
    }
};

/**
 * Daily summary for the owner / shift closing
 */
module.exports.getDailySummary = async (req, res) => {
    try {
        const settings = getBusinessSettings(req.hotel);
        const date = req.query.date || getBusinessDate(new Date(), settings.timeZone);

        if (!isValidDate(date)) {
            return res.status(400).json({ success: false, message: 'Date must be in YYYY-MM-DD format' });
        }

        const bills = await Bill.find({ hotel: req.hotelId, businessDate: date }).select(SUMMARY_FIELDS).lean();

        res.status(200).json({ success: true, summary: buildSummary(date, bills, settings.timeZone) });
    } catch (error) {
        console.error('❌ Error building daily summary:', error);
        res.status(500).json({ success: false, message: 'Failed to build summary' });
    }
};

/**
 * Owner dashboard in one round trip: the day's bills, its summary and the
 * same weekday last week for comparison. While today is still running it is
 * compared with last week up to this time of day, not with last week's whole day.
 */
module.exports.getDashboard = async (req, res) => {
    try {
        const settings = getBusinessSettings(req.hotel);
        const today = getBusinessDate(new Date(), settings.timeZone);
        const date = req.query.date || today;

        if (!isValidDate(date)) {
            return res.status(400).json({ success: false, message: 'Date must be in YYYY-MM-DD format' });
        }

        const compareDate = shiftBusinessDate(date, -7);
        const compareQuery = { hotel: req.hotelId, businessDate: compareDate };
        if (date === today) compareQuery.createdAt = { $lte: new Date(Date.now() - WEEK_MS) };
        const [bills, compareBills] = await Promise.all([
            Bill.find({ hotel: req.hotelId, businessDate: date }).sort({ tokenNumber: -1 }).limit(1000).lean(),
            Bill.find(compareQuery).select(SUMMARY_FIELDS).lean()
        ]);

        res.status(200).json({
            success: true,
            date,
            bills,
            summary: buildSummary(date, bills, settings.timeZone),
            compare: buildSummary(compareDate, compareBills, settings.timeZone)
        });
    } catch (error) {
        console.error('❌ Error building dashboard:', error);
        res.status(500).json({ success: false, message: 'Failed to load the dashboard' });
    }
};

/* ---------- Public pages (no login): landing page, token TV, receipt link ---------- */

const PUBLIC_CACHE_MS = 15 * 1000;
const publicHotelCache = new Map();

/**
 * The hotel a public page belongs to: /pos/public/:slug/... for a hotel's own token TV, or the
 * showcase hotel for the public website (SHOWCASE_HOTEL slug, else the oldest active hotel).
 * Disabled or unpaid hotels are hidden. Cached briefly - token TVs poll every few seconds.
 */
const findPublicHotel = async (slug) => {
    const key = slug || '__showcase__';
    const entry = publicHotelCache.get(key);
    if (entry && entry.expiresAt > Date.now()) return entry.hotel;

    let hotel = null;
    if (slug) {
        hotel = /^[a-z0-9-]{1,60}$/.test(slug) ? await Hotel.findOne({ slug }).lean() : null;
    } else if (process.env.SHOWCASE_HOTEL) {
        hotel = await Hotel.findOne({ slug: process.env.SHOWCASE_HOTEL }).lean();
    } else {
        const candidates = await Hotel.find({ status: 'active' }).sort({ createdAt: 1 }).limit(10).lean();
        hotel = candidates.find((candidate) => Hotel.accessStatus(candidate).ok) || null;
    }
    if (hotel && !Hotel.accessStatus(hotel).ok) hotel = null;

    publicHotelCache.set(key, { hotel, expiresAt: Date.now() + PUBLIC_CACHE_MS });
    return hotel;
};

const notFound = (res) => res.status(404).json({ success: false, message: 'Restaurant not found' });

/**
 * Public: restaurant details + today's available menu (landing page / hotel page)
 */
module.exports.getPublicInfo = async (req, res) => {
    try {
        const hotel = await findPublicHotel(req.params.slug);
        if (!hotel) return notFound(res);

        const settings = getBusinessSettings(hotel);
        const menu = await MenuItem.find({ hotel: hotel._id, isAvailable: { $ne: false } })
            .select('name price category isVeg image')
            .sort({ sortOrder: 1, name: 1 })
            .lean();

        // Customers may cache this briefly - the menu rarely changes minute to minute
        res.set('Cache-Control', 'public, max-age=60');
        res.status(200).json({
            success: true,
            restaurant: {
                name: settings.name,
                slug: settings.slug,
                address: settings.address,
                phone: settings.phone,
                hours: settings.hours,
                pricesIncludeGst: settings.gstScheme === 'composition' || settings.pricesIncludeGst,
                onlineOrdering: razorpay.acceptsOnlineOrders(hotel)
            },
            menu
        });
    } catch (error) {
        console.error('❌ Error fetching public info:', error);
        res.status(500).json({ success: false, message: 'Failed to load restaurant details' });
    }
};

/**
 * Public: token display board (no money or personal data)
 */
module.exports.getDisplayBoard = async (req, res) => {
    try {
        const hotel = await findPublicHotel(req.params.slug);
        if (!hotel) return notFound(res);

        const settings = getBusinessSettings(hotel);
        const businessDate = getBusinessDate(new Date(), settings.timeZone);

        const bills = await Bill.find({ hotel: hotel._id, businessDate, status: { $in: ['preparing', 'ready'] } })
            .select('tokenNumber stations status')
            .sort({ tokenNumber: 1 })
            .lean();

        const preparing = [];
        const ready = [];

        for (const bill of bills) {
            const readyCounters = bill.stations
                .filter((station) => station.status === 'ready')
                .map((station) => station.counter);

            if (readyCounters.length > 0) {
                const readyAt = bill.stations
                    .filter((station) => station.status === 'ready' && station.readyAt)
                    .map((station) => new Date(station.readyAt).getTime());
                ready.push({
                    tokenNumber: bill.tokenNumber,
                    counters: readyCounters,
                    readyAt: readyAt.length ? new Date(Math.max(...readyAt)) : null
                });
            }
            if (bill.stations.some((station) => station.status === 'preparing')) {
                preparing.push(bill.tokenNumber);
            }
        }

        res.status(200).json({
            success: true,
            hotelName: settings.name,
            businessDate,
            preparing,
            ready
        });
    } catch (error) {
        console.error('❌ Error fetching display board:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch display board' });
    }
};

/**
 * Public: receipt page opened from the WhatsApp link / QR on the printed token
 */
module.exports.getPublicReceipt = async (req, res) => {
    try {
        const { publicId } = req.params;
        if (!/^[A-Za-z0-9_-]{8,64}$/.test(publicId)) {
            return res.status(404).json({ success: false, message: 'Receipt not found' });
        }

        const bill = await Bill.findOne({ publicId })
            .select('-createdBy -cancelledBy -receipt -customer.phone -payment.reference -payment.gatewayOrderId -payment.gatewayPaymentId -payment.refund.id')
            .lean();

        if (!bill) {
            return res.status(404).json({ success: false, message: 'Receipt not found' });
        }

        const settings = getBusinessSettings(await Hotel.findById(bill.hotel).lean());

        res.status(200).json({
            success: true,
            bill: { ...bill, hotel: undefined },
            settings: {
                name: settings.name,
                address: settings.address,
                phone: settings.phone,
                gstin: settings.gstin,
                sacCode: settings.sacCode,
                receiptFooter: settings.receiptFooter,
                receiptPaperWidth: settings.receiptPaperWidth,
                timeZone: settings.timeZone,
                receiptBaseUrl: getReceiptBaseUrl()
            }
        });
    } catch (error) {
        console.error('❌ Error fetching receipt:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch receipt' });
    }
};
