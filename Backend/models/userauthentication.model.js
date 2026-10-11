const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters']
    },
    role: {
        type: String,
        enum: {
            // superadmin = QuickBite platform owner; admin = hotel owner; staff = cashier / kitchen
            values: ['user', 'staff', 'admin', 'superadmin'],
            message: '{VALUE} is not a valid role'
        },
        default: 'user'
    },
    // The hotel a staff / admin login belongs to (none for the platform owner)
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel' }
}, {
    timestamps: true,
    toJSON: {
        transform: function(doc, ret) {
            delete ret.password;
            delete ret.__v;
            return ret;
        }
    }
});

userSchema.index({ hotel: 1, role: 1 });

module.exports = mongoose.models.user || mongoose.model('user', userSchema);
