const userauthenticationModel = require('../models/userauthentication.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendWelcomeEmail } = require('../config/sendgrid');


const register = async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    try {
        const existingUser = await userauthenticationModel.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ success: false, message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = new userauthenticationModel({
            name: name,
            email: email,
            password: hashedPassword
        });
        await user.save();

        const token = jwt.sign(
            { id: user._id, name: user.name, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        // Cookie configuration for JWT token
        // Production: secure=true (HTTPS), sameSite='none' (cross-origin)
        // Development: secure=false (HTTP), sameSite='lax' (more permissive)
        res.cookie('token', token, {
            httpOnly: true,  // Prevents XSS attacks
            secure: process.env.NODE_ENV === 'production',  // HTTPS only in production
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',  // Cross-origin support
            maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
            path: '/'  // Available across all routes
        });

        // Send welcome email using SendGrid (non-blocking)
        sendWelcomeEmail(email, name).catch(error => {
            console.error("❌ Error sending welcome email:", error.message);
        });

        return res.status(201).json({
            success: true,
            message: "Account created successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("❌ Registration error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create account. Please try again."
        });
    }
}

const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    try {
        const user = await userauthenticationModel.findOne({ email });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user._id, name: user.name, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        // Cookie configuration for JWT token
        // Production: secure=true (HTTPS), sameSite='none' (cross-origin)
        // Development: secure=false (HTTP), sameSite='lax' (more permissive)
        res.cookie('token', token, {
            httpOnly: true,  // Prevents XSS attacks
            secure: process.env.NODE_ENV === 'production',  // HTTPS only in production
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',  // Cross-origin support
            maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
            path: '/'  // Available across all routes
        });

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
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
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            path: '/'
        });

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
        const token = req.cookies?.token;
        if (!token) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userauthenticationModel.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        return res.json({ success: true, user });
    } catch (error) {
        console.error('Error in getprofile:', error);
        return res.status(401).json({ success: false, message: 'Invalid token or server error' });
    }
};


module.exports = { register, login, logout, getprofile };

