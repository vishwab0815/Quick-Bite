/**
 * Authentication Middleware
 * Verifies JWT tokens and protects routes
 */

const jwt = require('jsonwebtoken');
const User = require('../models/userauthentication.model');
const Hotel = require('../models/hotel.model');

const HOTEL_ROLES = ['admin', 'staff'];

/**
 * Middleware to verify JWT token from cookies
 * Attaches user data to req.user if valid
 */
const authenticateToken = (req, res, next) => {
    try {
        const token = req.cookies?.token;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required. Please log in.'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach user info to request
        req.user = decoded;

        next();
    } catch (error) {
        console.error('❌ Authentication error:', error.message);

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid authentication token'
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Authentication token expired. Please log in again.'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Authentication failed'
        });
    }
};

/**
 * Optional authentication middleware
 * Attaches user if token exists, but doesn't fail if missing
 */
const optionalAuth = (req, res, next) => {
    try {
        const token = req.cookies?.token;

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
        }

        next();
    } catch (error) {
        // Continue without authentication
        next();
    }
};

/**
 * Middleware to check if user is authenticated and has specific role
 * @param {Array} allowedRoles - Array of allowed roles
 */
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Insufficient permissions.'
            });
        }

        next();
    };
};

// Short-lived caches - kitchen screens poll every few seconds, so this saves database
// lookups per request. Removing a login or changing a hotel clears its entry at once.
const CACHE_TTL_MS = 15 * 1000;
const userCache = new Map();
const hotelCache = new Map();

const cached = async (cache, id, load) => {
    const entry = cache.get(id);
    if (entry && entry.expiresAt > Date.now()) return entry.value;
    const value = await load();
    cache.set(id, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
};

const getActiveUser = (id) => cached(userCache, id, () => User.findById(id).select('role hotel email name').lean());
const getHotel = (id) => cached(hotelCache, id, () => Hotel.findById(id).lean());

const forgetCachedRole = (id) => userCache.delete(String(id));
const forgetCachedHotel = (id) => hotelCache.delete(String(id));

const deny = (res, status, message, code) => res.status(status).json({ success: false, message, ...(code && { code }) });

/**
 * Checks the login against the database on every request (cached for 15 seconds), so a
 * removed login, changed role, disabled hotel or expired subscription takes effect at once
 * instead of when the session expires.
 * Hotel roles (admin / staff) get req.hotel - every query they make is scoped to it.
 * @param {Array} allowedRoles - Array of allowed roles
 */
const requireActiveRole = (...allowedRoles) => {
    return async (req, res, next) => {
        try {
            if (!req.user?.id) {
                return deny(res, 401, 'Authentication required');
            }

            const user = await getActiveUser(String(req.user.id));
            if (!user) {
                return deny(res, 401, 'Account no longer exists. Please log in again.');
            }
            if (!allowedRoles.includes(user.role)) {
                return deny(res, 403, 'Access denied. Insufficient permissions.');
            }

            req.user.role = user.role;

            if (HOTEL_ROLES.includes(user.role)) {
                const hotel = user.hotel ? await getHotel(String(user.hotel)) : null;
                const access = Hotel.accessStatus(hotel);
                if (!access.ok) {
                    return deny(res, 403, access.message, access.code);
                }
                req.hotel = hotel;
                req.hotelId = hotel._id;
            }

            next();
        } catch (error) {
            console.error('❌ Role check error:', error.message);
            return deny(res, 500, 'Authorization failed');
        }
    };
};

/**
 * Optional extra lock for the platform console: PLATFORM_IP_ALLOWLIST="1.2.3.4,5.6.7.8"
 * limits it to those IP addresses (leave unset to allow any IP with a valid login)
 */
const platformIpAllowed = (ip) => {
    const allowList = (process.env.PLATFORM_IP_ALLOWLIST || '').split(',').map((entry) => entry.trim()).filter(Boolean);
    return allowList.length === 0 || allowList.includes(String(ip).replace(/^::ffff:/, ''));
};

/**
 * Platform owner only. Answers 404 to everyone else, so the console's API looks like it doesn't exist.
 */
const requireSuperadmin = [
    (req, res, next) => (platformIpAllowed(req.ip) ? next() : deny(res, 404, 'Route not found')),
    (req, res, next) => {
        try {
            req.user = jwt.verify(req.cookies?.token, process.env.JWT_SECRET);
            next();
        } catch {
            deny(res, 404, 'Route not found');
        }
    },
    async (req, res, next) => {
        try {
            const user = await getActiveUser(String(req.user.id));
            if (user?.role !== 'superadmin') {
                return deny(res, 404, 'Route not found');
            }
            req.user.role = user.role;
            next();
        } catch (error) {
            console.error('❌ Platform check error:', error.message);
            return deny(res, 500, 'Authorization failed');
        }
    },
];

module.exports = {
    authenticateToken,
    optionalAuth,
    authorizeRoles,
    requireActiveRole,
    requireSuperadmin,
    forgetCachedRole,
    forgetCachedHotel,
    getHotel
};
