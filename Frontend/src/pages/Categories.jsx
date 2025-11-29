import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    FaUtensils,
    FaCoffee,
    FaHamburger,
    FaPizzaSlice,
    FaIceCream,
    FaLeaf,
    FaDrumstickBite,
    FaAppleAlt,
} from "react-icons/fa";

const Categories = ({ Item, setItem }) => {
    const [visible, setVisible] = useState(false);
    const sectionRef = useRef(null);

    const category = [
        { name: "Breakfast", icon: <FaCoffee />, gradient: "from-amber-400 to-orange-500" },
        { name: "Lunch", icon: <FaUtensils />, gradient: "from-orange-400 to-pink-500" },
        { name: "Dinner", icon: <FaDrumstickBite />, gradient: "from-pink-400 to-purple-500" },
        { name: "Snack", icon: <FaAppleAlt />, gradient: "from-green-400 to-emerald-500" },
        { name: "Dessert", icon: <FaIceCream />, gradient: "from-purple-400 to-pink-500" },
        { name: "Appetizer", icon: <FaPizzaSlice />, gradient: "from-red-400 to-orange-500" },
        { name: "Side Dish", icon: <FaLeaf />, gradient: "from-lime-400 to-green-500" },
        { name: "Main Course", icon: <FaHamburger />, gradient: "from-yellow-400 to-orange-500" },
    ];

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.08,
                delayChildren: 0.2,
            },
        },
    };

    const itemVariants = {
        hidden: { y: 30, opacity: 0, scale: 0.8 },
        show: {
            y: 0,
            opacity: 1,
            scale: 1,
            transition: {
                type: "spring",
                stiffness: 200,
                damping: 15,
            },
        },
    };

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => setVisible(entry.isIntersecting),
            { threshold: 0.1 }
        );
        if (sectionRef.current) observer.observe(sectionRef.current);
        return () => {
            if (sectionRef.current) observer.unobserve(sectionRef.current);
        };
    }, []);

    return (
        <>
            {/* Trigger visibility */}
            <div ref={sectionRef} className="h-[20px] w-full" />

            <AnimatePresence>
                {visible && (
                    <div className="fixed bottom-6 left-0 right-0 flex justify-center z-40 px-4">
                        <motion.div
                            initial={{ y: 100, opacity: 0, scale: 0.95 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 100, opacity: 0, scale: 0.95 }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="relative"
                        >
                            {/* Glow effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full blur-xl opacity-30 -z-10"></div>

                            {/* Main container */}
                            <div className="bg-white/95 backdrop-blur-md border-2 border-white shadow-2xl w-[90vw] max-w-6xl rounded-full overflow-hidden">
                                {/* Gradient top border */}
                                <div className="h-1 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500"></div>

                                <motion.div
                                    variants={container}
                                    initial="hidden"
                                    animate="show"
                                    className="flex h-[70px] sm:h-[80px] items-center justify-evenly px-2 sm:px-4"
                                >
                                    {category.map((cat) => (
                                        <motion.div
                                            key={cat.name}
                                            variants={itemVariants}
                                            onClick={() => setItem(cat.name)}
                                            whileHover={{ scale: 1.15, y: -4 }}
                                            whileTap={{ scale: 0.95 }}
                                            className="relative group cursor-pointer"
                                        >
                                            {/* Icon container */}
                                            <div className="relative">
                                                {/* Active state background */}
                                                {Item === cat.name ? (
                                                    <motion.div
                                                        layoutId="activeCategory"
                                                        className={`absolute inset-0 bg-gradient-to-br ${cat.gradient} rounded-2xl blur-sm opacity-50`}
                                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                    />
                                                ) : null}

                                                {/* Icon button */}
                                                <div
                                                    className={`relative w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-2xl transition-all duration-300
                                                        ${Item === cat.name
                                                            ? `bg-gradient-to-br ${cat.gradient} text-white shadow-lg scale-110`
                                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                        }
                                                    `}
                                                >
                                                    <span className="text-xl sm:text-2xl">
                                                        {cat.icon}
                                                    </span>

                                                    {/* Active indicator dot */}
                                                    {Item === cat.name && (
                                                        <motion.div
                                                            initial={{ scale: 0 }}
                                                            animate={{ scale: 1 }}
                                                            className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full border-2 border-current"
                                                        />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Tooltip */}
                                            <motion.div
                                                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                                whileHover={{ opacity: 1, y: -35, scale: 1 }}
                                                transition={{ duration: 0.2 }}
                                                className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5
                                                    bg-gradient-to-r ${cat.gradient} text-white text-xs font-semibold
                                                    rounded-lg whitespace-nowrap pointer-events-none shadow-lg
                                                    before:content-[''] before:absolute before:top-full before:left-1/2
                                                    before:-translate-x-1/2 before:border-4 before:border-transparent
                                                    before:border-t-current`}
                                            >
                                                {cat.name}
                                            </motion.div>
                                        </motion.div>
                                    ))}
                                </motion.div>

                                {/* Gradient bottom border */}
                                <div className="h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500"></div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Categories;
