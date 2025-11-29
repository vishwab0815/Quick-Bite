const express = require('express');
const OrderController = require('../controllers/order.controller');
const { validateOrder } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');
const orderrouter = express.Router();

// All order routes require authentication
orderrouter.post('/order', authenticateToken, validateOrder, OrderController.createOrder);
orderrouter.get('/orders', authenticateToken, OrderController.getUserOrders);
orderrouter.get('/order/:id', authenticateToken, OrderController.getOrderById);
orderrouter.patch('/order/:id/status', authenticateToken, OrderController.updateOrderStatus);

module.exports = orderrouter;
