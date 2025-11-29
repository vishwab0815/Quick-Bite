const express = require('express');
const mongoose = require('mongoose');

const fs = require('fs').promises;
const path = require('path');
const Recipe = require('../models/fooditems.model'); // Import your Recipe model

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



