const mongoose = require('mongoose');

/**
 * Walk-in customer remembered by mobile number, so the counter can find
 * regulars by typing a few digits and repeat their last order in one tap
 */
const customerSchema = new mongoose.Schema({
    // WhatsApp format: 91XXXXXXXXXX
    phone: { type: String, required: true, unique: true },
    name: { type: String, trim: true, maxlength: 60 },
    visits: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    lastVisitAt: Date,
    lastItems: [{
        _id: false,
        itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
        name: String,
        quantity: Number
    }]
}, { timestamps: true });

customerSchema.index({ lastVisitAt: -1 });

/**
 * Record a paid bill against the customer (creates them on first visit)
 */
customerSchema.statics.recordVisit = function (bill) {
    const update = {
        $set: {
            lastVisitAt: bill.createdAt || new Date(),
            lastItems: bill.items.map(({ itemId, name, quantity }) => ({ itemId, name, quantity }))
        },
        $inc: { visits: 1, totalSpent: bill.total }
    };
    if (bill.customer?.name) update.$set.name = bill.customer.name;

    return this.findOneAndUpdate({ phone: bill.customer.phone }, update, { upsert: true, new: true });
};

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;
