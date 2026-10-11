/**
 * Authentication Middleware
 * Verifies JWT tokens and protects routes
 */

const jwt = require('jsonwebtoken');
const User = require('../models/userauthentication.model');

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

// Short-lived role cache - kitchen screens poll every few seconds, so this saves
// a database lookup per request. Removing a staff member clears their entry.
const ROLE_CACHE_TTL_MS = 15 * 1000;
const roleCache = new Map();

const getActiveUser = async (id) => {
    const cached = roleCache.get(id);
    if (cached && cached.expiresAt > Date.now()) return cached.user;

    const user = await User.findById(id).select('role').lean();
    roleCache.set(id, { user, expiresAt: Date.now() + ROLE_CACHE_TTL_MS });
    return user;
};

const forgetCachedRole = (id) => roleCache.delete(String(id));

/**
 * Like authorizeRoles, but checks the role against the database (cached for
 * 15 seconds), so a removed staff member or changed role takes effect right
 * away instead of when their token expires.
 * @param {Array} allowedRoles - Array of allowed roles
 */
const requireActiveRole = (...allowedRoles) => {
    return async (req, res, next) => {
        try {
            if (!req.user?.id) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            const user = await getActiveUser(String(req.user.id));

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Account no longer exists. Please log in again.'
                });
            }

            if (!allowedRoles.includes(user.role)) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. Insufficient permissions.'
                });
            }

            req.user.role = user.role;
            next();
        } catch (error) {
            console.error('❌ Role check error:', error.message);
            return res.status(500).json({
                success: false,
                message: 'Authorization failed'
            });
        }
    };
};

module.exports = {
    authenticateToken,
    optionalAuth,
    authorizeRoles,
    requireActiveRole,
    forgetCachedRole
};
