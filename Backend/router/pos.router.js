const express = require('express');
const PosController = require('../controllers/pos.controller');
const MenuController = require('../controllers/menu.controller');
const StaffController = require('../controllers/staff.controller');
const { authenticateToken, requireActiveRole } = require('../middleware/auth');
const posRouter = express.Router();

// Roles are checked against the database on every request, so removed staff lose access immediately
const isStaff = [authenticateToken, requireActiveRole('admin', 'staff')];
const isAdmin = [authenticateToken, requireActiveRole('admin')];

// Public routes - token display TV and receipt link (no money / personal data on display)
posRouter.get('/display', PosController.getDisplayBoard);
posRouter.get('/receipt/:publicId', PosController.getPublicReceipt);

// Counter staff routes
posRouter.get('/settings', isStaff, PosController.getSettings);
posRouter.get('/menu', isStaff, MenuController.getMenu);
posRouter.patch('/menu/:id/availability', isStaff, MenuController.setItemAvailability);

posRouter.post('/bills', isStaff, PosController.createBill);
posRouter.get('/bills', isStaff, PosController.listBills);
posRouter.get('/bills/:id', isStaff, PosController.getBill);
posRouter.patch('/bills/:id/stations', isStaff, PosController.updateStation);
posRouter.post('/bills/:id/whatsapp', isStaff, PosController.sendWhatsappReceipt);
posRouter.post('/bills/:id/printed', isStaff, PosController.markPrinted);
posRouter.post('/serve', isStaff, PosController.serveByCode);

posRouter.get('/kitchen', isStaff, PosController.getKitchenTickets);
posRouter.get('/reports/summary', isStaff, PosController.getDailySummary);

// Admin-only - menu management
posRouter.post('/menu', isAdmin, MenuController.createMenuItem);
posRouter.post('/menu/import', isAdmin, MenuController.importMenu);
posRouter.put('/menu/:id', isAdmin, MenuController.updateMenuItem);
posRouter.delete('/menu/:id', isAdmin, MenuController.deleteMenuItem);

// Admin-only - staff logins
posRouter.get('/staff', isAdmin, StaffController.listStaff);
posRouter.post('/staff', isAdmin, StaffController.createStaff);
posRouter.patch('/staff/:id/password', isAdmin, StaffController.resetPassword);
posRouter.delete('/staff/:id', isAdmin, StaffController.removeStaff);

// Admin-only - cancelling a paid bill
posRouter.patch('/bills/:id/cancel', isAdmin, PosController.cancelBill);

module.exports = posRouter;
