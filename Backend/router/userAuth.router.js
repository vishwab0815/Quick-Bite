const express = require('express');
const rateLimit = require('express-rate-limit');
const { login, demoLogin, logout, getprofile } = require('../controllers/userAuth.controller');
const { validateLogin } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');
const authRouter = express.Router();

// Public routes - there is no public sign-up: hotel logins are created by the
// platform owner (console) or the hotel owner (/pos/staff)
authRouter.post('/login', validateLogin, login);
// "Try the demo" - signs into the sample restaurant, never a real one
authRouter.post('/demo', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many demo sign-ins from this network. Please wait a few minutes and try again.' }
}), demoLogin);

// Protected routes (require authentication)
authRouter.post('/logout', logout);
authRouter.get('/profile', authenticateToken, getprofile);

module.exports = authRouter;
