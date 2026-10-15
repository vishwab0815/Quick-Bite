const mongoose = require('mongoose');

/**
 * Counter bill (walk-in customer billed at the hotel counter)
 * Each bill gets a daily token number; the customer shows the token
 * at each food counter (station) to collect their items
 */

const billItemSchema = new mongoose.Schema({
    itemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MenuItem',
        required: true
    },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    amount: { type: Number, required: true, min: 0 },
    counter: { type: String, required: true }
}, { _id: false });

const stationSchema = new mongoose.Schema({
    counter: { type: String, required: true },
    status: {
        type: String,
        enum: ['preparing', 'ready', 'served'],
        default: 'preparing'
    },
    readyAt: Date,
    servedAt: Date
}, { _id: false });

const billSchema = new mongoose.Schema({
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
    // Unique per hotel (see indexes below)
    billNumber: { type: String, required: true },
    tokenNumber: { type: Number, required: true },
    businessDate: { type: String, required: true },
    // Unguessable id used for the public receipt link sent on WhatsApp
    publicId: { type: String, required: true, unique: true },
    items: {
        type: [billItemSchema],
        validate: [(items) => items.length > 0, 'Bill must contain at least one item']
    },
    stations: [stationSchema],
    subtotal: { type: Number, required: true, min: 0 },
    taxableAmount: { type: Number, required: true, min: 0 },
    gstScheme: { type: String, enum: ['regular', 'composition'], default: 'regular' },
    gstRate: { type: Number, default: 0 },
    pricesIncludeGst: { type: Boolean, default: false },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    total: { type: Number, required: true, min: 0 },
    payment: {
        mode: { type: String, enum: ['cash', 'upi', 'card'], required: true },
        cashReceived: Number,
        changeReturned: Number,
        reference: String,
        // Paid online through Razorpay (website / QR / kiosk orders)
        gateway: { type: String, enum: ['razorpay'] },
        gatewayOrderId: String,
        gatewayPaymentId: String,
        method: String,
        refund: {
            id: String,
            status: String,
            amount: Number,
            at: Date
        }
    },
    customer: {
        name: String,
        phone: String
    },
    source: {
        type: String,
        enum: ['counter', 'kiosk', 'qr'],
        default: 'counter'
    },
    status: {
        type: String,
        enum: ['preparing', 'ready', 'served', 'cancelled'],
        default: 'preparing'
    },
    receipt: {
        printed: { type: Boolean, default: false },
        whatsapp: {
            status: {
                type: String,
                enum: ['not_requested', 'sent', 'link', 'failed', 'delivered', 'read'],
                default: 'not_requested'
            },
            messageId: String,
            error: String,
            sentAt: Date,
            deliveredAt: Date,
            readAt: Date
        },
        // "Your token is ready" message, sent once when the whole order is ready
        readyNotice: {
            status: { type: String, enum: ['sent', 'failed', 'delivered', 'read'] },
            messageId: String,
            error: String,
            sentAt: Date
        }
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    cancelledAt: Date,
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    cancelReason: String
}, { timestamps: true });

// Every lookup is scoped to one hotel, so the hotel leads each index
billSchema.index({ hotel: 1, billNumber: 1 }, { unique: true });
billSchema.index({ hotel: 1, businessDate: 1, tokenNumber: 1 }, { unique: true });
billSchema.index({ hotel: 1, businessDate: 1, status: 1 });
billSchema.index({ hotel: 1, createdAt: -1 });
// Webhook lookups: payment refunds and WhatsApp delivery receipts
billSchema.index({ 'payment.gatewayPaymentId': 1 }, { sparse: true });
billSchema.index({ 'receipt.whatsapp.messageId': 1 }, { sparse: true });
billSchema.index({ 'receipt.readyNotice.messageId': 1 }, { sparse: true });

/**
 * Derive the overall bill status from its stations
 */
billSchema.methods.refreshStatus = function () {
    if (this.status === 'cancelled') return;

    const statuses = this.stations.map((station) => station.status);
    if (statuses.every((status) => status === 'served')) {
        this.status = 'served';
    } else if (statuses.every((status) => status !== 'preparing')) {
        this.status = 'ready';
    } else {
        this.status = 'preparing';
    }
};

const Bill = mongoose.model('Bill', billSchema);

module.exports = Bill;
