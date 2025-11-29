const Order = require('../models/order.model');
const { sendOrderConfirmationEmail } = require('../config/sendgrid');

/**
 * Create a new order
 */
module.exports.createOrder = async (req, res) => {
    try {
        const userId = req.user?.id;
        const userEmail = req.user?.email;
        const userName = req.user?.name;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "User authentication required"
            });
        }

        const orderData = {
            ...req.body,
            userId: userId,
            status: 'pending',
            orderDate: new Date()
        };

        const order = new Order(orderData);
        await order.save();

        console.log(`✅ Order created: ${order._id} by user ${userId}`);

        // Send order confirmation email (non-blocking)
        if (userEmail && userName) {
            sendOrderConfirmationEmail(userEmail, userName, {
                orderId: order._id,
                status: order.status,
                totalAmount: order.totalAmount || 0
            }).catch(error => {
                console.error("❌ Error sending order confirmation email:", error.message);
            });
        }

        res.status(201).json({
            success: true,
            message: "Order placed successfully",
            order: order
        });
    } catch (error) {
        console.error("❌ Error creating order:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create order",
            error: error.message
        });
    }
};

/**
 * Get all orders for the authenticated user
 */
module.exports.getUserOrders = async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "User authentication required"
            });
        }

        const orders = await Order.find({ userId: userId })
            .sort({ orderDate: -1 })
            .lean();

        res.status(200).json({
            success: true,
            count: orders.length,
            orders: orders
        });
    } catch (error) {
        console.error("❌ Error fetching user orders:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch orders",
            error: error.message
        });
    }
};

/**
 * Get a specific order by ID
 */
module.exports.getOrderById = async (req, res) => {
    try {
        const orderId = req.params.id;
        const userId = req.user?.id;

        const order = await Order.findOne({
            _id: orderId,
            userId: userId
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        res.status(200).json({
            success: true,
            order: order
        });
    } catch (error) {
        console.error("❌ Error fetching order:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch order",
            error: error.message
        });
    }
};

/**
 * Update order status
 */
module.exports.updateOrderStatus = async (req, res) => {
    try {
        const orderId = req.params.id;
        const { status } = req.body;
        const userId = req.user?.id;

        const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Valid statuses: ${validStatuses.join(', ')}`
            });
        }

        const order = await Order.findOneAndUpdate(
            { _id: orderId, userId: userId },
            { status: status },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Order status updated successfully",
            order: order
        });
    } catch (error) {
        console.error("❌ Error updating order:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update order",
            error: error.message
        });
    }
};

// Backward compatibility
module.exports.Order = module.exports.createOrder;