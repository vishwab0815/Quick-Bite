const express = require('express');
const fetchController = require('../controllers/foodItems.controller');
const { authenticateToken } = require('../middleware/auth');
const { isAdmin } = require('../middleware/adminAuth');
const { upload } = require('../config/cloudinary');
const router = express.Router();

// SECURITY: Database seed endpoint - admin only (should only be used once during setup)
router.post('/fetch', authenticateToken, isAdmin, fetchController.fetchFoodItems);

// Public routes - anyone can view food items
router.get('/get', fetchController.getFoodItems);
router.get('/meal-type/:mealType', fetchController.getFoodItemsByMealType);
router.get('/food/:id', fetchController.getFoodItemById);

// Admin-only routes - CRUD operations for food items
router.post('/upload-image', authenticateToken, isAdmin, upload.single('image'), fetchController.uploadImage);
router.post('/create', authenticateToken, isAdmin, fetchController.createFoodItem);
router.put('/update/:id', authenticateToken, isAdmin, fetchController.updateFoodItem);
router.delete('/delete/:id', authenticateToken, isAdmin, fetchController.deleteFoodItem);

module.exports = router;



