const express = require('express');
const PosController = require('../controllers/pos.controller');
const MenuController = require('../controllers/menu.controller');
const StaffController = require('../controllers/staff.controller');
const CustomerController = require('../controllers/customer.controller');
const OnlineOrderController = require('../controllers/onlineOrder.controller');
const rateLimit = require('express-rate-limit');
const { authenticateToken, requireActiveRole } = require('../middleware/auth');
const posRouter = express.Router();

// Roles and the hotel's status / subscription are checked on every request, so removed staff,
// disabled hotels and expired subscriptions lose access immediately. Every query is scoped to the hotel.
const isStaff = [authenticateToken, requireActiveRole('admin', 'staff')];
const isAdmin = [authenticateToken, requireActiveRole('admin')];

// Demo visitors can try everything except creating or changing real logins
const notInDemo = (req, res, next) => (req.hotel?.isDemo
    ? res.status(403).json({ success: false, message: 'Staff logins cannot be changed in the demo' })
    : next());

// Reads are always revalidated: unchanged polls get a tiny "304 Not Modified" instead of the full list
posRouter.use((req, res, next) => {
    if (req.method === 'GET') res.set('Cache-Control', 'private, no-cache');
    next();
});

// Public routes (no money / personal data): the restaurant website shows its hotel,
// each hotel's token TV uses its own address (/pos/public/<slug>/display), plus the receipt link
posRouter.get('/public/info', PosController.getPublicInfo);
posRouter.get('/display', PosController.getDisplayBoard);
posRouter.get('/public/:slug/info', PosController.getPublicInfo);
posRouter.get('/public/:slug/display', PosController.getDisplayBoard);
posRouter.get('/receipt/:publicId', PosController.getPublicReceipt);

// Online orders paid through Razorpay (website / table QR / kiosk) - customers order and pay themselves
const publicLimiter = (max) => rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many attempts from this network. Please wait a few minutes and try again.' }
});
posRouter.post('/public/:slug/orders', publicLimiter(30), OnlineOrderController.createOrder);
posRouter.post('/public/orders/:publicId/verify', publicLimiter(60), OnlineOrderController.verifyPayment);
posRouter.get('/public/orders/:publicId', OnlineOrderController.getOrder);

// Webhooks (signed - their raw bodies are kept in app.js so the signatures can be checked)
posRouter.post('/payments/razorpay/webhook', OnlineOrderController.razorpayWebhook);
posRouter.get('/whatsapp/webhook', OnlineOrderController.whatsappWebhookVerify);
posRouter.post('/whatsapp/webhook', OnlineOrderController.whatsappWebhook);

// Counter staff routes
posRouter.get('/settings', isStaff, PosController.getSettings);
posRouter.get('/menu', isStaff, MenuController.getMenu);
posRouter.patch('/menu/:id/availability', isStaff, MenuController.setItemAvailability);
posRouter.get('/customers', isStaff, CustomerController.searchCustomers);

posRouter.post('/bills', isStaff, PosController.createBill);
posRouter.get('/bills', isStaff, PosController.listBills);
posRouter.get('/bills/:id', isStaff, PosController.getBill);
posRouter.patch('/bills/:id/stations', isStaff, PosController.updateStation);
posRouter.post('/bills/:id/whatsapp', isStaff, PosController.sendWhatsappReceipt);
posRouter.post('/bills/:id/printed', isStaff, PosController.markPrinted);
posRouter.post('/serve', isStaff, PosController.serveByCode);

posRouter.get('/kitchen', isStaff, PosController.getKitchenTickets);
posRouter.get('/reports/summary', isStaff, PosController.getDailySummary);
posRouter.get('/reports/dashboard', isStaff, PosController.getDashboard);

// Admin-only - menu management
posRouter.post('/menu', isAdmin, MenuController.createMenuItem);
posRouter.post('/menu/import', isAdmin, MenuController.importMenu);
posRouter.put('/menu/:id', isAdmin, MenuController.updateMenuItem);
posRouter.delete('/menu/:id', isAdmin, MenuController.deleteMenuItem);

// Admin-only - staff logins
posRouter.get('/staff', isAdmin, StaffController.listStaff);
posRouter.post('/staff', isAdmin, notInDemo, StaffController.createStaff);
posRouter.patch('/staff/:id/password', isAdmin, notInDemo, StaffController.resetPassword);
posRouter.delete('/staff/:id', isAdmin, notInDemo, StaffController.removeStaff);

// Admin-only - cancelling a paid bill
posRouter.patch('/bills/:id/cancel', isAdmin, PosController.cancelBill);

module.exports = posRouter;
