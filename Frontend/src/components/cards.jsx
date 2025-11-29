import React from 'react';
import { motion } from 'framer-motion';

const Cards = (props) => {
    const { foodData, index, onClick } = props;
    const dataIndex = foodData[index];

    const cardVariants = {
        hidden: { opacity: 0, y: 50 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.5,
                ease: "easeOut",
                delay: index * 0.05
            }
        },
        hover: {
            scale: 1.03,
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
        },
        tap: { scale: 0.98 }
    };

    return (
        <motion.div
            onClick={onClick}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            whileTap="tap"
            variants={cardVariants}
            className="w-72 h-[32rem] flex flex-col rounded-2xl overflow-hidden shadow-lg bg-white border border-gray-100 cursor-pointer"
        >
            {/* Food Image */}
            <div className="relative h-48 overflow-hidden">
                <img
                    src={dataIndex.image}
                    alt={dataIndex.name}
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>

            <div className="flex flex-col justify-between flex-1 p-5">
                <div>
                    {/* Title and Rating */}
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xl font-bold text-gray-900 line-clamp-2 leading-tight">
                            {dataIndex.name}
                        </h3>
                        <div className="flex-shrink-0 flex items-center bg-orange-100 text-orange-800 text-sm px-2.5 py-1 rounded-full ml-2">
                            <span className="font-semibold">{dataIndex.rating}</span>
                            <span className="ml-0.5">★</span>
                        </div>
                    </div>

                    {/* Cuisine and Difficulty Badges */}
                    <div className="flex gap-2 mb-4">
                        <span className="bg-orange-50 text-orange-700 text-xs font-medium px-3 py-1.5 rounded-full border border-orange-200">
                            {dataIndex.cuisine}
                        </span>
                        <span className="bg-pink-50 text-pink-700 text-xs font-medium px-3 py-1.5 rounded-full border border-pink-200">
                            {dataIndex.difficulty}
                        </span>
                    </div>

                    {/* Meta Info Grid */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="flex flex-col items-center text-center">
                            <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-orange-100 to-pink-100 rounded-full mb-1">
                                <ClockIcon className="w-4 h-4 text-orange-600" />
                            </div>
                            <span className="text-xs font-medium text-gray-600">{dataIndex.cookTimeMinutes} min</span>
                        </div>
                        <div className="flex flex-col items-center text-center">
                            <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-orange-100 to-pink-100 rounded-full mb-1">
                                <UserIcon className="w-4 h-4 text-orange-600" />
                            </div>
                            <span className="text-xs font-medium text-gray-600">3 serves</span>
                        </div>
                        <div className="flex flex-col items-center text-center">
                            <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-orange-100 to-pink-100 rounded-full mb-1">
                                <FireIcon className="w-4 h-4 text-orange-600" />
                            </div>
                            <span className="text-xs font-medium text-gray-600">280 cal</span>
                        </div>
                    </div>

                    {/* Tags */}
                    <div className="mb-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tags</p>
                        <div className="flex gap-2 flex-wrap">
                            {dataIndex.tags.slice(0, 3).map((item, i) => (
                                <motion.div
                                    key={i}
                                    whileHover={{ scale: 1.05 }}
                                    className="bg-gradient-to-r from-orange-50 to-pink-50 text-orange-700 text-xs font-medium px-3 py-1 rounded-full border border-orange-200"
                                >
                                    {item}
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Meal Type Badges */}
                <div className="flex flex-wrap gap-2 mt-auto pt-3 border-t border-gray-100">
                    {dataIndex.mealType.map((item, i) => (
                        <motion.span
                            key={i}
                            whileHover={{ scale: 1.05 }}
                            className="bg-gradient-to-r from-pink-50 to-purple-50 text-pink-700 text-xs font-medium px-3 py-1 rounded-full border border-pink-200"
                        >
                            {item}
                        </motion.span>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};

const ClockIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const UserIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);

const FireIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
    </svg>
);

export default Cards;
