const mongoose = require('mongoose');

/**
 * A restaurant on the platform (one tenant). Every bill, menu item, customer and
 * staff login belongs to exactly one hotel. The platform owner (superadmin)
 * enables / disables hotels and records subscription payments.
 */

// Days a hotel keeps working after its paid period ends, so a late payment doesn't stop the counter mid-rush
const DEFAULT_GRACE_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

const paymentSchema = new mongoose.Schema({
    amount: { type: Number, required: true, min: 0 },
    months: { type: Number, required: true, min: 1, max: 36 },
    method: { type: String, enum: ['upi', 'bank', 'cash', 'card', 'other'], default: 'upi' },
    reference: { type: String, trim: true, maxlength: 80 },
    note: { type: String, trim: true, maxlength: 200 },
    paidOn: { type: Date, default: Date.now },
    // Paid period this payment covers
    periodStart: Date,
    periodEnd: Date,
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user' }
}, { timestamps: true });

const hotelSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    // Public address of the hotel's token TV: /tv/<slug>
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug may contain only lowercase letters, numbers and dashes'],
        maxlength: 60
    },
    // Master switch - a disabled hotel cannot sign in or bill
    status: { type: String, enum: ['active', 'disabled'], default: 'active' },
    statusReason: { type: String, trim: true, maxlength: 200 },

    settings: {
        address: { type: String, trim: true, maxlength: 200, default: '' },
        phone: { type: String, trim: true, maxlength: 20, default: '' },
        hours: { type: String, trim: true, maxlength: 60, default: '' },
        gstin: { type: String, trim: true, uppercase: true, maxlength: 15, default: '' },
        gstScheme: { type: String, enum: ['regular', 'composition'], default: 'regular' },
        gstRate: { type: Number, min: 0, max: 28, default: 5 },
        pricesIncludeGst: { type: Boolean, default: true },
        printCounterCoupons: { type: Boolean, default: true },
        sacCode: { type: String, trim: true, maxlength: 10, default: '996331' },
        upiVpa: { type: String, trim: true, maxlength: 80, default: '' },
        upiPayeeName: { type: String, trim: true, maxlength: 80, default: '' },
        receiptFooter: { type: String, trim: true, maxlength: 160, default: 'Thank you! Please show your token at the counter.' },
        receiptPaperWidth: { type: Number, enum: [58, 80], default: 80 },
        billPrefix: { type: String, trim: true, uppercase: true, maxlength: 6, default: 'QB' },
        timeZone: { type: String, default: 'Asia/Kolkata' }
    },

    subscription: {
        plan: { type: String, enum: ['trial', 'monthly', 'yearly'], default: 'trial' },
        // Agreed price per month, in rupees (used for revenue / MRR figures)
        monthlyFee: { type: Number, min: 0, default: 0 },
        paidUntil: { type: Date, required: true },
        graceDays: { type: Number, min: 0, max: 30, default: DEFAULT_GRACE_DAYS }
    },
    payments: [paymentSchema],

    // The public client demo restaurant (one-click sign-in, sample data that resets itself)
    isDemo: { type: Boolean, default: false },
    // Simulated UPI payments: customers get a real-looking UPI QR / payment link with a Pay button,
    // but no money moves. For showing the whole flow before real payments go live; while on, it
    // takes priority over Razorpay.
    onlineOrdersDemo: { type: Boolean, default: false },

    // The hotel's own Razorpay account for online orders - customers' money goes straight to
    // the hotel. Set by the platform owner in the console. Secrets are encrypted
    // (utils/secretBox) and only read where a payment needs them.
    razorpay: {
        keyId: { type: String, trim: true, maxlength: 40, default: '' },
        keySecret: { type: String, select: false },
        webhookSecret: { type: String, select: false },
        enabled: { type: Boolean, default: false },
        connectedAt: Date
    },
    demoResetAt: Date,

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user' }
}, { timestamps: true });

hotelSchema.index({ status: 1, 'subscription.paidUntil': 1 });

/**
 * Whether the hotel may use the system right now, and why not
 * @returns {{ ok: boolean, code?: string, message?: string }}
 */
hotelSchema.statics.accessStatus = function (hotel, now = new Date()) {
    if (!hotel) {
        return { ok: false, code: 'HOTEL_NOT_FOUND', message: 'This hotel account no longer exists.' };
    }
    if (hotel.status !== 'active') {
        return { ok: false, code: 'HOTEL_DISABLED', message: 'This hotel has been switched off. Please contact support.' };
    }
    const graceDays = hotel.subscription?.graceDays ?? DEFAULT_GRACE_DAYS;
    const lastDay = new Date(hotel.subscription.paidUntil).getTime() + graceDays * DAY_MS;
    if (lastDay < now.getTime()) {
        return { ok: false, code: 'SUBSCRIPTION_EXPIRED', message: 'The subscription has expired. Please renew to continue billing.' };
    }
    return { ok: true };
};

const Hotel = mongoose.model('Hotel', hotelSchema);

module.exports = Hotel;
module.exports.DAY_MS = DAY_MS;
