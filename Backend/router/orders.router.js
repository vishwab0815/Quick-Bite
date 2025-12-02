const express = require('express');
const OrderController = require('../controllers/order.controller');
const { validateOrder } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');
const { isAdmin } = require('../middleware/adminAuth');
const orderrouter = express.Router();

// User order routes
orderrouter.post('/order', authenticateToken, validateOrder, OrderController.createOrder);
orderrouter.get('/orders', authenticateToken, OrderController.getUserOrders);
orderrouter.get('/order/:id', authenticateToken, OrderController.getOrderById);

// Admin-only routes
orderrouter.get('/admin/orders', authenticateToken, isAdmin, OrderController.getAllOrdersForAdmin);
orderrouter.patch('/order/:id/status', authenticateToken, OrderController.updateOrderStatus);

module.exports = orderrouter;
