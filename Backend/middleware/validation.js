/**
 * Input Validation Middleware
 * Provides reusable validation functions for request data
 */

// Validate email format
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Validate password strength
const isValidPassword = (password) => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    if (!password || password.length < 8) return false;

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

// Validation middleware for user registration
const validateRegistration = (req, res, next) => {
    const { email, password, name } = req.body;

    // Check required fields
    if (!email || !password || !name) {
        return res.status(400).json({
            success: false,
            message: 'All fields are required: email, password, name'
        });
    }

    // Validate email
    if (!isValidEmail(email)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid email format'
        });
    }

    // Validate password
    if (!isValidPassword(password)) {
        return res.status(400).json({
            success: false,
            message: 'Password must be at least 8 characters long with 1 uppercase, 1 lowercase, and 1 number'
        });
    }

    // Sanitize name
    req.body.name = sanitizeString(name);

    if (req.body.name.length < 2) {
        return res.status(400).json({
            success: false,
            message: 'Name must be at least 2 characters long'
        });
    }

    next();
};

// Validation middleware for user login
const validateLogin = (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Email and password are required'
        });
    }

    if (!isValidEmail(email)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid email format'
        });
    }

    next();
};

// Validation middleware for order creation
const validateOrder = (req, res, next) => {
    console.log('📦 Order validation - Request body:', JSON.stringify(req.body, null, 2));

    // Backward compatibility: Transform old format (foodItem) to new format (items array)
    if (req.body.foodItem && !req.body.items) {
        console.log('🔄 Converting old order format to new format');
        const { foodItem, quantity, customizations, ...rest } = req.body;

        // Generate a temporary itemId if not present (will be validated later)
        const itemId = foodItem.id || foodItem._id || '000000000000000000000000';

        req.body = {
            ...rest,
            items: [
                {
                    itemId: itemId,
                    name: foodItem.name,
                    image: foodItem.image,
                    price: foodItem.price,
                    quantity: quantity || 1,
                    customizations: customizations || {}
                }
            ]
        };
        console.log('✅ Converted to:', JSON.stringify(req.body, null, 2));
    }

    const { items, totalAmount } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        console.log('❌ Validation failed: Missing or invalid items array');
        return res.status(400).json({
            success: false,
            message: 'Order must contain at least one item'
        });
    }

    if (!totalAmount || typeof totalAmount !== 'number' || totalAmount <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Invalid total amount'
        });
    }

    // Validate each item
    for (let i = 0; i < items.length; i++) {
        const item = items[i];

        if (!item.itemId || !isValidObjectId(item.itemId)) {
            return res.status(400).json({
                success: false,
                message: `Invalid item ID format at index ${i}`
            });
        }

        if (!item.name || typeof item.name !== 'string' || item.name.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: `Item name is required at index ${i}`
            });
        }

        if (!item.price || typeof item.price !== 'number' || item.price <= 0) {
            return res.status(400).json({
                success: false,
                message: `Invalid item price at index ${i}`
            });
        }

        if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: `Invalid item quantity at index ${i}`
            });
        }
    }

    next();
};

// Validation middleware for food item creation
const validateFoodItem = (req, res, next) => {
    const { name, price, description, category } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
        return res.status(400).json({
            success: false,
            message: 'Food item name must be at least 2 characters long'
        });
    }

    if (!price || typeof price !== 'number' || price <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Price must be a positive number'
        });
    }

    if (description && typeof description !== 'string') {
        return res.status(400).json({
            success: false,
            message: 'Description must be a string'
        });
    }

    if (category && typeof category !== 'string') {
        return res.status(400).json({
            success: false,
            message: 'Category must be a string'
        });
    }

    // Sanitize string fields
    req.body.name = sanitizeString(name);
    if (description) req.body.description = sanitizeString(description);
    if (category) req.body.category = sanitizeString(category);

    next();
};

// Validation middleware for ObjectId parameters
const validateObjectIdParam = (paramName) => {
    return (req, res, next) => {
        const id = req.params[paramName];

        if (!id || !isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: `Invalid ${paramName} format`
            });
        }

        next();
    };
};

// Generic validation middleware for required fields
const validateRequiredFields = (fields) => {
    return (req, res, next) => {
        const missingFields = [];

        for (const field of fields) {
            if (!req.body[field]) {
                missingFields.push(field);
            }
        }

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missingFields.join(', ')}`
            });
        }

        next();
    };
};

module.exports = {
    validateRegistration,
    validateLogin,
    validateOrder,
    validateFoodItem,
    validateObjectIdParam,
    validateRequiredFields,
    isValidEmail,
    isValidPassword,
    isValidObjectId,
    sanitizeString
};
