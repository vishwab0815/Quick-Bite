import { motion } from 'framer-motion';
import { FiAward, FiUsers, FiHeart, FiTrendingUp, FiMapPin, FiClock } from 'react-icons/fi';
import Navbar from './Navbar';
import Footer from './Footer';

export default function About() {
    const stats = [
        { icon: <FiUsers className="w-8 h-8" />, value: '10,000+', label: 'Happy Customers' },
        { icon: <FiMapPin className="w-8 h-8" />, value: '500+', label: 'Partner Restaurants' },
        { icon: <FiClock className="w-8 h-8" />, value: '30min', label: 'Average Delivery' },
        { icon: <FiAward className="w-8 h-8" />, value: '4.8★', label: 'Customer Rating' }
    ];

    const values = [
        {
            icon: <FiHeart className="w-10 h-10" />,
            title: 'Customer First',
            description: 'We prioritize your satisfaction above everything else'
        },
        {
            icon: <FiAward className="w-10 h-10" />,
            title: 'Quality Food',
            description: 'Only the best restaurants and freshest ingredients'
        },
        {
            icon: <FiTrendingUp className="w-10 h-10" />,
            title: 'Fast Delivery',
            description: 'Lightning-fast delivery to your doorstep'
        },
        {
            icon: <FiUsers className="w-10 h-10" />,
            title: 'Community',
            description: 'Supporting local restaurants and communities'
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Hero Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-5xl md:text-6xl font-bold mb-6"
                    >
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 via-pink-600 to-purple-600">
                            About QuickBite
                        </span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed"
                    >
                        We're on a mission to make delicious food accessible to everyone,
                        connecting food lovers with the best local restaurants through our
                        lightning-fast delivery service.
                    </motion.p>
                </motion.div>

                {/* Stats Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20"
                >
                    {stats.map((stat, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4 + index * 0.1 }}
                            className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 text-center"
                        >
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-white mb-4">
                                {stat.icon}
                            </div>
                            <h3 className="text-3xl font-bold text-gray-800 mb-2">{stat.value}</h3>
                            <p className="text-gray-600">{stat.label}</p>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Story Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 md:p-12 shadow-xl border border-white/20 mb-20"
                >
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6">
                        Our Story
                    </h2>
                    <div className="space-y-4 text-gray-700 text-lg leading-relaxed">
                        <p>
                            QuickBite was born from a simple idea: everyone deserves access to great food,
                            delivered quickly and reliably. Founded in 2024, we started with a vision to
                            revolutionize the food delivery experience.
                        </p>
                        <p>
                            What began as a small operation in a single city has grown into a platform
                            connecting thousands of restaurants with hungry customers. We've built a
                            community of food lovers, delivery partners, and restaurant owners who share
                            our passion for great food.
                        </p>
                        <p>
                            Today, we're proud to serve over 10,000 customers, partner with 500+ restaurants,
                            and maintain an average delivery time of just 30 minutes. But we're not stopping
                            there – we're constantly innovating to make your food delivery experience even better.
                        </p>
                    </div>
                </motion.div>

                {/* Values Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="mb-20"
                >
                    <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-12">
                        Our Values
                    </h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {values.map((value, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.7 + index * 0.1 }}
                                className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all"
                            >
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-white mb-4">
                                    {value.icon}
                                </div>
                                <h3 className="text-xl font-bold text-gray-800 mb-3">{value.title}</h3>
                                <p className="text-gray-600 leading-relaxed">{value.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Team Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 rounded-3xl p-8 md:p-12 text-white text-center shadow-2xl"
                >
                    <h2 className="text-3xl md:text-4xl font-bold mb-6">
                        Join Our Journey
                    </h2>
                    <p className="text-xl mb-8 max-w-2xl mx-auto leading-relaxed">
                        Whether you're a food lover, restaurant owner, or delivery partner,
                        there's a place for you in the QuickBite family. Let's make food
                        delivery faster, better, and more enjoyable together.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <a
                            href="/register"
                            className="px-8 py-3 bg-white text-pink-600 font-bold rounded-full hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl hover:scale-105"
                        >
                            Get Started
                        </a>
                        <a
                            href="/contact"
                            className="px-8 py-3 bg-white/20 backdrop-blur-sm text-white font-bold rounded-full hover:bg-white/30 transition-all border-2 border-white hover:scale-105"
                        >
                            Contact Us
                        </a>
                    </div>
                </motion.div>
            </div>

            <Footer />
        </div>
    );
}
