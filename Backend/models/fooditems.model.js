const mongoose = require('mongoose');

const recipeSchema = new mongoose.Schema({
    id: {
        type: Number,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    ingredients: {
        type: [String],
        required: true
    },
    prepTimeMinutes: {
        type: Number,
        required: true,
        min: 0
    },
    cookTimeMinutes: {
        type: Number,
        required: true,
        min: 0
    },
    servings: {
        type: Number,
        required: true,
        min: 1
    },
    difficulty: {
        type: String,
        required: true,
        enum: ["Easy", "Medium", "Hard"]
    },
    cuisine: {
        type: String,
        required: true,
        trim: true
    },
    caloriesPerServing: {
        type: Number,
        required: true,
        min: 0
    },
    tags: {
        type: [String],
        default: []
    },
    userId: {
        type: Number,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    rating: {
        type: Number,
        min: 0,
        max: 5,
        default: 0
    },
    reviewCount: {
        type: Number,
        min: 0,
        default: 0
    },
    mealType: {
        type: [String],
        required: true,
        enum: ["Breakfast", "Lunch", "Dinner", "Snack", "Snacks", "Dessert", "Appetizer", "Side Dish", "Main course"]
    },
    customizations: {
        spiciness: {
            type: [String],
            enum: ["Mild", "Medium", "Spicy"],
            default: []
        },
        cheesiness: {
            type: [String],
            enum: ["Regular", "Extra Cheese", "Double Cheese"],
            default: []
        },
        toppings: {
            type: [String],
            default: []
        },
        protein: {
            type: [String],
            default: []
        },
        vegetableAdditions: {
            type: [String],
            default: []
        },
        salsaVariations: {
            type: [String],
            default: []
        },
        sideDishes: {
            type: [String],
            default: []
        },
        addIns: {
            type: [String],
            default: []
        },
        dressingOptions: {
            type: [String],
            default: []
        },
        size: {
            type: [String],
            default: []
        },
        garnishes: {
            type: [String],
            default: []
        },
        sauceVariations: {
            type: [String],
            default: []
        },
        riceVariations: {
            type: [String],
            default: []
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

const Recipe = mongoose.model('Recipe', recipeSchema);

module.exports = Recipe;
