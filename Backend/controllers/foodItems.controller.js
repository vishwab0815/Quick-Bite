const express = require('express');
const mongoose = require('mongoose');

const fs = require('fs').promises;
const path = require('path');
const Recipe = require('../models/fooditems.model'); // Import your Recipe model
const { uploadToCloudinary, deleteImage } = require('../config/cloudinary');

/**
 * Seed food items from JSON file to database
 * SECURITY: This should only be called once during initial setup
 * Consider adding admin authentication or removing this endpoint in production
 */
module.exports.fetchFoodItems = async (req, res, next) => {
    try {
        // Check if data already exists
        const existingCount = await Recipe.countDocuments();

        if (existingCount > 0) {
            return res.status(400).json({
                success: false,
                message: "Database already contains food items. Use the admin endpoint to reset.",
                count: existingCount
            });
        }

        // Read the JSON file
        const filePath = path.join(__dirname, '../food.json');
        const jsonData = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(jsonData);

        // Store in MongoDB (only if empty)
        if (data.recipes && data.recipes.length > 0) {
            const insertedRecipes = await Recipe.insertMany(data.recipes);
            console.log(`✅ ${insertedRecipes.length} recipes inserted into MongoDB`);

            return res.status(201).json({
                success: true,
                message: "Food items seeded successfully",
                count: insertedRecipes.length,
                data: insertedRecipes
            });
        }

        res.status(400).json({
            success: false,
            message: "No recipes found in the JSON file"
        });
    } catch (error) {
        console.error("❌ Error in fetchFoodItems:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch and store food items",
            error: error.message
        });
    }
};

module.exports.getFoodItems = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const data = await Recipe.find({})
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Recipe.countDocuments();

        if (!data || data.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No food items found"
            });
        }

        res.status(200).json({
            success: true,
            count: data.length,
            total: total,
            page: page,
            totalPages: Math.ceil(total / limit),
            data: data
        });
    } catch (error) {
        console.error("❌ Error in getFoodItems:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch food items",
            error: error.message
        });
    }
};


module.exports.getFoodItemsByMealType = async (req, res, next) => {
    const { mealType } = req.params; 
    
    try {
        const validMealTypes = Recipe.schema.path('mealType').caster.enumValues;
        
        if (!validMealTypes.includes(mealType)) {
            return res.status(400).json({
                success: false,
                message: `Invalid meal type. Valid types are: ${validMealTypes.join(', ')}`,
                validMealTypes: validMealTypes
            });
        }

        const data = await Recipe.find({ mealType: mealType });
        
        if (!data || data.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No food items found for meal type: ${mealType}`
            });
        }

        res.status(200).json({
            success: true,
            count: data.length,
            data: data
        });

    } catch (error) {
        console.error('Error fetching food items by meal type:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching food items',
            error: error.message
        });
    }
};


module.exports.getFoodItemById = async (req, res, next) => {
    const { id } = req.params;
    try {
        const data = await Recipe.findOne({ id: parseInt(id) }); // Convert to number if needed
        if (!data) {
            return res.status(404).json({
                success: false,
                message: "No food item found with this ID"
            });
        }
        res.status(200).json({
            success: true,
            data: data
        });
    } catch (error) {
        console.error('Error fetching food item by ID:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching food item',
            error: error.message
        });
    }
};

/**
 * Create a new food item (Admin only)
 * Accepts either image URL or will support file upload with Cloudinary
 */
module.exports.createFoodItem = async (req, res) => {
    try {
        const {
            name,
            ingredients,
            prepTimeMinutes,
            cookTimeMinutes,
            servings,
            difficulty,
            cuisine,
            caloriesPerServing,
            tags,
            image,
            price,
            mealType,
            customizations
        } = req.body;

        // Validate required fields
        if (!name || !ingredients || !difficulty || !cuisine || !image || !price || !mealType) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: name, ingredients, difficulty, cuisine, image, price, mealType'
            });
        }

        // Generate unique numeric ID
        const lastRecipe = await Recipe.findOne().sort({ id: -1 });
        const newId = lastRecipe ? lastRecipe.id + 1 : 1;

        const newFoodItem = new Recipe({
            id: newId,
            name,
            ingredients: Array.isArray(ingredients) ? ingredients : [ingredients],
            prepTimeMinutes: prepTimeMinutes || 0,
            cookTimeMinutes: cookTimeMinutes || 0,
            servings: servings || 1,
            difficulty,
            cuisine,
            caloriesPerServing: caloriesPerServing || 0,
            tags: tags || [],
            userId: req.user?.id || 0,  // From authenticated admin
            image,
            price,
            rating: 0,
            reviewCount: 0,
            mealType: Array.isArray(mealType) ? mealType : [mealType],
            customizations: customizations || {}
        });

        await newFoodItem.save();

        console.log(`✅ Food item created: ${newFoodItem.name} (ID: ${newFoodItem.id})`);

        res.status(201).json({
            success: true,
            message: 'Food item created successfully',
            data: newFoodItem
        });
    } catch (error) {
        console.error('❌ Error creating food item:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create food item',
            error: error.message
        });
    }
};

/**
 * Update an existing food item (Admin only)
 */
module.exports.updateFoodItem = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Don't allow updating the unique ID
        delete updateData.id;
        delete updateData._id;

        const updatedItem = await Recipe.findOneAndUpdate(
            { id: parseInt(id) },
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedItem) {
            return res.status(404).json({
                success: false,
                message: 'Food item not found'
            });
        }

        console.log(`✅ Food item updated: ${updatedItem.name} (ID: ${updatedItem.id})`);

        res.status(200).json({
            success: true,
            message: 'Food item updated successfully',
            data: updatedItem
        });
    } catch (error) {
        console.error('❌ Error updating food item:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update food item',
            error: error.message
        });
    }
};

/**
 * Delete a food item (Admin only)
 */
module.exports.deleteFoodItem = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedItem = await Recipe.findOneAndDelete({ id: parseInt(id) });

        if (!deletedItem) {
            return res.status(404).json({
                success: false,
                message: 'Food item not found'
            });
        }

        console.log(`✅ Food item deleted: ${deletedItem.name} (ID: ${deletedItem.id})`);

        res.status(200).json({
            success: true,
            message: 'Food item deleted successfully',
            data: deletedItem
        });
    } catch (error) {
        console.error('❌ Error deleting food item:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete food item',
            error: error.message
        });
    }
};

/**
 * Upload image to Cloudinary (Admin only)
 * Returns the image URL to be used when creating/updating food items
 */
module.exports.uploadImage = async (req, res) => {
    try {
        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file uploaded'
            });
        }

        console.log(`📤 Uploading image: ${req.file.originalname}`);

        // Upload to Cloudinary
        const result = await uploadToCloudinary(req.file.buffer);

        console.log(`✅ Image uploaded successfully: ${result.secure_url}`);

        res.status(200).json({
            success: true,
            message: 'Image uploaded successfully',
            data: {
                url: result.secure_url,
                publicId: result.public_id,
                width: result.width,
                height: result.height,
                format: result.format,
                size: result.bytes
            }
        });
    } catch (error) {
        console.error('❌ Error uploading image:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload image',
            error: error.message
        });
    }
};



