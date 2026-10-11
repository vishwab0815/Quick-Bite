/**
 * Platform console (QuickBite owner only): every hotel, its orders, income, menu and
 * subscription. All routes sit behind requireSuperadmin; every change is audit-logged.
 */

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Hotel = require('../models/hotel.model');
const Bill = require('../models/bill.model');
const MenuItem = require('../models/menuItem.model');
const Customer = require('../models/customer.model');
const User = require('../models/userauthentication.model');
const AuditLog = require('../models/auditLog.model');
const { isValidEmail, isValidPassword, isValidObjectId, sanitizeString } = require('../middleware/validation');
const { forgetCachedHotel } = require('../middleware/auth');
const { round2, getBusinessDate, shiftBusinessDate, slugify } = require('../utils/billing');
const { buildSummary, SUMMARY_FIELDS } = require('../utils/reports');

const { DAY_MS } = Hotel;
const PLATFORM_TIME_ZONE = 'Asia/Kolkata';
const TREND_DAYS = 30;
const EXPIRING_SOON_DAYS = 7;
const DEFAULT_TRIAL_DAYS = 14;
const PASSWORD_RULE = 'Password must be at least 8 characters with 1 uppercase, 1 lowercase and 1 number';
const PLANS = ['trial', 'monthly', 'yearly'];
const PAYMENT_METHODS = ['upi', 'bank', 'cash', 'card', 'other'];
const HOTEL_ROLES = ['admin', 'staff'];

const fail = (res, status, message) => res.status(status).json({ success: false, message });

const serverError = (res, label, error) => {
    console.error(`❌ Platform: ${label}:`, error);
    return fail(res, 500, `Failed to ${label}`);
};

/* ---------- helpers ---------- */

const subscriptionState = (hotel, now = Date.now()) => {
    const access = Hotel.accessStatus(hotel, new Date(now));
    const paidUntil = new Date(hotel.subscription.paidUntil).getTime();
    const daysLeft = Math.ceil((paidUntil - now) / DAY_MS);
    let state = 'active';
    if (hotel.status !== 'active') state = 'disabled';
    else if (!access.ok) state = 'expired';
    else if (paidUntil < now) state = 'grace';
    else if (daysLeft <= EXPIRING_SOON_DAYS) state = 'expiring';
    return { state, daysLeft, canBill: access.ok };
};

const trendStart = () => shiftBusinessDate(getBusinessDate(new Date(), PLATFORM_TIME_ZONE), -(TREND_DAYS - 1));

/** One entry per day for the last 30 days, filling days without orders with zeros */
const fillDays = (rows) => {
    const byDate = new Map(rows.map((row) => [row._id, row]));
    const start = trendStart();
    return Array.from({ length: TREND_DAYS }, (_, index) => {
        const date = shiftBusinessDate(start, index);
        const row = byDate.get(date);
        return { date, orders: row?.orders || 0, sales: round2(row?.sales || 0) };
    });
};

const paidOrders = { status: { $ne: 'cancelled' } };

/** Orders and sales per hotel: today, last 30 days, all time */
const statsByHotel = async (hotelIds) => {
    const today = getBusinessDate(new Date(), PLATFORM_TIME_ZONE);
    const match = { ...paidOrders, ...(hotelIds && { hotel: { $in: hotelIds } }) };

    const [recent, allTime] = await Promise.all([
        Bill.aggregate([
            { $match: { ...match, businessDate: { $gte: trendStart() } } },
            {
                $group: {
                    _id: '$hotel',
                    orders30: { $sum: 1 },
                    sales30: { $sum: '$total' },
                    ordersToday: { $sum: { $cond: [{ $eq: ['$businessDate', today] }, 1, 0] } },
                    salesToday: { $sum: { $cond: [{ $eq: ['$businessDate', today] }, '$total', 0] } }
                }
            }
        ]),
        Bill.aggregate([
            { $match: match },
            { $group: { _id: '$hotel', ordersAll: { $sum: 1 }, salesAll: { $sum: '$total' }, lastOrderAt: { $max: '$createdAt' } } }
        ])
    ]);

    const stats = new Map();
    const entry = (id) => {
        const key = String(id);
        if (!stats.has(key)) {
            stats.set(key, { ordersToday: 0, salesToday: 0, orders30: 0, sales30: 0, ordersAll: 0, salesAll: 0, lastOrderAt: null });
        }
        return stats.get(key);
    };
    recent.forEach(({ _id, ...row }) => Object.assign(entry(_id), row));
    allTime.forEach(({ _id, ...row }) => Object.assign(entry(_id), row));
    stats.forEach((row) => ['salesToday', 'sales30', 'salesAll'].forEach((field) => { row[field] = round2(row[field]); }));
    return stats;
};

const EMPTY_STATS = { ordersToday: 0, salesToday: 0, orders30: 0, sales30: 0, ordersAll: 0, salesAll: 0, lastOrderAt: null };

const hotelSummary = (hotel, stats) => ({
    _id: hotel._id,
    name: hotel.name,
    slug: hotel.slug,
    status: hotel.status,
    statusReason: hotel.statusReason,
    city: hotel.settings?.address || '',
    subscription: { ...hotel.subscription, ...subscriptionState(hotel) },
    createdAt: hotel.createdAt,
    stats: stats || EMPTY_STATS
});

const loadHotel = async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
        fail(res, 404, 'Hotel not found');
        return null;
    }
    const hotel = await Hotel.findById(req.params.id);
    if (!hotel) fail(res, 404, 'Hotel not found');
    return hotel;
};

/**
 * Validate editable hotel settings. Only known fields are accepted.
 * @returns {{ value?: object, error?: string }}
 */
const parseSettings = (input = {}) => {
    const value = {};
    const text = (field, max) => {
        if (input[field] === undefined) return null;
        if (typeof input[field] !== 'string') return `${field} must be text`;
        const clean = sanitizeString(input[field]);
        if (clean.length > max) return `${field} must be at most ${max} characters`;
        value[field] = clean;
        return null;
    };
    const textFields = { address: 200, phone: 20, hours: 60, gstin: 15, sacCode: 10, upiVpa: 80, upiPayeeName: 80, receiptFooter: 160, billPrefix: 6 };
    for (const [field, max] of Object.entries(textFields)) {
        const error = text(field, max);
        if (error) return { error };
    }
    if (value.upiVpa && !/^[\w.-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,64}$/.test(value.upiVpa)) {
        return { error: 'UPI ID looks wrong (example: hotelname@okaxis)' };
    }
    if (value.gstin && !/^[0-9A-Z]{15}$/i.test(value.gstin)) {
        return { error: 'GSTIN must be 15 letters / digits' };
    }
    if (value.billPrefix !== undefined && !/^[A-Za-z0-9]{1,6}$/.test(value.billPrefix)) {
        return { error: 'Bill prefix must be 1 to 6 letters or digits' };
    }
    if (input.gstScheme !== undefined) {
        if (!['regular', 'composition'].includes(input.gstScheme)) return { error: 'GST scheme must be regular or composition' };
        value.gstScheme = input.gstScheme;
    }
    if (input.gstRate !== undefined) {
        const rate = Number(input.gstRate);
        if (!Number.isFinite(rate) || rate < 0 || rate > 28) return { error: 'GST rate must be between 0 and 28' };
        value.gstRate = rate;
    }
    if (input.receiptPaperWidth !== undefined) {
        const width = Number(input.receiptPaperWidth);
        if (![58, 80].includes(width)) return { error: 'Paper width must be 58 or 80 mm' };
        value.receiptPaperWidth = width;
    }
    for (const field of ['pricesIncludeGst', 'printCounterCoupons']) {
        if (input[field] !== undefined) {
            if (typeof input[field] !== 'boolean') return { error: `${field} must be true or false` };
            value[field] = input[field];
        }
    }
    return { value };
};

const parseName = (name) => {
    const clean = sanitizeString(name);
    return clean.length >= 2 && clean.length <= 80 ? clean : null;
};

const parseSlug = (slug) => {
    const clean = slugify(slug);
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(clean) && clean.length <= 60 ? clean : null;
};

const parseFee = (fee) => {
    const value = Number(fee);
    return Number.isFinite(value) && value >= 0 && value <= 1000000 ? round2(value) : null;
};

/* ---------- overview ---------- */

module.exports.getOverview = async (req, res) => {
    try {
        const now = Date.now();
        const [hotels, stats, daily, collected] = await Promise.all([
            Hotel.find().select('name slug status statusReason settings.address subscription createdAt').lean(),
            statsByHotel(),
            Bill.aggregate([
                { $match: { ...paidOrders, businessDate: { $gte: trendStart() } } },
                { $group: { _id: '$businessDate', orders: { $sum: 1 }, sales: { $sum: '$total' } } }
            ]),
            Hotel.aggregate([
                { $unwind: '$payments' },
                { $match: { 'payments.paidOn': { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } },
                { $group: { _id: null, amount: { $sum: '$payments.amount' }, count: { $sum: 1 } } }
            ])
        ]);

        const summaries = hotels.map((hotel) => hotelSummary(hotel, stats.get(String(hotel._id))));
        const count = (state) => summaries.filter((hotel) => hotel.subscription.state === state).length;
        const totals = summaries.reduce((sum, hotel) => ({
            ordersToday: sum.ordersToday + hotel.stats.ordersToday,
            salesToday: sum.salesToday + hotel.stats.salesToday,
            orders30: sum.orders30 + hotel.stats.orders30,
            sales30: sum.sales30 + hotel.stats.sales30
        }), { ordersToday: 0, salesToday: 0, orders30: 0, sales30: 0 });

        // Monthly recurring revenue: what paying, working hotels are worth per month
        const mrr = summaries
            .filter((hotel) => hotel.subscription.canBill && hotel.subscription.plan !== 'trial')
            .reduce((sum, hotel) => sum + (hotel.subscription.monthlyFee || 0), 0);

        const attention = summaries
            .filter((hotel) => ['expired', 'grace', 'expiring', 'disabled'].includes(hotel.subscription.state))
            .sort((a, b) => new Date(a.subscription.paidUntil) - new Date(b.subscription.paidUntil));

        res.status(200).json({
            success: true,
            generatedAt: new Date(now),
            hotels: {
                total: hotels.length,
                active: count('active') + count('expiring') + count('grace'),
                expiring: count('expiring') + count('grace'),
                expired: count('expired'),
                disabled: count('disabled'),
                trial: summaries.filter((hotel) => hotel.subscription.plan === 'trial' && hotel.subscription.canBill).length
            },
            revenue: {
                mrr: round2(mrr),
                collectedThisMonth: round2(collected[0]?.amount || 0),
                paymentsThisMonth: collected[0]?.count || 0
            },
            orders: { ...totals, salesToday: round2(totals.salesToday), sales30: round2(totals.sales30) },
            daily: fillDays(daily),
            topHotels: [...summaries].sort((a, b) => b.stats.sales30 - a.stats.sales30).slice(0, 5),
            attention
        });
    } catch (error) {
        return serverError(res, 'load the overview', error);
    }
};

/* ---------- hotels ---------- */

module.exports.listHotels = async (req, res) => {
    try {
        const [hotels, stats] = await Promise.all([
            Hotel.find().select('name slug status statusReason settings.address subscription createdAt').sort({ createdAt: -1 }).lean(),
            statsByHotel()
        ]);
        res.status(200).json({ success: true, hotels: hotels.map((hotel) => hotelSummary(hotel, stats.get(String(hotel._id)))) });
    } catch (error) {
        return serverError(res, 'list hotels', error);
    }
};

/**
 * Add a hotel together with its owner login
 */
module.exports.createHotel = async (req, res) => {
    let hotel = null;
    try {
        const { owner = {} } = req.body;
        const name = parseName(req.body.name);
        if (!name) return fail(res, 400, 'Hotel name must be 2 to 80 characters');

        const slug = parseSlug(req.body.slug || name);
        if (!slug) return fail(res, 400, 'The web address may only use letters, numbers and dashes');

        const ownerName = sanitizeString(owner.name);
        const ownerEmail = String(owner.email || '').trim().toLowerCase();
        if (ownerName.length < 2 || ownerName.length > 60) return fail(res, 400, 'Owner name must be 2 to 60 characters');
        if (!isValidEmail(ownerEmail)) return fail(res, 400, 'Enter a valid owner email / login ID');
        if (!isValidPassword(owner.password)) return fail(res, 400, PASSWORD_RULE);

        const plan = req.body.plan || 'trial';
        if (!PLANS.includes(plan)) return fail(res, 400, 'Plan must be trial, monthly or yearly');
        const monthlyFee = parseFee(req.body.monthlyFee ?? 0);
        if (monthlyFee === null) return fail(res, 400, 'Monthly fee must be a positive amount');
        const trialDays = Number(req.body.trialDays ?? DEFAULT_TRIAL_DAYS);
        if (!Number.isInteger(trialDays) || trialDays < 0 || trialDays > 90) return fail(res, 400, 'Free days must be 0 to 90');

        const { value: settings, error } = parseSettings(req.body.settings);
        if (error) return fail(res, 400, error);

        if (await Hotel.exists({ slug })) return fail(res, 409, `The web address "${slug}" is already used by another hotel`);
        if (await User.exists({ email: ownerEmail })) return fail(res, 409, 'An account with this owner email already exists');

        hotel = await Hotel.create({
            name,
            slug,
            settings: { upiPayeeName: name, ...settings },
            subscription: { plan, monthlyFee, paidUntil: new Date(Date.now() + trialDays * DAY_MS) },
            createdBy: req.user.id
        });

        const ownerUser = await User.create({
            name: ownerName,
            email: ownerEmail,
            password: await bcrypt.hash(owner.password, 12),
            role: 'admin',
            hotel: hotel._id
        });

        AuditLog.record(req, 'hotel.create', { hotel, details: { slug, owner: ownerEmail, plan, monthlyFee, trialDays } });
        console.log(`✅ Hotel created: ${hotel.name} (${slug}) - owner ${ownerEmail}`);

        res.status(201).json({
            success: true,
            hotel: hotelSummary(hotel.toObject()),
            owner: { _id: ownerUser._id, name: ownerUser.name, email: ownerUser.email }
        });
    } catch (error) {
        // No half-created hotels: remove it if the owner login could not be created
        if (hotel) await Hotel.deleteOne({ _id: hotel._id }).catch(() => {});
        if (error?.code === 11000) return fail(res, 409, 'That hotel address or owner email is already taken');
        return serverError(res, 'create the hotel', error);
    }
};

/**
 * Everything about one hotel: details, subscription, orders, income, payment mix, best sellers
 */
module.exports.getHotel = async (req, res) => {
    try {
        const hotel = await loadHotel(req, res);
        if (!hotel) return;

        const hotelId = hotel._id;
        const timeZone = hotel.settings?.timeZone || PLATFORM_TIME_ZONE;
        const today = getBusinessDate(new Date(), timeZone);
        const from = shiftBusinessDate(today, -(TREND_DAYS - 1));

        const [stats, daily, mix, topItems, todayBills, counts, owners] = await Promise.all([
            statsByHotel([hotelId]),
            Bill.aggregate([
                { $match: { hotel: hotelId, ...paidOrders, businessDate: { $gte: from } } },
                { $group: { _id: '$businessDate', orders: { $sum: 1 }, sales: { $sum: '$total' } } }
            ]),
            Bill.aggregate([
                { $match: { hotel: hotelId, ...paidOrders, businessDate: { $gte: from } } },
                { $group: { _id: '$payment.mode', orders: { $sum: 1 }, sales: { $sum: '$total' } } }
            ]),
            Bill.aggregate([
                { $match: { hotel: hotelId, ...paidOrders, businessDate: { $gte: from } } },
                { $unwind: '$items' },
                { $group: { _id: '$items.name', quantity: { $sum: '$items.quantity' }, amount: { $sum: '$items.amount' } } },
                { $sort: { quantity: -1 } },
                { $limit: 10 }
            ]),
            Bill.find({ hotel: hotelId, businessDate: today }).select(SUMMARY_FIELDS).lean(),
            Promise.all([
                MenuItem.countDocuments({ hotel: hotelId }),
                User.countDocuments({ hotel: hotelId, role: { $in: HOTEL_ROLES } }),
                Customer.countDocuments({ hotel: hotelId }),
                Bill.countDocuments({ hotel: hotelId, status: 'cancelled', businessDate: { $gte: from } })
            ]),
            User.find({ hotel: hotelId, role: 'admin' }).select('name email').lean()
        ]);

        const plain = hotel.toObject();
        plain.payments = [...(plain.payments || [])].sort((a, b) => new Date(b.paidOn) - new Date(a.paidOn));

        res.status(200).json({
            success: true,
            hotel: { ...plain, subscription: { ...plain.subscription, ...subscriptionState(plain) } },
            owners,
            stats: stats.get(String(hotelId)) || EMPTY_STATS,
            today: buildSummary(today, todayBills, timeZone),
            daily: fillDays(daily),
            paymentMix: ['cash', 'upi', 'card'].map((mode) => {
                const row = mix.find((entry) => entry._id === mode);
                return { mode, orders: row?.orders || 0, sales: round2(row?.sales || 0) };
            }),
            topItems: topItems.map((item) => ({ name: item._id, quantity: item.quantity, amount: round2(item.amount) })),
            counts: { menuItems: counts[0], staff: counts[1], customers: counts[2], cancelled30: counts[3] }
        });
    } catch (error) {
        return serverError(res, 'load the hotel', error);
    }
};

/**
 * Edit hotel details, settings and plan
 */
module.exports.updateHotel = async (req, res) => {
    try {
        const hotel = await loadHotel(req, res);
        if (!hotel) return;
        const changes = {};

        if (req.body.name !== undefined) {
            const name = parseName(req.body.name);
            if (!name) return fail(res, 400, 'Hotel name must be 2 to 80 characters');
            hotel.name = name;
            changes.name = name;
        }
        if (req.body.slug !== undefined) {
            const slug = parseSlug(req.body.slug);
            if (!slug) return fail(res, 400, 'The web address may only use letters, numbers and dashes');
            if (slug !== hotel.slug && await Hotel.exists({ slug })) return fail(res, 409, `"${slug}" is already used by another hotel`);
            hotel.slug = slug;
            changes.slug = slug;
        }
        if (req.body.settings !== undefined) {
            const { value, error } = parseSettings(req.body.settings);
            if (error) return fail(res, 400, error);
            hotel.set({ settings: { ...hotel.settings.toObject(), ...value } });
            changes.settings = Object.keys(value);
        }
        const subscription = req.body.subscription || {};
        if (subscription.plan !== undefined) {
            if (!PLANS.includes(subscription.plan)) return fail(res, 400, 'Plan must be trial, monthly or yearly');
            hotel.subscription.plan = subscription.plan;
            changes.plan = subscription.plan;
        }
        if (subscription.monthlyFee !== undefined) {
            const fee = parseFee(subscription.monthlyFee);
            if (fee === null) return fail(res, 400, 'Monthly fee must be a positive amount');
            hotel.subscription.monthlyFee = fee;
            changes.monthlyFee = fee;
        }
        if (subscription.graceDays !== undefined) {
            const days = Number(subscription.graceDays);
            if (!Number.isInteger(days) || days < 0 || days > 30) return fail(res, 400, 'Grace days must be 0 to 30');
            hotel.subscription.graceDays = days;
            changes.graceDays = days;
        }
        if (subscription.paidUntil !== undefined) {
            const date = new Date(subscription.paidUntil);
            if (Number.isNaN(date.getTime())) return fail(res, 400, 'Paid-until date is not valid');
            hotel.subscription.paidUntil = date;
            changes.paidUntil = date;
        }

        await hotel.save();
        forgetCachedHotel(hotel._id);
        AuditLog.record(req, 'hotel.update', { hotel, details: changes });

        res.status(200).json({ success: true, hotel: hotelSummary(hotel.toObject()) });
    } catch (error) {
        if (error?.name === 'ValidationError') return fail(res, 400, Object.values(error.errors)[0]?.message || 'Invalid details');
        return serverError(res, 'update the hotel', error);
    }
};

/**
 * Enable or disable a hotel. Disabled hotels are signed out within 15 seconds and cannot bill.
 */
module.exports.setHotelStatus = async (req, res) => {
    try {
        const hotel = await loadHotel(req, res);
        if (!hotel) return;

        const { status } = req.body;
        if (!['active', 'disabled'].includes(status)) return fail(res, 400, 'Status must be active or disabled');
        const reason = sanitizeString(req.body.reason).slice(0, 200);
        if (status === 'disabled' && !reason) return fail(res, 400, 'Give a reason for disabling this hotel');

        hotel.status = status;
        hotel.statusReason = status === 'disabled' ? reason : '';
        await hotel.save();
        forgetCachedHotel(hotel._id);

        AuditLog.record(req, status === 'active' ? 'hotel.enable' : 'hotel.disable', { hotel, details: { reason } });
        console.log(`✅ Hotel ${hotel.name} ${status === 'active' ? 'enabled' : `disabled: ${reason}`}`);

        res.status(200).json({ success: true, hotel: hotelSummary(hotel.toObject()) });
    } catch (error) {
        return serverError(res, 'change the hotel status', error);
    }
};

const addMonths = (date, months) => {
    const result = new Date(date);
    const day = result.getDate();
    result.setMonth(result.getMonth() + months);
    // 31 Jan + 1 month -> 28/29 Feb, not 3 Mar
    if (result.getDate() < day) result.setDate(0);
    return result;
};

/**
 * Record a subscription payment - extends the paid period by the months paid for
 */
module.exports.recordPayment = async (req, res) => {
    try {
        const hotel = await loadHotel(req, res);
        if (!hotel) return;

        const amount = parseFee(req.body.amount);
        const months = Number(req.body.months);
        const method = req.body.method || 'upi';
        if (amount === null || amount <= 0) return fail(res, 400, 'Enter the amount received');
        if (!Number.isInteger(months) || months < 1 || months > 36) return fail(res, 400, 'Months must be 1 to 36');
        if (!PAYMENT_METHODS.includes(method)) return fail(res, 400, 'Payment method is not valid');

        // A renewal continues from the current paid date; a lapsed hotel starts from today
        const periodStart = new Date(Math.max(new Date(hotel.subscription.paidUntil).getTime(), Date.now()));
        const periodEnd = addMonths(periodStart, months);

        hotel.payments.push({
            amount,
            months,
            method,
            reference: sanitizeString(req.body.reference).slice(0, 80),
            note: sanitizeString(req.body.note).slice(0, 200),
            paidOn: new Date(),
            periodStart,
            periodEnd,
            recordedBy: req.user.id
        });
        hotel.subscription.paidUntil = periodEnd;
        if (hotel.subscription.plan === 'trial') hotel.subscription.plan = months >= 12 ? 'yearly' : 'monthly';
        if (!hotel.subscription.monthlyFee) hotel.subscription.monthlyFee = round2(amount / months);
        await hotel.save();
        forgetCachedHotel(hotel._id);

        AuditLog.record(req, 'payment.record', { hotel, details: { amount, months, method, paidUntil: periodEnd } });
        console.log(`✅ Payment ₹${amount} recorded for ${hotel.name} - paid until ${periodEnd.toISOString().slice(0, 10)}`);

        res.status(201).json({ success: true, hotel: hotelSummary(hotel.toObject()) });
    } catch (error) {
        return serverError(res, 'record the payment', error);
    }
};

/**
 * A hotel's bills for one day, with the day's summary
 */
module.exports.getHotelBills = async (req, res) => {
    try {
        const hotel = await loadHotel(req, res);
        if (!hotel) return;

        const timeZone = hotel.settings?.timeZone || PLATFORM_TIME_ZONE;
        const date = req.query.date || getBusinessDate(new Date(), timeZone);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail(res, 400, 'Date must be in YYYY-MM-DD format');

        const bills = await Bill.find({ hotel: hotel._id, businessDate: date })
            // Customers' phone numbers stay private to the hotel
            .select('-customer.phone -payment.reference -receipt -createdBy -cancelledBy')
            .sort({ tokenNumber: -1 })
            .limit(1000)
            .lean();

        res.status(200).json({ success: true, date, bills, summary: buildSummary(date, bills, timeZone) });
    } catch (error) {
        return serverError(res, 'load bills', error);
    }
};

module.exports.getHotelMenu = async (req, res) => {
    try {
        const hotel = await loadHotel(req, res);
        if (!hotel) return;
        const items = await MenuItem.find({ hotel: hotel._id })
            .select('name price counter category isVeg isAvailable')
            .sort({ counter: 1, sortOrder: 1, name: 1 })
            .lean();
        res.status(200).json({ success: true, items });
    } catch (error) {
        return serverError(res, 'load the menu', error);
    }
};

module.exports.getHotelStaff = async (req, res) => {
    try {
        const hotel = await loadHotel(req, res);
        if (!hotel) return;
        const staff = await User.find({ hotel: hotel._id, role: { $in: HOTEL_ROLES } })
            .select('name email role createdAt')
            .sort({ role: 1, name: 1 })
            .lean();
        res.status(200).json({ success: true, staff });
    } catch (error) {
        return serverError(res, 'load staff', error);
    }
};

/**
 * Reset a hotel login's password (e.g. the owner forgot it)
 */
module.exports.resetStaffPassword = async (req, res) => {
    try {
        const hotel = await loadHotel(req, res);
        if (!hotel) return;
        if (!isValidObjectId(req.params.userId)) return fail(res, 404, 'Login not found');
        if (!isValidPassword(req.body.password)) return fail(res, 400, PASSWORD_RULE);

        const user = await User.findOne({ _id: req.params.userId, hotel: hotel._id, role: { $in: HOTEL_ROLES } });
        if (!user) return fail(res, 404, 'Login not found');

        user.password = await bcrypt.hash(req.body.password, 12);
        await user.save();

        AuditLog.record(req, 'login.password_reset', { hotel, details: { email: user.email, role: user.role } });
        res.status(200).json({ success: true, message: `Password updated for ${user.name}` });
    } catch (error) {
        return serverError(res, 'reset the password', error);
    }
};

/* ---------- payments & audit ---------- */

module.exports.listPayments = async (req, res) => {
    try {
        const payments = await Hotel.aggregate([
            { $unwind: '$payments' },
            { $sort: { 'payments.paidOn': -1 } },
            { $limit: 300 },
            {
                $project: {
                    _id: '$payments._id',
                    hotelId: '$_id',
                    hotelName: '$name',
                    amount: '$payments.amount',
                    months: '$payments.months',
                    method: '$payments.method',
                    reference: '$payments.reference',
                    note: '$payments.note',
                    paidOn: '$payments.paidOn',
                    periodEnd: '$payments.periodEnd'
                }
            }
        ]);
        res.status(200).json({ success: true, payments });
    } catch (error) {
        return serverError(res, 'list payments', error);
    }
};

module.exports.listAudit = async (req, res) => {
    try {
        const filter = {};
        if (req.query.hotel) {
            if (!isValidObjectId(req.query.hotel)) return fail(res, 400, 'Invalid hotel');
            filter.hotel = new mongoose.Types.ObjectId(String(req.query.hotel));
        }
        const entries = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(200).lean();
        res.status(200).json({ success: true, entries });
    } catch (error) {
        return serverError(res, 'load the audit log', error);
    }
};
