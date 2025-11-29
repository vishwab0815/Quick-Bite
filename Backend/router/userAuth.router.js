const express = require('express');
const { register, login, logout, getprofile } = require('../controllers/userAuth.controller');
const { validateRegistration, validateLogin } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');
const authRouter = express.Router();

// Public routes
authRouter.post('/register', validateRegistration, register);
authRouter.post('/login', validateLogin, login);

// Protected routes (require authentication)
authRouter.post('/logout', authenticateToken, logout);
authRouter.get('/profile', authenticateToken, getprofile);

module.exports = authRouter;