/**
 * Input Validation Middleware
 * Provides reusable validation functions for request data
 */

// Validate email format
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return typeof email === 'string' && email.length <= 254 && emailRegex.test(email);
};

// Validate password strength
const isValidPassword = (password) => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) return false;

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    return hasUpperCase && hasLowerCase && hasNumber;
};

// Validate MongoDB ObjectId
const isValidObjectId = (id) => {
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    return objectIdRegex.test(id);
};

// Sanitize string input
const sanitizeString = (str) => {
    if (typeof str !== 'string') return '';
    return str.trim().replace(/[<>]/g, '');
};

// Validation middleware for login
const validateLogin = (req, res, next) => {
    const { email, password } = req.body;

    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Email and password are required'
        });
    }

    if (!isValidEmail(email.trim()) || password.length > 128) {
        return res.status(400).json({
            success: false,
            message: 'Invalid email or password'
        });
    }

    next();
};

module.exports = {
    validateLogin,
    isValidEmail,
    isValidPassword,
    isValidObjectId,
    sanitizeString
};
