const bcrypt = require('bcryptjs');
const User = require('../models/userauthentication.model');
const { isValidEmail, isValidPassword, isValidObjectId, sanitizeString } = require('../middleware/validation');
const { forgetCachedRole } = require('../middleware/auth');

const STAFF_ROLES = ['staff', 'admin'];
const PASSWORD_RULE = 'Password must be at least 8 characters with 1 uppercase, 1 lowercase and 1 number';

/**
 * List counter staff and admins (admin)
 */
module.exports.listStaff = async (req, res) => {
    try {
        const staff = await User.find({ role: { $in: STAFF_ROLES } })
            .select('name email role createdAt')
            .sort({ role: 1, name: 1 })
            .lean();

        res.status(200).json({ success: true, staff });
    } catch (error) {
        console.error('❌ Error listing staff:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch staff' });
    }
};

/**
 * Add a counter staff login (admin)
 */
module.exports.createStaff = async (req, res) => {
    try {
        const name = sanitizeString(req.body.name);
        const email = String(req.body.email || '').trim().toLowerCase();
        const { password } = req.body;

        if (name.length < 2 || name.length > 60) {
            return res.status(400).json({ success: false, message: 'Name must be 2 to 60 characters' });
        }
        if (!isValidEmail(email)) {
            return res.status(400).json({ success: false, message: 'Enter a valid email / login ID' });
        }
        if (!isValidPassword(password)) {
            return res.status(400).json({ success: false, message: PASSWORD_RULE });
        }

        if (await User.exists({ email })) {
            return res.status(409).json({ success: false, message: 'An account with this email already exists' });
        }

        const user = await User.create({
            name,
            email,
            password: await bcrypt.hash(password, 12),
            role: 'staff'
        });

        console.log(`✅ Staff login created: ${user.email}`);

        res.status(201).json({
            success: true,
            staff: { _id: user._id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt }
        });
    } catch (error) {
        console.error('❌ Error creating staff:', error);
        res.status(500).json({ success: false, message: 'Failed to create staff login' });
    }
};

/**
 * Reset a staff or admin password (admin)
 */
module.exports.resetPassword = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid user ID' });
        }
        if (!isValidPassword(req.body.password)) {
            return res.status(400).json({ success: false, message: PASSWORD_RULE });
        }

        const user = await User.findOne({ _id: req.params.id, role: { $in: STAFF_ROLES } });
        if (!user) {
            return res.status(404).json({ success: false, message: 'Staff member not found' });
        }

        user.password = await bcrypt.hash(req.body.password, 12);
        await user.save();

        console.log(`✅ Password reset for ${user.email}`);
        res.status(200).json({ success: true, message: `Password updated for ${user.name}` });
    } catch (error) {
        console.error('❌ Error resetting password:', error);
        res.status(500).json({ success: false, message: 'Failed to reset password' });
    }
};

/**
 * Remove a counter staff login (admin). Admin accounts can't be removed here.
 * Their existing session stops working immediately (roles are checked per request).
 */
module.exports.removeStaff = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid user ID' });
        }

        const user = await User.findOneAndDelete({ _id: req.params.id, role: 'staff' }).lean();
        if (!user) {
            return res.status(404).json({ success: false, message: 'Staff member not found' });
        }

        forgetCachedRole(user._id);
        console.log(`✅ Staff login removed: ${user.email}`);
        res.status(200).json({ success: true, message: `${user.name} removed` });
    } catch (error) {
        console.error('❌ Error removing staff:', error);
        res.status(500).json({ success: false, message: 'Failed to remove staff' });
    }
};
