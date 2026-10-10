const express = require('express');
const PosController = require('../controllers/pos.controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { isAdmin } = require('../middleware/adminAuth');
const posRouter = express.Router();

const isStaff = authorizeRoles('admin', 'staff');

// Public routes - token display TV and receipt link (no money / personal data on display)
posRouter.get('/display', PosController.getDisplayBoard);
posRouter.get('/receipt/:publicId', PosController.getPublicReceipt);

// Counter staff routes
posRouter.get('/settings', authenticateToken, isStaff, PosController.getSettings);
posRouter.get('/menu', authenticateToken, isStaff, PosController.getMenu);
posRouter.patch('/menu/:id/availability', authenticateToken, isStaff, PosController.setItemAvailability);

posRouter.post('/bills', authenticateToken, isStaff, PosController.createBill);
posRouter.get('/bills', authenticateToken, isStaff, PosController.listBills);
posRouter.get('/bills/:id', authenticateToken, isStaff, PosController.getBill);
posRouter.patch('/bills/:id/stations', authenticateToken, isStaff, PosController.updateStation);
posRouter.post('/bills/:id/whatsapp', authenticateToken, isStaff, PosController.sendWhatsappReceipt);
posRouter.post('/bills/:id/printed', authenticateToken, isStaff, PosController.markPrinted);
posRouter.post('/serve', authenticateToken, isStaff, PosController.serveByCode);

posRouter.get('/kitchen', authenticateToken, isStaff, PosController.getKitchenTickets);
posRouter.get('/reports/summary', authenticateToken, isStaff, PosController.getDailySummary);

// Admin-only - cancelling a paid bill
posRouter.patch('/bills/:id/cancel', authenticateToken, isAdmin, PosController.cancelBill);

module.exports = posRouter;
