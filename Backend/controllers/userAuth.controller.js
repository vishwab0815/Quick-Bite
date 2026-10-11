const userauthenticationModel = require('../models/userauthentication.model');
const Hotel = require('../models/hotel.model');
const AuditLog = require('../models/auditLog.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Sessions last 24 hours by default (one working day at the counter);
// the platform owner's console session is shorter
const DEFAULT_SESSION_LENGTH = '24h';
const DEFAULT_PLATFORM_SESSION_LENGTH = '8h';

const ALLOWED_ROLES = ['superadmin', 'admin', 'staff'];
const HOTEL_ROLES = ['admin', 'staff'];

// Compared against when the email doesn't exist, so a wrong email takes as long as a wrong password
// (response time can't be used to find out which emails have accounts)
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

const cookieOptions = () => ({
    httpOnly: true,  // Prevents XSS attacks
    secure: process.env.NODE_ENV === 'production',  // HTTPS only in production
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',  // Cross-origin support
    path: '/'  // Available across all routes
});

/**
 * Sign a JWT and set it as an httpOnly cookie that expires exactly when the token does
 */
const startSession = (res, user) => {
    const expiresIn = user.role === 'superadmin'
        ? process.env.JWT_PLATFORM_EXPIRES_IN || DEFAULT_PLATFORM_SESSION_LENGTH
        : process.env.JWT_EXPIRES_IN || DEFAULT_SESSION_LENGTH;
    const token = jwt.sign(
        { id: user._id, name: user.name, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn }
    );
    const { exp } = jwt.decode(token);

    res.cookie('token', token, { ...cookieOptions(), maxAge: exp * 1000 - Date.now() });
};

const publicUser = (user, hotel) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    ...(hotel && { hotel: { id: hotel._id, name: hotel.name, slug: hotel.slug } })
});

const login = async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    try {
        const user = await userauthenticationModel.findOne({ email });
        const isMatch = await bcrypt.compare(password, user?.password || DUMMY_HASH);

        if (!user || !isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        if (!ALLOWED_ROLES.includes(user.role)) {
            return res.status(403).json({ success: false, message: 'This account does not have access to QuickBite.' });
        }

        let hotel = null;
        if (HOTEL_ROLES.includes(user.role)) {
            hotel = user.hotel ? await Hotel.findById(user.hotel).lean() : null;
            const access = Hotel.accessStatus(hotel);
            if (!access.ok) {
                return res.status(403).json({ success: false, message: access.message, code: access.code });
            }
        }

        startSession(res, user);

        if (user.role === 'superadmin') {
            AuditLog.record({ user: { id: user._id, email: user.email }, ip: req.ip }, 'console.signin');
        }

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            user: publicUser(user, hotel)
        });

    } catch (error) {
        console.error("❌ Login error:", error);
        return res.status(500).json({
            success: false,
            message: "Login failed. Please try again."
        });
    }
}

const logout = async (req, res) => {
    try {
        // Clear cookie with same options as when it was set
        res.clearCookie('token', cookieOptions());
        return res.status(200).json({ success: true, message: 'Logout successful' });
    } catch (error) {
        console.error("❌ Logout error:", error);
        return res.status(500).json({
            success: false,
            message: "Logout failed. Please try again."
        });
    }
}

const getprofile = async (req, res) => {
    try {
        const user = await userauthenticationModel.findById(req.user.id).select('-password').lean();

        if (!user || !ALLOWED_ROLES.includes(user.role)) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }

        const hotel = user.hotel ? await Hotel.findById(user.hotel).select('name slug').lean() : null;
        return res.json({ success: true, user: publicUser(user, hotel) });
    } catch (error) {
        console.error('Error in getprofile:', error);
        return res.status(401).json({ success: false, message: 'Invalid token or server error' });
    }
};


module.exports = { login, logout, getprofile };
