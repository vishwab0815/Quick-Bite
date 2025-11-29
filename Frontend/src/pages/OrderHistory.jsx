import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from './Navbar';
import { FiPackage, FiClock, FiCheckCircle, FiTruck, FiXCircle } from 'react-icons/fi';
import { showToast } from '../utils/toast';

export default function OrderHistory() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/success/orders`, {
                withCredentials: true
            });

            if (res.data.success) {
                setOrders(res.data.orders);
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
            if (error.response?.status === 401) {
                showToast.error('Please login to view orders');
                navigate('/signin');
            } else {
                showToast.error('Failed to fetch orders');
            }
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status) => {
        switch (status?.toLowerCase()) {
            case 'pending':
                return <FiClock className="w-5 h-5" />;
            case 'confirmed':
            case 'preparing':
                return <FiPackage className="w-5 h-5" />;
            case 'ready':
                return <FiTruck className="w-5 h-5" />;
            case 'delivered':
                return <FiCheckCircle className="w-5 h-5" />;
            case 'cancelled':
                return <FiXCircle className="w-5 h-5" />;
            default:
                return <FiClock className="w-5 h-5" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'confirmed':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'preparing':
                return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'ready':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'delivered':
                return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'cancelled':
                return 'bg-red-100 text-red-800 border-red-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const filteredOrders = orders.filter(order => {
        if (filter === 'all') return true;
        return order.status?.toLowerCase() === filter;
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-4xl font-bold text-gray-800 mb-2">
                        Order History
                    </h1>
                    <p className="text-gray-600">Track and manage all your orders</p>
                </motion.div>

                {/* Filter Tabs */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-8 flex flex-wrap gap-3"
                >
                    {['all', 'pending', 'confirmed', 'preparing', 'ready', 'delivered'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-6 py-2.5 rounded-full font-medium transition-all
                                ${filter === status
                                    ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-200'
                                    : 'bg-white text-gray-600 hover:bg-gray-50 border-2 border-gray-200'
                                }
                            `}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                    ))}
                </motion.div>

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
                {!loading && filteredOrders.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-20"
                    >
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-6">
                            <FiPackage className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">No orders found</h3>
                        <p className="text-gray-600 mb-6">
                            {filter === 'all'
                                ? "You haven't placed any orders yet"
                                : `No ${filter} orders`
                            }
                        </p>
                        <button
                            onClick={() => navigate('/home')}
                            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-full font-semibold hover:shadow-lg transition-all"
                        >
                            Start Shopping
                        </button>
                    </motion.div>
                )}

                {/* Orders List */}
                <div className="space-y-6">
                    <AnimatePresence>
                        {filteredOrders.map((order, index) => (
                            <motion.div
                                key={order._id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ delay: index * 0.05 }}
                                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden border border-white/20 hover:shadow-xl transition-all"
                            >
                                {/* Order Header */}
                                <div className="p-6 border-b border-gray-100">
                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                        <div>
                                            <p className="text-sm text-gray-500 mb-1">Order ID</p>
                                            <p className="font-mono text-gray-800 font-semibold">
                                                #{order._id?.slice(-8)}
                                            </p>
                                        </div>

                                        <div className={`px-4 py-2 rounded-full border-2 flex items-center gap-2 ${getStatusColor(order.status)}`}>
                                            {getStatusIcon(order.status)}
                                            <span className="font-semibold capitalize">
                                                {order.status || 'Pending'}
                                            </span>
                                        </div>

                                        <div className="text-right">
                                            <p className="text-sm text-gray-500 mb-1">Order Date</p>
                                            <p className="text-gray-800 font-medium">
                                                {new Date(order.orderDate).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Order Details */}
                                <div className="p-6">
                                    {/* Items */}
                                    {order.items && order.items.length > 0 && (
                                        <div className="mb-4">
                                            <h4 className="text-sm font-semibold text-gray-700 mb-3">Items Ordered:</h4>
                                            <div className="space-y-2">
                                                {order.items.map((item, idx) => (
                                                    <div key={idx} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                                                        {item.image && (
                                                            <img
                                                                src={item.image}
                                                                alt={item.name}
                                                                className="w-12 h-12 rounded-lg object-cover"
                                                            />
                                                        )}
                                                        <div className="flex-1">
                                                            <p className="font-medium text-gray-800">{item.name}</p>
                                                            <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                                                        </div>
                                                        <p className="font-semibold text-gray-800">
                                                            ${(item.price * item.quantity).toFixed(2)}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Delivery Address */}
                                    {order.deliveryAddress && (
                                        <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                                            <h4 className="text-sm font-semibold text-gray-700 mb-2">Delivery Address:</h4>
                                            <p className="text-gray-700">{order.deliveryAddress}</p>
                                        </div>
                                    )}

                                    {/* Payment Method */}
                                    {order.paymentMethod && (
                                        <div className="mb-4">
                                            <p className="text-sm text-gray-600">
                                                Payment: <span className="font-medium text-gray-800 capitalize">{order.paymentMethod}</span>
                                            </p>
                                        </div>
                                    )}

                                    {/* Total */}
                                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                                        <span className="text-lg font-semibold text-gray-800">Total Amount:</span>
                                        <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-pink-600">
                                            ${order.totalAmount?.toFixed(2) || '0.00'}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
