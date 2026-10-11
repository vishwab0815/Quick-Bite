const express = require('express');
const { login, logout, getprofile } = require('../controllers/userAuth.controller');
const { validateLogin } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');
const authRouter = express.Router();

// Public routes - there is no public sign-up: hotel logins are created by the
// platform owner (console) or the hotel owner (/pos/staff)
authRouter.post('/login', validateLogin, login);

// Protected routes (require authentication)
authRouter.post('/logout', logout);
authRouter.get('/profile', authenticateToken, getprofile);

module.exports = authRouter;
