const crypto = require('crypto');
const Bill = require('../models/bill.model');
const Sequence = require('../models/sequence.model');
const MenuItem = require('../models/menuItem.model');
const Customer = require('../models/customer.model');
const { isValidObjectId } = require('../middleware/validation');
const { sendBillReceipt, getWhatsappMode, getReceiptBaseUrl } = require('../config/whatsapp');
const {
    DEFAULT_COUNTER,
    round2,
    getBusinessSettings,
    computeTotals,
    getBusinessDate,
    getFinancialYear,
    normalizeIndianPhone
} = require('../utils/billing');

const PAYMENT_MODES = ['cash', 'upi', 'card'];
const MAX_LINES = 50;
const MAX_QUANTITY = 99;

const isValidDate = (date) => /^\d{4}-\d{2}-\d{2}$/.test(date);

const recordWhatsappResult = (bill, result) => {
    bill.receipt.whatsapp = {
        status: result.status,
        messageId: result.messageId,
        error: result.error,
        sentAt: result.status === 'sent' ? new Date() : undefined
    };
};

/**
 * POS settings for the counter screens
 */
module.exports.getSettings = async (req, res) => {
    try {
        const counters = await MenuItem.distinct('counter');

        res.status(200).json({
            success: true,
            settings: {
                ...getBusinessSettings(),
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
        const settings = getBusinessSettings();

        // Validate and merge order lines
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Add at least one item to the bill' });
        }
        if (items.length > MAX_LINES) {
            return res.status(400).json({ success: false, message: `A bill can have at most ${MAX_LINES} lines` });
        }

        const quantities = new Map();
        for (const line of items) {
            const quantity = Number(line?.quantity);
            if (!isValidObjectId(line?.itemId) || !Number.isInteger(quantity) || quantity < 1) {
                return res.status(400).json({ success: false, message: 'Each item needs a valid itemId and quantity' });
            }
            const merged = (quantities.get(line.itemId) || 0) + quantity;
            if (merged > MAX_QUANTITY) {
                return res.status(400).json({ success: false, message: `Quantity cannot exceed ${MAX_QUANTITY}` });
            }
            quantities.set(line.itemId, merged);
        }

        const menuItems = await MenuItem.find({ _id: { $in: [...quantities.keys()] } }).lean();
        const menuById = new Map(menuItems.map((menuItem) => [String(menuItem._id), menuItem]));

        const lines = [];
        for (const [itemId, quantity] of quantities) {
            const menuItem = menuById.get(itemId);
            if (!menuItem) {
                return res.status(400).json({ success: false, message: 'Some items are no longer on the menu' });
            }
            if (menuItem.isAvailable === false) {
                return res.status(400).json({ success: false, message: `${menuItem.name} is sold out` });
            }
            lines.push({
                itemId: menuItem._id,
                name: menuItem.name,
                price: menuItem.price,
                quantity,
                amount: round2(menuItem.price * quantity),
                counter: menuItem.counter || DEFAULT_COUNTER
            });
        }

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

        // Numbering: token resets daily, bill number runs per financial year
        const businessDate = getBusinessDate(new Date(), settings.timeZone);
        const financialYear = getFinancialYear(businessDate);
        const tokenNumber = await Sequence.next(`token:${businessDate}`);
        const billSeq = await Sequence.next(`bill:${financialYear}`);
        const billNumber = `${settings.billPrefix}/${financialYear}/${String(billSeq).padStart(6, '0')}`;

        const counters = [...new Set(lines.map((line) => line.counter))];

        const bill = new Bill({
            billNumber,
            tokenNumber,
            businessDate,
            publicId: crypto.randomBytes(12).toString('base64url'),
            items: lines,
            stations: counters.map((counter) => ({ counter })),
            ...totals,
            gstScheme: settings.gstScheme,
            gstRate: settings.gstScheme === 'regular' ? settings.gstRate : 0,
            pricesIncludeGst: settings.pricesIncludeGst,
            payment: billPayment,
            customer: billCustomer,
            source: ['counter', 'kiosk', 'qr'].includes(source) ? source : 'counter',
            createdBy: req.user?.id
        });

        await bill.save();

        console.log(`✅ Bill ${billNumber} created - token #${tokenNumber}, ₹${totals.total} (${payment.mode})`);

        // Remember the customer for next time (never blocks the bill)
        if (billCustomer.phone) {
            Customer.recordVisit(bill).catch((error) => {
                console.error('❌ Error recording customer visit:', error.message);
            });
        }

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
        console.error('❌ Error creating bill:', error);
        res.status(500).json({ success: false, message: 'Failed to create bill' });
    }
};

/**
 * List bills for a business day (default: today)
 */
module.exports.listBills = async (req, res) => {
    try {
        const settings = getBusinessSettings();
        const date = req.query.date || getBusinessDate(new Date(), settings.timeZone);

        if (!isValidDate(date)) {
            return res.status(400).json({ success: false, message: 'Date must be in YYYY-MM-DD format' });
        }

        const bills = await Bill.find({ businessDate: date })
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

        const bill = await Bill.findById(req.params.id).lean();
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
        const settings = getBusinessSettings();
        const counter = req.query.counter ? String(req.query.counter) : '';
        const businessDate = getBusinessDate(new Date(), settings.timeZone);

        const query = { businessDate, status: { $in: ['preparing', 'ready'] } };
        if (counter) {
            query.stations = { $elemMatch: { counter, status: { $ne: 'served' } } };
        }

        const bills = await Bill.find(query)
            .select('tokenNumber billNumber items stations status createdAt customer.name')
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

        const bill = await Bill.findById(req.params.id);
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

        stations.forEach((station) => applyStationStatus(station, status));
        bill.refreshStatus();
        await bill.save();

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

        const settings = getBusinessSettings();
        let bill;

        if (/^\d{1,6}$/.test(code)) {
            bill = await Bill.findOne({
                businessDate: getBusinessDate(new Date(), settings.timeZone),
                tokenNumber: Number(code)
            });
        } else {
            const publicId = code.match(/receipt\/([A-Za-z0-9_-]+)/)?.[1] || code;
            if (/^[A-Za-z0-9_-]{8,64}$/.test(publicId)) {
                bill = await Bill.findOne({ publicId });
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

        const bill = await Bill.findById(req.params.id);
        if (!bill) {
            return res.status(404).json({ success: false, message: 'Bill not found' });
        }
        if (bill.status === 'cancelled') {
            return res.status(409).json({ success: false, message: 'Bill is already cancelled' });
        }

        bill.status = 'cancelled';
        bill.cancelledAt = new Date();
        bill.cancelledBy = req.user?.id;
        bill.cancelReason = reason;
        await bill.save();

        console.log(`✅ Bill ${bill.billNumber} cancelled: ${reason}`);

        res.status(200).json({ success: true, message: 'Bill cancelled', bill });
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

        const bill = await Bill.findById(req.params.id);
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

        const whatsapp = await sendBillReceipt(bill, getBusinessSettings());
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

        const bill = await Bill.findByIdAndUpdate(
            req.params.id,
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
        const settings = getBusinessSettings();
        const date = req.query.date || getBusinessDate(new Date(), settings.timeZone);

        if (!isValidDate(date)) {
            return res.status(400).json({ success: false, message: 'Date must be in YYYY-MM-DD format' });
        }

        const bills = await Bill.find({ businessDate: date }).lean();
        const active = bills.filter((bill) => bill.status !== 'cancelled');

        const byMode = { cash: { count: 0, total: 0 }, upi: { count: 0, total: 0 }, card: { count: 0, total: 0 } };
        const itemsMap = new Map();
        const byHour = {};
        const counterSpeed = new Map();
        let taxableAmount = 0;
        let cgst = 0;
        let sgst = 0;
        let total = 0;

        for (const bill of active) {
            total += bill.total;
            taxableAmount += bill.taxableAmount;
            cgst += bill.cgst;
            sgst += bill.sgst;

            const mode = byMode[bill.payment.mode];
            mode.count += 1;
            mode.total += bill.total;

            const hour = new Intl.DateTimeFormat('en-GB', {
                timeZone: settings.timeZone,
                hour: '2-digit',
                hour12: false
            }).format(new Date(bill.createdAt));
            byHour[hour] = byHour[hour] || { count: 0, total: 0 };
            byHour[hour].count += 1;
            byHour[hour].total += bill.total;

            // Preparation time per food counter: billed -> marked ready
            for (const station of bill.stations) {
                if (!station.readyAt) continue;
                const minutes = (new Date(station.readyAt) - new Date(bill.createdAt)) / 60000;
                if (minutes < 0) continue;
                const entry = counterSpeed.get(station.counter) || { counter: station.counter, tokens: 0, totalMinutes: 0 };
                entry.tokens += 1;
                entry.totalMinutes += minutes;
                counterSpeed.set(station.counter, entry);
            }

            for (const item of bill.items) {
                const entry = itemsMap.get(item.name) || { name: item.name, quantity: 0, amount: 0 };
                entry.quantity += item.quantity;
                entry.amount += item.amount;
                itemsMap.set(item.name, entry);
            }
        }

        Object.values(byMode).forEach((mode) => { mode.total = round2(mode.total); });

        res.status(200).json({
            success: true,
            summary: {
                date,
                billCount: active.length,
                cancelledCount: bills.length - active.length,
                total: round2(total),
                taxableAmount: round2(taxableAmount),
                cgst: round2(cgst),
                sgst: round2(sgst),
                averageBill: active.length ? round2(total / active.length) : 0,
                byMode,
                byHour: Object.entries(byHour)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([hour, data]) => ({ hour, count: data.count, total: round2(data.total) })),
                items: [...itemsMap.values()]
                    .map((item) => ({ ...item, amount: round2(item.amount) }))
                    .sort((a, b) => b.quantity - a.quantity),
                counterSpeed: [...counterSpeed.values()]
                    .map(({ counter, tokens, totalMinutes }) => ({
                        counter,
                        tokens,
                        avgMinutes: Math.round((totalMinutes / tokens) * 10) / 10
                    }))
                    .sort((a, b) => b.avgMinutes - a.avgMinutes)
            }
        });
    } catch (error) {
        console.error('❌ Error building daily summary:', error);
        res.status(500).json({ success: false, message: 'Failed to build summary' });
    }
};

/**
 * Public: token display board (no money or personal data)
 */
module.exports.getDisplayBoard = async (req, res) => {
    try {
        const settings = getBusinessSettings();
        const businessDate = getBusinessDate(new Date(), settings.timeZone);

        const bills = await Bill.find({ businessDate, status: { $in: ['preparing', 'ready'] } })
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
            .select('-createdBy -cancelledBy -receipt -customer.phone -payment.reference')
            .lean();

        if (!bill) {
            return res.status(404).json({ success: false, message: 'Receipt not found' });
        }

        const settings = getBusinessSettings();

        res.status(200).json({
            success: true,
            bill,
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
