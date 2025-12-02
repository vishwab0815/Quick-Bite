import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from './Navbar';
import { FiPackage, FiClock, FiCheckCircle, FiTruck, FiXCircle, FiRefreshCw, FiUsers } from 'react-icons/fi';
import { showToast } from '../utils/toast';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [updatingOrderId, setUpdatingOrderId] = useState(null);

    useEffect(() => {
        fetchAllOrders();
    }, []);

    const fetchAllOrders = async () => {
        try {
            setLoading(true);
            // Use admin-specific endpoint to get all orders from all users
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/success/admin/orders`, {
                withCredentials: true
            });

            if (res.data.success) {
                setOrders(res.data.orders);
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
            if (error.response?.status === 401) {
                showToast.error('Please login to access admin panel');
                navigate('/signin');
            } else if (error.response?.status === 403) {
                showToast.error('Access denied. Admin privileges required.');
                navigate('/home');
            } else {
                showToast.error('Failed to fetch orders');
            }
        } finally {
            setLoading(false);
        }
    };

    const updateOrderStatus = async (orderId, newStatus) => {
        try {
            setUpdatingOrderId(orderId);
            const res = await axios.patch(
                `${import.meta.env.VITE_API_URL}/success/order/${orderId}/status`,
                { status: newStatus },
                { withCredentials: true }
            );

            if (res.data.success) {
                showToast.success(`Order status updated to ${newStatus}`);
                // Update local state
                setOrders(orders.map(order =>
                    order._id === orderId ? { ...order, status: newStatus } : order
                ));
            }
        } catch (error) {
            console.error('Error updating order:', error);
            showToast.error(error.response?.data?.message || 'Failed to update order status');
        } finally {
            setUpdatingOrderId(null);
        }
    };

    const getStatusIcon = (status) => {
        switch (status?.toLowerCase()) {
            case 'pending':
                return <FiClock className="w-4 h-4" />;
            case 'confirmed':
            case 'preparing':
                return <FiPackage className="w-4 h-4" />;
            case 'ready':
                return <FiTruck className="w-4 h-4" />;
            case 'delivered':
                return <FiCheckCircle className="w-4 h-4" />;
            case 'cancelled':
                return <FiXCircle className="w-4 h-4" />;
            default:
                return <FiClock className="w-4 h-4" />;
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

    const stats = {
        total: orders.length,
        pending: orders.filter(o => o.status?.toLowerCase() === 'pending').length,
        confirmed: orders.filter(o => o.status?.toLowerCase() === 'confirmed').length,
        preparing: orders.filter(o => o.status?.toLowerCase() === 'preparing').length,
        ready: orders.filter(o => o.status?.toLowerCase() === 'ready').length,
        delivered: orders.filter(o => o.status?.toLowerCase() === 'delivered').length,
    };

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
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl">
                            <FiUsers className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-4xl font-bold text-gray-800">
                            Admin Dashboard
                        </h1>
                    </div>
                    <p className="text-gray-600">Manage and approve customer orders</p>
                </motion.div>

                {/* Stats Cards */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8"
                >
                    {[
                        { label: 'Total', count: stats.total, color: 'from-gray-500 to-gray-600' },
                        { label: 'Pending', count: stats.pending, color: 'from-yellow-500 to-yellow-600' },
                        { label: 'Confirmed', count: stats.confirmed, color: 'from-blue-500 to-blue-600' },
                        { label: 'Preparing', count: stats.preparing, color: 'from-purple-500 to-purple-600' },
                        { label: 'Ready', count: stats.ready, color: 'from-green-500 to-green-600' },
                        { label: 'Delivered', count: stats.delivered, color: 'from-emerald-500 to-emerald-600' },
                    ].map((stat, idx) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.15 + idx * 0.05 }}
                            className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-white/20"
                        >
                            <div className={`inline-flex px-3 py-1 rounded-full bg-gradient-to-r ${stat.color} text-white text-xs font-semibold mb-2`}>
                                {stat.label}
                            </div>
                            <p className="text-3xl font-bold text-gray-800">{stat.count}</p>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Filter Tabs */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
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
                    <button
                        onClick={fetchAllOrders}
                        className="ml-auto px-6 py-2.5 rounded-full font-medium bg-white text-gray-600 hover:bg-gray-50 border-2 border-gray-200 flex items-center gap-2 transition-all"
                    >
                        <FiRefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
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
                        <p className="text-gray-600">
                            {filter === 'all' ? 'No orders yet' : `No ${filter} orders`}
                        </p>
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
                                transition={{ delay: index * 0.03 }}
                                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden border border-white/20 hover:shadow-xl transition-all"
                            >
                                {/* Order Header */}
                                <div className="p-6 bg-gradient-to-r from-orange-500/10 to-pink-500/10 border-b border-gray-100">
                                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                                        <div>
                                            <p className="text-sm text-gray-500 mb-1">Order ID</p>
                                            <p className="font-mono text-gray-800 font-semibold text-lg">
                                                #{order._id?.slice(-8)}
                                            </p>
                                        </div>

                                        <div className={`px-4 py-2 rounded-full border-2 flex items-center gap-2 ${getStatusColor(order.status)}`}>
                                            {getStatusIcon(order.status)}
                                            <span className="font-semibold capitalize text-sm">
                                                {order.status || 'Pending'}
                                            </span>
                                        </div>

                                        <div className="text-right">
                                            <p className="text-sm text-gray-500 mb-1">Order Date</p>
                                            <p className="text-gray-800 font-medium">
                                                {new Date(order.orderDate).toLocaleString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Customer Info */}
                                    {order.userId && (
                                        <div className="flex items-center gap-2 bg-white/60 px-4 py-2 rounded-lg">
                                            <FiUsers className="w-4 h-4 text-gray-600" />
                                            <div>
                                                <span className="text-sm text-gray-600">Customer: </span>
                                                <span className="font-semibold text-gray-800">
                                                    {order.userId.name || 'Unknown'}
                                                </span>
                                                <span className="text-sm text-gray-500 ml-2">
                                                    ({order.userId.email || 'No email'})
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Order Details */}
                                <div className="p-6">
                                    {/* Items */}
                                    {order.items && order.items.length > 0 && (
                                        <div className="mb-6">
                                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                                <FiPackage className="w-4 h-4" />
                                                Items Ordered:
                                            </h4>
                                            <div className="space-y-2">
                                                {order.items.map((item, idx) => (
                                                    <div key={idx} className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                        {item.image && (
                                                            <img
                                                                src={item.image}
                                                                alt={item.name}
                                                                className="w-14 h-14 rounded-lg object-cover border-2 border-white shadow-sm"
                                                            />
                                                        )}
                                                        <div className="flex-1">
                                                            <p className="font-semibold text-gray-800">{item.name}</p>
                                                            <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                                                        </div>
                                                        <p className="font-bold text-gray-800 text-lg">
                                                            ${(item.price * item.quantity).toFixed(2)}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                                        {/* Delivery Address */}
                                        {order.deliveryAddress && (
                                            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                                                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                                    <FiTruck className="w-4 h-4 text-blue-600" />
                                                    Delivery Address:
                                                </h4>
                                                <p className="text-gray-700">{order.deliveryAddress}</p>
                                            </div>
                                        )}

                                        {/* Payment Method */}
                                        {order.paymentMethod && (
                                            <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                                                <h4 className="text-sm font-semibold text-gray-700 mb-2">Payment Method:</h4>
                                                <p className="text-gray-800 font-medium capitalize">{order.paymentMethod}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Total & Actions */}
                                    <div className="pt-6 border-t border-gray-200">
                                        <div className="flex flex-wrap items-center justify-between gap-4">
                                            <div>
                                                <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                                                <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-pink-600">
                                                    ${order.totalAmount?.toFixed(2) || '0.00'}
                                                </p>
                                            </div>

                                            {/* Status Update Buttons */}
                                            <div className="flex flex-wrap gap-2">
                                                {['pending', 'confirmed', 'preparing', 'ready', 'delivered'].map((status) => (
                                                    <button
                                                        key={status}
                                                        onClick={() => updateOrderStatus(order._id, status)}
                                                        disabled={updatingOrderId === order._id || order.status?.toLowerCase() === status}
                                                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2
                                                            ${order.status?.toLowerCase() === status
                                                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                                                : 'bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:shadow-lg hover:scale-105'
                                                            }
                                                            ${updatingOrderId === order._id ? 'opacity-50 cursor-wait' : ''}
                                                        `}
                                                    >
                                                        {getStatusIcon(status)}
                                                        <span className="capitalize">{status}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
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
