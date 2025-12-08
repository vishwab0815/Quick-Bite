import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from './Navbar';
import Footer from './Footer';
import { useCart } from '../context/CartContext';
import { showToast } from '../utils/toast';
import {
    FiSearch, FiX, FiShoppingCart, FiClock, FiUsers, FiZap,
    FiFilter, FiGrid, FiList
} from 'react-icons/fi';
import {
    FaCoffee, FaUtensils, FaDrumstickBite, FaAppleAlt,
    FaIceCream, FaPizzaSlice, FaLeaf, FaHamburger
} from 'react-icons/fa';

const Menu = () => {
    const navigate = useNavigate();
    const { addToCart } = useCart();
    const [foodItems, setFoodItems] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const [sortBy, setSortBy] = useState('name'); // 'name', 'price', 'rating'

    const categories = [
        { name: 'All', icon: <FiGrid />, gradient: 'from-gray-400 to-gray-600' },
        { name: 'Breakfast', icon: <FaCoffee />, gradient: 'from-amber-400 to-orange-500' },
        { name: 'Lunch', icon: <FaUtensils />, gradient: 'from-orange-400 to-pink-500' },
        { name: 'Dinner', icon: <FaDrumstickBite />, gradient: 'from-pink-400 to-purple-500' },
        { name: 'Snack', icon: <FaAppleAlt />, gradient: 'from-green-400 to-emerald-500' },
        { name: 'Dessert', icon: <FaIceCream />, gradient: 'from-purple-400 to-pink-500' },
        { name: 'Appetizer', icon: <FaPizzaSlice />, gradient: 'from-red-400 to-orange-500' },
        { name: 'Side Dish', icon: <FaLeaf />, gradient: 'from-lime-400 to-green-500' },
        { name: 'Main Course', icon: <FaHamburger />, gradient: 'from-yellow-400 to-orange-500' },
    ];

    useEffect(() => {
        fetchAllFoodItems();
    }, []);

    useEffect(() => {
        filterAndSortItems();
    }, [foodItems, searchQuery, selectedCategory, sortBy]);

    const fetchAllFoodItems = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/fooditems/get`);
            if (res.data.success) {
                setFoodItems(res.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching food items:', error);
            showToast.error('Failed to load menu items');
        } finally {
            setLoading(false);
        }
    };

    const filterAndSortItems = () => {
        let filtered = [...foodItems];

        // Filter by category
        if (selectedCategory !== 'All') {
            filtered = filtered.filter(item =>
                item.mealType?.includes(selectedCategory)
            );
        }

        // Filter by search query
        if (searchQuery.trim()) {
            filtered = filtered.filter(item =>
                item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.cuisine.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
            );
        }

        // Sort
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'price':
                    return (a.price || 0) - (b.price || 0);
                case 'rating':
                    return (b.rating || 0) - (a.rating || 0);
                case 'name':
                default:
                    return a.name.localeCompare(b.name);
            }
        });

        setFilteredItems(filtered);
    };

    const handleAddToCart = (item) => {
        addToCart(item);
        showToast.success(`${item.name} added to cart!`);
    };

    const handleItemClick = (id) => {
        navigate(`/food/${id}`);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50">
            <Navbar />

            {/* Header Section */}
            <div className="pt-24 pb-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-8"
                    >
                        <h1 className="text-5xl md:text-6xl font-bold mb-4">
                            <span className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">
                                Our Menu
                            </span>
                        </h1>
                        <p className="text-gray-600 text-lg">
                            Discover delicious meals crafted with love
                        </p>
                    </motion.div>

                    {/* Search and Filter Bar */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-8 border border-white/20"
                    >
                        <div className="flex flex-col md:flex-row gap-4">
                            {/* Search Input */}
                            <div className="flex-1 relative">
                                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
                                <input
                                    type="text"
                                    placeholder="Search dishes, cuisines, tags..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-12 pr-10 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none transition-colors bg-white text-gray-900 placeholder:text-gray-400"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <FiX />
                                    </button>
                                )}
                            </div>

                            {/* Sort Dropdown */}
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none cursor-pointer bg-white text-gray-900"
                            >
                                <option value="name">Sort by Name</option>
                                <option value="price">Sort by Price</option>
                                <option value="rating">Sort by Rating</option>
                            </select>

                            {/* View Mode Toggle */}
                            <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`px-4 py-2 rounded-lg transition-all ${
                                        viewMode === 'grid'
                                            ? 'bg-white text-orange-500 shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    <FiGrid className="text-xl" />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`px-4 py-2 rounded-lg transition-all ${
                                        viewMode === 'list'
                                            ? 'bg-white text-orange-500 shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    <FiList className="text-xl" />
                                </button>
                            </div>
                        </div>

                        {/* Category Filters */}
                        <div className="mt-6 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                            {categories.map((cat) => (
                                <motion.button
                                    key={cat.name}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setSelectedCategory(cat.name)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                                        selectedCategory === cat.name
                                            ? `bg-gradient-to-r ${cat.gradient} text-white shadow-lg`
                                            : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200'
                                    }`}
                                >
                                    <span className="text-lg">{cat.icon}</span>
                                    <span className="font-medium">{cat.name}</span>
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>

                    {/* Results Count */}
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-gray-600 mb-6"
                    >
                        Showing <span className="font-semibold text-gray-900">{filteredItems.length}</span> items
                        {selectedCategory !== 'All' && ` in ${selectedCategory}`}
                        {searchQuery && ` matching "${searchQuery}"`}
                    </motion.p>

                    {/* Loading State */}
                    {loading && (
                        <div className="flex justify-center items-center py-20">
                            <motion.div
                                animate={{
                                    rotate: 360,
                                    scale: [1, 1.1, 1]
                                }}
                                transition={{
                                    rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                                    scale: { duration: 1.5, repeat: Infinity, repeatType: "reverse" }
                                }}
                                className="w-16 h-16 rounded-full border-4 border-orange-500 border-t-transparent"
                            />
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && filteredItems.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-20"
                        >
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-6">
                                <FiSearch className="w-10 h-10 text-gray-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800 mb-2">No items found</h3>
                            <p className="text-gray-600 mb-6">
                                Try adjusting your search or filters
                            </p>
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setSelectedCategory('All');
                                }}
                                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-full font-medium hover:shadow-lg transition-shadow"
                            >
                                Clear Filters
                            </button>
                        </motion.div>
                    )}

                    {/* Grid View */}
                    {!loading && viewMode === 'grid' && filteredItems.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredItems.map((item, index) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    whileHover={{ y: -8 }}
                                    className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all cursor-pointer border border-white/20"
                                >
                                    {/* Image */}
                                    <div
                                        onClick={() => handleItemClick(item.id)}
                                        className="relative h-48 overflow-hidden group"
                                    >
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1">
                                            <span className="text-orange-500 font-bold">{item.rating}</span>
                                            <span className="text-yellow-500">★</span>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-5">
                                        <h3
                                            onClick={() => handleItemClick(item.id)}
                                            className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 hover:text-orange-500 transition-colors"
                                        >
                                            {item.name}
                                        </h3>

                                        <div className="flex gap-2 mb-3">
                                            <span className="bg-orange-50 text-orange-700 text-xs font-medium px-2 py-1 rounded-full">
                                                {item.cuisine}
                                            </span>
                                            <span className="bg-pink-50 text-pink-700 text-xs font-medium px-2 py-1 rounded-full">
                                                {item.difficulty}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 mb-4 text-xs text-gray-600">
                                            <div className="flex items-center gap-1">
                                                <FiClock className="text-orange-500" />
                                                <span>{item.cookTimeMinutes}m</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <FiUsers className="text-orange-500" />
                                                <span>{item.servings}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <FiZap className="text-orange-500" />
                                                <span>{item.caloriesPerServing}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-pink-500">
                                                ${item.price?.toFixed(2) || '0.00'}
                                            </span>
                                            <button
                                                onClick={() => handleAddToCart(item)}
                                                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-full font-medium hover:shadow-lg hover:scale-105 transition-all flex items-center gap-2"
                                            >
                                                <FiShoppingCart />
                                                Add
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}

                    {/* List View */}
                    {!loading && viewMode === 'list' && filteredItems.length > 0 && (
                        <div className="space-y-4">
                            {filteredItems.map((item, index) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.03 }}
                                    className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all border border-white/20 flex"
                                >
                                    {/* Image */}
                                    <div
                                        onClick={() => handleItemClick(item.id)}
                                        className="w-48 h-48 flex-shrink-0 overflow-hidden cursor-pointer group"
                                    >
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 p-6 flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-start justify-between mb-2">
                                                <h3
                                                    onClick={() => handleItemClick(item.id)}
                                                    className="text-2xl font-bold text-gray-900 hover:text-orange-500 transition-colors cursor-pointer"
                                                >
                                                    {item.name}
                                                </h3>
                                                <div className="flex items-center gap-1 bg-orange-50 px-3 py-1 rounded-full">
                                                    <span className="text-orange-500 font-bold">{item.rating}</span>
                                                    <span className="text-yellow-500">★</span>
                                                </div>
                                            </div>

                                            <div className="flex gap-2 mb-3">
                                                <span className="bg-orange-50 text-orange-700 text-sm font-medium px-3 py-1 rounded-full">
                                                    {item.cuisine}
                                                </span>
                                                <span className="bg-pink-50 text-pink-700 text-sm font-medium px-3 py-1 rounded-full">
                                                    {item.difficulty}
                                                </span>
                                            </div>

                                            <div className="flex gap-6 mb-3 text-sm text-gray-600">
                                                <div className="flex items-center gap-2">
                                                    <FiClock className="text-orange-500" />
                                                    <span>{item.cookTimeMinutes} minutes</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <FiUsers className="text-orange-500" />
                                                    <span>{item.servings} servings</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <FiZap className="text-orange-500" />
                                                    <span>{item.caloriesPerServing} cal</span>
                                                </div>
                                            </div>

                                            {item.tags && item.tags.length > 0 && (
                                                <div className="flex gap-2 flex-wrap">
                                                    {item.tags.slice(0, 4).map((tag, i) => (
                                                        <span
                                                            key={i}
                                                            className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                                                        >
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between mt-4">
                                            <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-pink-500">
                                                ${item.price?.toFixed(2) || '0.00'}
                                            </span>
                                            <button
                                                onClick={() => handleAddToCart(item)}
                                                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-full font-medium hover:shadow-lg hover:scale-105 transition-all flex items-center gap-2"
                                            >
                                                <FiShoppingCart />
                                                Add to Cart
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <Footer />
        </div>
    );
};

export default Menu;
