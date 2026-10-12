const mongoose = require('mongoose');

/**
 * Hotel counter menu item (billing counter, kitchen screens)
 * Kept separate from the website's recipe catalogue - only what the counter needs
 */
const menuItemSchema = new mongoose.Schema({
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters'],
        maxlength: [60, 'Name must be at most 60 characters']
    },
    // Lowercased name - keeps item names unique within a hotel regardless of case
    nameKey: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0.01, 'Price must be greater than 0'],
        max: [100000, 'Price is too high']
    },
    // Food counter that prepares the item (e.g. Dosa Counter) - drives coupons & kitchen screens
    counter: {
        type: String,
        required: [true, 'Counter is required'],
        trim: true,
        maxlength: [40, 'Counter must be at most 40 characters']
    },
    category: {
        type: String,
        trim: true,
        maxlength: [40, 'Category must be at most 40 characters'],
        default: 'General'
    },
    isVeg: {
        type: Boolean,
        default: true
    },
    // Photo chosen by the owner from the built-in dish photo library (empty = matched by name)
    image: {
        type: String,
        trim: true,
        maxlength: 40,
        match: [/^[a-z0-9-]*$/, 'Invalid photo'],
        default: ''
    },
    // Counter staff can mark an item sold out for the day
    isAvailable: {
        type: Boolean,
        default: true
    },
    sortOrder: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

menuItemSchema.pre('validate', function (next) {
    if (this.name) this.nameKey = this.name.trim().toLowerCase();
    next();
});

menuItemSchema.index({ hotel: 1, nameKey: 1 }, { unique: true });
menuItemSchema.index({ hotel: 1, counter: 1, sortOrder: 1, name: 1 });

const MenuItem = mongoose.model('MenuItem', menuItemSchema);

module.exports = MenuItem;
