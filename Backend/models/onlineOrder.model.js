const mongoose = require('mongoose');

/**
 * An order placed online (restaurant website, table QR or self-order kiosk) that is paid
 * through Razorpay before it reaches the kitchen. It becomes a normal bill - with a token -
 * only once the payment is verified, either by the Checkout signature or by the webhook,
 * whichever arrives first.
 */

const orderLineSchema = new mongoose.Schema({
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    amount: { type: Number, required: true, min: 0 },
    counter: { type: String, required: true }
}, { _id: false });

const onlineOrderSchema = new mongoose.Schema({
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
    // Unguessable id for the customer's order status page
    publicId: { type: String, required: true, unique: true },
    items: { type: [orderLineSchema], validate: [(items) => items.length > 0, 'Order must contain at least one item'] },
    subtotal: { type: Number, required: true },
    taxableAmount: { type: Number, required: true },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    total: { type: Number, required: true, min: 1 },
    customer: {
        name: { type: String, required: true },
        phone: { type: String, required: true }
    },
    source: { type: String, enum: ['qr', 'kiosk'], default: 'qr' },
    // Note for the kitchen, e.g. "less spicy"
    note: { type: String, trim: true, maxlength: 140 },
    status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    razorpay: {
        orderId: { type: String, required: true },
        paymentId: String,
        method: String,
        lastError: String
    },
    // Set while the bill is being created, so the Checkout callback and the webhook
    // can never both create a bill for the same payment
    finalizing: { type: Boolean, default: false },
    bill: { type: mongoose.Schema.Types.ObjectId, ref: 'Bill' },
    paidAt: Date
}, { timestamps: true });

onlineOrderSchema.index({ 'razorpay.orderId': 1 }, { unique: true });
onlineOrderSchema.index({ hotel: 1, createdAt: -1 });

module.exports = mongoose.model('OnlineOrder', onlineOrderSchema);
