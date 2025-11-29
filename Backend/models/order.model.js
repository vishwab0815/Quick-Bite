const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true,
            index: true
        },
        items: [
            {
                itemId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'FoodItem',
                    required: true
                },
                name: { type: String, required: true },
                image: { type: String },
                price: { type: Number, required: true, min: 0 },
                quantity: {
                    type: Number,
                    required: true,
                    min: 1,
                    default: 1
                },
                customizations: { type: Object, default: {} }
            }
        ],
        totalAmount: {
            type: Number,
            required: true,
            min: 0
        },
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'],
            default: 'pending',
            index: true
        },
        orderDate: { type: Date, default: Date.now },
        deliveryAddress: {
            street: String,
            city: String,
            state: String,
            zipCode: String,
            country: String
        },
        paymentMethod: {
            type: String,
            enum: ['cash', 'card', 'online', 'wallet'],
            default: 'cash'
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'completed', 'failed', 'refunded'],
            default: 'pending'
        },
        notes: String
    },
    { timestamps: true }
);

// Indexes for better query performance
orderSchema.index({ userId: 1, orderDate: -1 });
orderSchema.index({ status: 1, orderDate: -1 });

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
