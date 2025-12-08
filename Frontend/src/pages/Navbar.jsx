import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMenu, FiX, FiUser, FiLogOut, FiShoppingCart, FiPackage, FiSettings } from 'react-icons/fi';
import { RiRestaurantFill } from 'react-icons/ri';
import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useCart } from '../context/CartContext';

const Navbar = ({ user: userProp }) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [user, setUser] = useState(userProp || null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
    const buttonRef = useRef(null);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();
    const { toggleCart, getCartCount } = useCart();
    const cartCount = getCartCount();

    // Fetch user profile if not provided as prop
    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/profile`, {
                    withCredentials: true
                });
                console.log('✅ Navbar - User fetched:', res.data.user);
                setUser(res.data.user);
            } catch (error) {
                // Silently fail - user is not logged in
                console.log('⚠️ Navbar - User not logged in');
                setUser(null);
            }
        };

        // Only fetch if user wasn't provided as prop
        if (!userProp) {
            fetchUserProfile();
        } else {
            console.log('✅ Navbar - User from prop:', userProp);
        }
    }, [userProp]);

    const handleLogout = async () => {
        try {
            await axios.post(
                `${import.meta.env.VITE_API_URL}/api/auth/logout`,
                {},
                { withCredentials: true }
            );
            setUser(null);
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

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showDropdown) {
                const isClickInside =
                    event.target.closest('.profile-dropdown-container') ||
                    (dropdownRef.current && dropdownRef.current.contains(event.target));

                if (!isClickInside) {
                    setShowDropdown(false);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showDropdown]);

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
            className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 overflow-visible ${
                scrolled ? 'bg-white/95 backdrop-blur-xl shadow-lg shadow-orange-500/5' : 'bg-white shadow-md'
            }`}
        >
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 overflow-visible">
                <div className="flex justify-between items-center h-16 md:h-20 overflow-visible">
                    {/* Logo/Brand */}
                    <Link to="/" className="flex items-center space-x-3 group">
                        <motion.div
                            whileHover={{ rotate: 360, scale: 1.1 }}
                            transition={{ duration: 0.6 }}
                            className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-orange-500 via-pink-500 to-purple-500 flex items-center justify-center shadow-lg shadow-orange-500/30"
                        >
                            <RiRestaurantFill className="text-white text-xl md:text-2xl" />
                        </motion.div>
                        <span className="text-2xl md:text-3xl font-bold font-display tracking-tight bg-gradient-to-r from-orange-600 via-pink-600 to-purple-600 bg-clip-text text-transparent">
                            QuickBite
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
                        {['Home', 'Menu', 'About', 'Contact'].map((label) => (
                            <Link
                                key={label}
                                to={`/${label.toLowerCase()}`}
                                className="relative group px-4 py-2 text-gray-700 hover:text-orange-600 transition-all duration-300 font-medium text-sm lg:text-base"
                            >
                                <span className="relative z-10">{label}</span>
                                <motion.span
                                    className="absolute inset-0 bg-gradient-to-r from-orange-50 to-pink-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                    initial={false}
                                />
                                <span className="absolute left-1/2 -translate-x-1/2 bottom-0 w-0 h-0.5 bg-gradient-to-r from-orange-500 to-pink-500 transition-all duration-300 group-hover:w-3/4 rounded-full"></span>
                            </Link>
                        ))}

                        {/* Cart Button */}
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={toggleCart}
                            className="relative ml-2 p-3 text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all duration-300"
                        >
                            <FiShoppingCart className="text-xl lg:text-2xl" />
                            {cartCount > 0 && (
                                <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    whileHover={{ scale: 1.1 }}
                                    className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg"
                                >
                                    {cartCount > 99 ? '99+' : cartCount}
                                </motion.span>
                            )}
                        </motion.button>

                        {user ? (
                            <div className="relative ml-2 profile-dropdown-container">
                                <motion.button
                                    ref={buttonRef}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                        if (!showDropdown && buttonRef.current) {
                                            const rect = buttonRef.current.getBoundingClientRect();
                                            setDropdownPos({
                                                top: rect.bottom + 8,
                                                right: window.innerWidth - rect.right
                                            });
                                        }
                                        console.log('🔘 Profile clicked! Current dropdown:', showDropdown, 'User:', user);
                                        setShowDropdown(!showDropdown);
                                    }}
                                    className="flex items-center space-x-2 focus:outline-none group"
                                    aria-label="User menu"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 via-pink-500 to-purple-500 flex items-center justify-center text-white font-bold font-display shadow-lg shadow-orange-500/30 cursor-pointer group-hover:shadow-xl group-hover:shadow-orange-500/40 transition-all duration-300 ring-2 ring-white">
                                        {user.name[0].toUpperCase()}
                                    </div>
                                </motion.button>

                                {showDropdown && createPortal(
                                    <motion.div
                                        ref={dropdownRef}
                                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                        transition={{ duration: 0.15 }}
                                        className="fixed w-64 bg-white rounded-2xl shadow-2xl py-2 border border-gray-100 z-[9999] overflow-hidden"
                                        style={{
                                            top: `${dropdownPos.top}px`,
                                            right: `${dropdownPos.right}px`
                                        }}
                                    >
                                            <div className="px-4 py-3 bg-gradient-to-r from-orange-50 to-pink-50 border-b border-gray-100">
                                                <p className="text-sm font-bold text-gray-900 font-display">
                                                    {user.name}
                                                </p>
                                                <p className="text-xs text-gray-600 truncate mt-0.5">
                                                    {user.email}
                                                </p>
                                            </div>
                                            <Link
                                                to="/orders"
                                                className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 hover:text-orange-600 transition-all font-medium"
                                                onClick={() => setShowDropdown(false)}
                                            >
                                                <FiPackage className="mr-3 text-base" />
                                                My Orders
                                            </Link>
                                            {user?.role === 'admin' && (
                                                <Link
                                                    to="/admin"
                                                    className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 hover:text-orange-600 transition-all font-medium"
                                                    onClick={() => setShowDropdown(false)}
                                                >
                                                    <FiSettings className="mr-3 text-base" />
                                                    Admin Dashboard
                                                </Link>
                                            )}
                                            <div className="my-1 border-t border-gray-100"></div>
                                            <button
                                                onClick={handleLogout}
                                                className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-all font-medium"
                                            >
                                                <FiLogOut className="mr-3 text-base" />
                                                Sign out
                                            </button>
                                        </motion.div>,
                                        document.body
                                    )}
                            </div>
                        ) : (
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="ml-2"
                            >
                                <Link
                                    to="/signin"
                                    className="inline-block px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 text-white font-semibold shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transition-all duration-300"
                                >
                                    Sign In
                                </Link>
                            </motion.div>
                        )}
                    </nav>

                    {/* Mobile Menu Button */}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="md:hidden p-2.5 rounded-xl text-gray-700 hover:text-orange-600 hover:bg-orange-50 focus:outline-none transition-all duration-300"
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
                                    <FiX size={26} />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="menu"
                                    initial={{ opacity: 0, rotate: 90 }}
                                    animate={{ opacity: 1, rotate: 0 }}
                                    exit={{ opacity: 0, rotate: -90 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <FiMenu size={26} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.button>
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
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                            onClick={() => setMenuOpen(false)}
                        />
                        <motion.nav
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            variants={mobileMenuVariants}
                            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                            className="fixed top-0 right-0 w-80 h-full bg-gradient-to-br from-white to-orange-50/30 z-50 shadow-2xl border-l border-gray-200"
                        >
                            <div className="h-full flex flex-col">
                                <div className="px-6 py-6 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 flex justify-between items-center">
                                    <Link
                                        to="/"
                                        className="flex items-center space-x-3"
                                        onClick={() => setMenuOpen(false)}
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                            <RiRestaurantFill className="text-white text-xl" />
                                        </div>
                                        <span className="text-2xl font-bold font-display text-white">
                                            QuickBite
                                        </span>
                                    </Link>
                                    <motion.button
                                        whileHover={{ scale: 1.1, rotate: 90 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => setMenuOpen(false)}
                                        className="p-2 rounded-xl hover:bg-white/20 transition-colors"
                                    >
                                        <FiX size={22} className="text-white" />
                                    </motion.button>
                                </div>

                                <div className="flex-1 px-6 py-8 flex flex-col space-y-2">
                                    {['Home', 'Menu', 'About', 'Contact'].map((label, index) => (
                                        <motion.div
                                            key={label}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.1 + index * 0.05 }}
                                        >
                                            <Link
                                                to={`/${label.toLowerCase()}`}
                                                onClick={() => setMenuOpen(false)}
                                                className="block text-lg font-semibold text-gray-800 hover:text-orange-600 hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 px-4 py-3 rounded-xl transition-all"
                                            >
                                                {label}
                                            </Link>
                                        </motion.div>
                                    ))}
                                </div>

                                {user ? (
                                    <div className="px-6 py-5 bg-gradient-to-r from-orange-50 to-pink-50 border-t border-gray-200">
                                        <div className="flex items-center space-x-3 mb-4">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 via-pink-500 to-purple-500 flex items-center justify-center text-white font-bold font-display shadow-lg">
                                                {user.name[0].toUpperCase()}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-bold text-gray-900 font-display">
                                                    {user.name}
                                                </p>
                                                <p className="text-sm text-gray-600 truncate">
                                                    {user.email}
                                                </p>
                                            </div>
                                        </div>
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => {
                                                handleLogout();
                                                setMenuOpen(false);
                                            }}
                                            className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 rounded-xl text-white font-semibold shadow-lg transition-all"
                                        >
                                            <FiLogOut className="mr-2" />
                                            Sign Out
                                        </motion.button>
                                    </div>
                                ) : (
                                    <div className="px-6 py-5 bg-gradient-to-r from-orange-50 to-pink-50 border-t border-gray-200">
                                        <motion.div
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <Link
                                                to="/signin"
                                                onClick={() => setMenuOpen(false)}
                                                className="block w-full text-center px-6 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 text-white font-bold shadow-lg hover:shadow-xl transition-all"
                                            >
                                                Sign In
                                            </Link>
                                        </motion.div>
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