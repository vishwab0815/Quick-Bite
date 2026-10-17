const express = require('express');
const rateLimit = require('express-rate-limit');
const Platform = require('../controllers/platform.controller');
const { requireSuperadmin } = require('../middleware/auth');

const platformRouter = express.Router();

// Every route: platform owner only (404 for anyone else), never cached, rate limited
platformRouter.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please slow down.' }
}));
platformRouter.use(requireSuperadmin);
platformRouter.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});

platformRouter.get('/overview', Platform.getOverview);

platformRouter.get('/hotels', Platform.listHotels);
platformRouter.post('/hotels', Platform.createHotel);
platformRouter.get('/hotels/:id', Platform.getHotel);
platformRouter.patch('/hotels/:id', Platform.updateHotel);
platformRouter.patch('/hotels/:id/status', Platform.setHotelStatus);
platformRouter.post('/hotels/:id/payments', Platform.recordPayment);
platformRouter.get('/hotels/:id/bills', Platform.getHotelBills);
platformRouter.get('/hotels/:id/menu', Platform.getHotelMenu);
platformRouter.get('/hotels/:id/staff', Platform.getHotelStaff);
platformRouter.patch('/hotels/:id/staff/:userId/password', Platform.resetStaffPassword);
platformRouter.get('/hotels/:id/online-payments', Platform.getOnlinePayments);
platformRouter.put('/hotels/:id/online-payments', Platform.updateOnlinePayments);
platformRouter.delete('/hotels/:id/online-payments', Platform.disconnectOnlinePayments);

platformRouter.get('/payments', Platform.listPayments);
platformRouter.get('/audit', Platform.listAudit);

module.exports = platformRouter;
