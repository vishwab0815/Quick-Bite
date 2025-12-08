import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FiCheckCircle, FiPackage, FiClock, FiHome, FiList } from 'react-icons/fi';
import axios from 'axios';
import Navbar from './Navbar';

const OrderSuccess = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [latestOrder, setLatestOrder] = useState(null);

    useEffect(() => {
        fetchLatestOrder();
    }, []);

    const fetchLatestOrder = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/success/orders`, {
                withCredentials: true
            });

            if (res.data.success && res.data.orders && res.data.orders.length > 0) {
                // Get the most recent order (assuming orders are sorted by date DESC)
                setLatestOrder(res.data.orders[0]);
            }
        } catch (error) {
            console.error('Error fetching order:', error);
        } finally {
            setLoading(false);
        }
    };

    const getEstimatedDeliveryTime = () => {
        const now = new Date();
        const deliveryTime = new Date(now.getTime() + 45 * 60000); // 45 minutes from now
        return deliveryTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50">
                <Navbar />
                <div className="flex items-center justify-center min-h-[80vh]">
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
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50">
            <Navbar />

            {/* Add padding-top to account for fixed navbar height */}
            <div className="pt-16 md:pt-20">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Success Animation */}
                <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                        type: "spring",
                        stiffness: 200,
                        damping: 20,
                        delay: 0.2
                    }}
                    className="flex justify-center mb-8"
                >
                    <div className="relative">
                        <div className="w-24 h-24 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-2xl">
                            <FiCheckCircle className="w-14 h-14 text-white" strokeWidth={2.5} />
                        </div>
                        <motion.div
                            initial={{ scale: 1 }}
                            animate={{ scale: [1, 1.3, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute inset-0 bg-green-400 rounded-full opacity-20"
                        />
                    </div>
                </motion.div>

                {/* Success Message */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-center mb-12"
                >
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
                        Order Placed Successfully!
                    </h1>
                    <p className="text-lg text-gray-600 mb-2">
                        Thank you for your order. We're preparing your delicious meal!
                    </p>
                    {latestOrder && (
                        <p className="text-sm text-gray-500">
                            Order ID: <span className="font-mono font-semibold">#{latestOrder._id?.slice(-8)}</span>
                        </p>
                    )}
                </motion.div>

                {/* Order Details Card */}
                {latestOrder && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden mb-8"
                    >
                        {/* Estimated Delivery */}
                        <div className="bg-gradient-to-r from-orange-500 to-pink-500 p-6 text-white">
                            <div className="flex items-center justify-center gap-3">
                                <FiClock className="w-6 h-6" />
                                <div className="text-center">
                                    <p className="text-sm opacity-90 mb-1">Estimated Delivery Time</p>
                                    <p className="text-2xl font-bold">{getEstimatedDeliveryTime()}</p>
                                </div>
                            </div>
                        </div>

                        {/* Order Items */}
                        <div className="p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <FiPackage className="w-5 h-5 text-orange-500" />
                                Your Order
                            </h3>

                            <div className="space-y-3 mb-6">
                                {latestOrder.items && latestOrder.items.map((item, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.7 + idx * 0.1 }}
                                        className="flex items-center gap-4 p-4 bg-gradient-to-r from-orange-50 to-pink-50 rounded-xl"
                                    >
                                        {item.image && (
                                            <img
                                                src={item.image}
                                                alt={item.name}
                                                className="w-16 h-16 rounded-lg object-cover border-2 border-white shadow-md"
                                            />
                                        )}
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-gray-800">{item.name}</h4>
                                            <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                                        </div>
                                        <p className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-pink-600">
                                            ${(item.price * item.quantity).toFixed(2)}
                                        </p>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Delivery Address */}
                            {latestOrder.deliveryAddress && (
                                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 mb-6">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Delivery Address</h4>
                                    <p className="text-gray-700">
                                        {typeof latestOrder.deliveryAddress === 'string'
                                            ? latestOrder.deliveryAddress
                                            : `${latestOrder.deliveryAddress.street || ''}, ${latestOrder.deliveryAddress.city || ''}, ${latestOrder.deliveryAddress.state || ''} ${latestOrder.deliveryAddress.zipCode || ''}, ${latestOrder.deliveryAddress.country || ''}`
                                        }
                                    </p>
                                </div>
                            )}

                            {/* Payment Info */}
                            <div className="grid md:grid-cols-2 gap-4 mb-6">
                                {latestOrder.paymentMethod && (
                                    <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                                        <h4 className="text-sm font-semibold text-gray-700 mb-1">Payment Method</h4>
                                        <p className="text-gray-800 font-medium capitalize">{latestOrder.paymentMethod}</p>
                                    </div>
                                )}
                                <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-1">Order Status</h4>
                                    <p className="text-gray-800 font-medium capitalize">{latestOrder.status || 'Pending'}</p>
                                </div>
                            </div>

                            {/* Total Amount */}
                            <div className="pt-6 border-t-2 border-gray-200">
                                <div className="flex items-center justify-between">
                                    <span className="text-xl font-semibold text-gray-800">Total Amount:</span>
                                    <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-pink-600">
                                        ${latestOrder.totalAmount?.toFixed(2) || '0.00'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Action Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                    className="flex flex-col sm:flex-row gap-4 justify-center"
                >
                    <button
                        onClick={() => navigate('/orders')}
                        className="flex items-center justify-center gap-2 px-8 py-4 bg-white text-gray-700 rounded-full font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all border-2 border-gray-200"
                    >
                        <FiList className="w-5 h-5" />
                        View All Orders
                    </button>
                    <button
                        onClick={() => navigate('/home')}
                        className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-full font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                    >
                        <FiHome className="w-5 h-5" />
                        Continue Shopping
                    </button>
                </motion.div>

                {/* Thank You Note */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.1 }}
                    className="mt-12 text-center"
                >
                    <p className="text-gray-600 text-sm">
                        We've sent a confirmation email with your order details.
                    </p>
                    <p className="text-gray-500 text-xs mt-2">
                        Need help? Contact our support team anytime.
                    </p>
                </motion.div>
            </div>
            </div>
        </div>
    );
};

export default OrderSuccess;
