import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMenu, FiX, FiUser, FiLogOut, FiShoppingCart, FiPackage, FiSettings } from 'react-icons/fi';
import { RiRestaurantFill } from 'react-icons/ri';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useCart } from '../context/CartContext';

const Navbar = ({ user }) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const navigate = useNavigate();
    const { toggleCart, getCartCount } = useCart();
    const cartCount = getCartCount();

    const handleLogout = async () => {
        try {
            await axios.post(
                `${import.meta.env.VITE_API_URL}/api/auth/logout`,
                {},
                { withCredentials: true }
            );
            navigate('/signin');
        } catch (error) {
            console.error('Logout failed:', error.message);
        }
    };

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        setMenuOpen(false);
    }, [navigate]);

    const menuVariants = {
        hidden: { opacity: 0, y: -20 },
        visible: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 },
    };

    const mobileMenuVariants = {
        hidden: { opacity: 0, x: '100%' },
        visible: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: '100%' },
    };

    return (
        <motion.header
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
                scrolled ? 'bg-white/90 backdrop-blur-md shadow-sm' : 'bg-white'
            }`}
        >
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16 md:h-20">
                    {/* Logo/Brand */}
                    <Link to="/" className="flex items-center space-x-2">
                        <RiRestaurantFill className="text-orange-500 text-2xl" />
                        <span className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
                            QuickBite
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center space-x-8">
                        {['Home', 'Menu', 'About', 'Contact'].map((label) => (
                            <Link
                                key={label}
                                to={`/${label.toLowerCase()}`}
                                className="relative group text-gray-700 hover:text-orange-500 transition-colors duration-200 font-medium"
                            >
                                {label}
                                <span className="absolute left-0 -bottom-1 w-0 h-0.5 bg-gradient-to-r from-orange-500 to-pink-500 transition-all duration-300 group-hover:w-full"></span>
                            </Link>
                        ))}

                        {/* Cart Button */}
                        <button
                            onClick={toggleCart}
                            className="relative p-2 text-gray-700 hover:text-orange-500 transition-colors"
                        >
                            <FiShoppingCart className="text-2xl" />
                            {cartCount > 0 && (
                                <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-xs rounded-full flex items-center justify-center font-semibold"
                                >
                                    {cartCount > 99 ? '99+' : cartCount}
                                </motion.span>
                            )}
                        </button>

                        {user ? (
                            <div className="relative ml-4">
                                <button
                                    onClick={() => setShowDropdown(!showDropdown)}
                                    className="flex items-center space-x-2 focus:outline-none"
                                    aria-label="User menu"
                                >
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-r from-orange-400 to-pink-400 flex items-center justify-center text-white font-semibold shadow-md">
                                        {user.name[0]}
                                    </div>
                                </button>

                                <AnimatePresence>
                                    {showDropdown && (
                                        <motion.div
                                            initial="hidden"
                                            animate="visible"
                                            exit="exit"
                                            variants={menuVariants}
                                            transition={{ duration: 0.2 }}
                                            className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 overflow-visible border border-gray-100"
                                            onMouseLeave={() => setShowDropdown(false)}
                                        >
                                            <div className="px-4 py-3 border-b border-gray-100">
                                                <p className="text-sm font-medium text-gray-900">
                                                    {user.name}
                                                </p>
                                                <p className="text-xs text-gray-500 truncate">
                                                    {user.email}
                                                </p>
                                            </div>
                                            <Link
                                                to="/orders"
                                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                onClick={() => setShowDropdown(false)}
                                            >
                                                <FiPackage className="mr-2" />
                                                My Orders
                                            </Link>
                                            {user?.role === 'admin' && (
                                                <Link
                                                    to="/admin"
                                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
                                                    onClick={() => setShowDropdown(false)}
                                                >
                                                    <FiSettings className="mr-2" />
                                                    Admin Dashboard
                                                </Link>
                                            )}
                                            <button
                                                onClick={handleLogout}
                                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
                                            >
                                                <FiLogOut className="mr-2" />
                                                Sign out
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <Link
                                to="/signin"
                                className="ml-4 px-4 py-2 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-white font-medium hover:shadow-lg hover:scale-105 transition-all duration-200"
                            >
                                Sign In
                            </Link>
                        )}
                    </nav>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden p-2 rounded-md text-gray-700 hover:text-orange-500 focus:outline-none"
                        onClick={() => setMenuOpen(!menuOpen)}
                        aria-label="Toggle menu"
                    >
                        <AnimatePresence mode="wait">
                            {menuOpen ? (
                                <motion.div
                                    key="close"
                                    initial={{ opacity: 0, rotate: -90 }}
                                    animate={{ opacity: 1, rotate: 0 }}
                                    exit={{ opacity: 0, rotate: 90 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <FiX size={24} />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="menu"
                                    initial={{ opacity: 0, rotate: 90 }}
                                    animate={{ opacity: 1, rotate: 0 }}
                                    exit={{ opacity: 0, rotate: -90 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <FiMenu size={24} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {menuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 z-40 md:hidden"
                            onClick={() => setMenuOpen(false)}
                        />
                        <motion.nav
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            variants={mobileMenuVariants}
                            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                            className="fixed top-0 right-0 w-80 h-full bg-white z-50 shadow-xl"
                        >
                            <div className="h-full flex flex-col">
                                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
                                    <Link
                                        to="/"
                                        className="flex items-center space-x-2"
                                        onClick={() => setMenuOpen(false)}
                                    >
                                        <RiRestaurantFill className="text-orange-500 text-2xl" />
                                        <span className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
                                            QuickBite
                                        </span>
                                    </Link>
                                    <button
                                        onClick={() => setMenuOpen(false)}
                                        className="p-1 rounded-full hover:bg-gray-100"
                                    >
                                        <FiX size={20} />
                                    </button>
                                </div>

                                <div className="flex-1 px-6 py-8 flex flex-col space-y-6">
                                    {['Home', 'Menu', 'About', 'Contact'].map((label) => (
                                        <Link
                                            key={label}
                                            to={`/${label.toLowerCase()}`}
                                            onClick={() => setMenuOpen(false)}
                                            className="text-lg font-medium text-gray-800 hover:text-orange-500 transition-colors"
                                        >
                                            {label}
                                        </Link>
                                    ))}
                                </div>

                                {user ? (
                                    <div className="px-6 py-4 border-t border-gray-100">
                                        <div className="flex items-center space-x-3 mb-4">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-400 to-pink-400 flex items-center justify-center text-white font-semibold shadow-md">
                                                {user.name[0]}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">
                                                    {user.name}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    {user.email}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                handleLogout();
                                                setMenuOpen(false);
                                            }}
                                            className="w-full flex items-center justify-center px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-700 font-medium transition-colors"
                                        >
                                            <FiLogOut className="mr-2" />
                                            Sign Out
                                        </button>
                                    </div>
                                ) : (
                                    <div className="px-6 py-4 border-t border-gray-100">
                                        <Link
                                            to="/signin"
                                            onClick={() => setMenuOpen(false)}
                                            className="block w-full text-center px-4 py-3 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-white font-medium hover:shadow-lg hover:scale-105 transition-all"
                                        >
                                            Sign In
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </motion.nav>
                    </>
                )}
            </AnimatePresence>
        </motion.header>
    );
};

export default Navbar;