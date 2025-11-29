import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { FiCreditCard, FiMapPin, FiShoppingBag, FiCheckCircle } from 'react-icons/fi';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import axios from 'axios';

const Checkout = () => {
    const navigate = useNavigate();
    const { cartItems, getCartTotal, clearCart } = useCart();
    const [loading, setLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('cash');

    const [deliveryInfo, setDeliveryInfo] = useState({
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
    });

    const handleInputChange = (e) => {
        setDeliveryInfo({
            ...deliveryInfo,
            [e.target.name]: e.target.value,
        });
    };

    const validateForm = () => {
        if (!deliveryInfo.street || !deliveryInfo.city || !deliveryInfo.zipCode) {
            showErrorToast('Please fill in all required delivery address fields');
            return false;
        }
        return true;
    };

    const handlePlaceOrder = async () => {
        if (!validateForm()) return;

        if (cartItems.length === 0) {
            showErrorToast('Your cart is empty');
            return;
        }

        setLoading(true);

        try {
            // Create orders for each cart item
            const orderPromises = cartItems.map(item => {
                const orderData = {
                    foodItem: {
                        name: item.name,
                        image: item.image,
                        price: parseFloat(item.price),
                    },
                    customizations: item.customizations || {},
                    quantity: item.quantity,
                    totalAmount: (parseFloat(item.price) * item.quantity),
                    deliveryAddress: deliveryInfo,
                    paymentMethod: paymentMethod,
                    paymentStatus: paymentMethod === 'cash' ? 'pending' : 'completed',
                };

                return axios.post(
                    `${import.meta.env.VITE_API_URL}/success/order`,
                    orderData,
                    { withCredentials: true }
                );
            });

            await Promise.all(orderPromises);

            // Clear cart after successful orders
            clearCart();
            showSuccessToast('Orders placed successfully!');

            // Navigate to success page
            setTimeout(() => {
                navigate('/order-success');
            }, 1000);

        } catch (error) {
            console.error('Order placement error:', error);
            showErrorToast(
                error.response?.data?.message || 'Failed to place order. Please try again.'
            );
        } finally {
            setLoading(false);
        }
    };

    if (cartItems.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center bg-white rounded-2xl p-12 shadow-xl max-w-md"
                >
                    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
                        <FiShoppingBag className="text-4xl text-gray-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-3">Your cart is empty</h2>
                    <p className="text-gray-600 mb-6">Add some items to proceed to checkout</p>
                    <Button variant="primary" onClick={() => navigate('/home')}>
                        Browse Menu
                    </Button>
                </motion.div>
            </div>
        );
    }

    const subtotal = getCartTotal();
    const taxRate = 0.08; // 8% tax
    const tax = subtotal * taxRate;
    const deliveryFee = 5.99;
    const total = subtotal + tax + deliveryFee;

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 py-12 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-3">
                        Checkout
                    </h1>
                    <p className="text-gray-600 text-lg">Complete your order</p>
                </motion.div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left Column - Forms */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Delivery Address */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white rounded-2xl p-6 shadow-lg"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 flex items-center justify-center">
                                    <FiMapPin className="text-white" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-800">Delivery Address</h2>
                            </div>

                            <div className="space-y-4">
                                <Input
                                    label="Street Address *"
                                    name="street"
                                    value={deliveryInfo.street}
                                    onChange={handleInputChange}
                                    placeholder="123 Main St"
                                    required
                                />

                                <div className="grid md:grid-cols-2 gap-4">
                                    <Input
                                        label="City *"
                                        name="city"
                                        value={deliveryInfo.city}
                                        onChange={handleInputChange}
                                        placeholder="New York"
                                        required
                                    />
                                    <Input
                                        label="State"
                                        name="state"
                                        value={deliveryInfo.state}
                                        onChange={handleInputChange}
                                        placeholder="NY"
                                    />
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <Input
                                        label="ZIP Code *"
                                        name="zipCode"
                                        value={deliveryInfo.zipCode}
                                        onChange={handleInputChange}
                                        placeholder="10001"
                                        required
                                    />
                                    <Input
                                        label="Country"
                                        name="country"
                                        value={deliveryInfo.country}
                                        onChange={handleInputChange}
                                        placeholder="United States"
                                    />
                                </div>
                            </div>
                        </motion.div>

                        {/* Payment Method */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white rounded-2xl p-6 shadow-lg"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 flex items-center justify-center">
                                    <FiCreditCard className="text-white" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-800">Payment Method</h2>
                            </div>

                            <div className="space-y-3">
                                {['cash', 'card', 'online', 'wallet'].map((method) => (
                                    <button
                                        key={method}
                                        onClick={() => setPaymentMethod(method)}
                                        className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                                            paymentMethod === method
                                                ? 'border-orange-500 bg-orange-50'
                                                : 'border-gray-200 hover:border-orange-300'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-gray-800 capitalize">
                                                {method === 'cash' && 'Cash on Delivery'}
                                                {method === 'card' && 'Credit/Debit Card'}
                                                {method === 'online' && 'Online Payment'}
                                                {method === 'wallet' && 'Digital Wallet'}
                                            </span>
                                            {paymentMethod === method && (
                                                <FiCheckCircle className="text-orange-500 text-xl" />
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Column - Order Summary */}
                    <div className="lg:col-span-1">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-white rounded-2xl p-6 shadow-lg sticky top-6"
                        >
                            <h2 className="text-2xl font-bold text-gray-800 mb-6">Order Summary</h2>

                            {/* Cart Items */}
                            <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                                {cartItems.map((item, index) => (
                                    <div key={index} className="flex gap-3 pb-3 border-b border-gray-100">
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className="w-16 h-16 rounded-lg object-cover"
                                        />
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-gray-800 text-sm">{item.name}</h4>
                                            <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                                        </div>
                                        <p className="font-semibold text-gray-800">
                                            ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {/* Price Breakdown */}
                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between text-gray-600">
                                    <span>Subtotal</span>
                                    <span>${subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>Tax (8%)</span>
                                    <span>${tax.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>Delivery Fee</span>
                                    <span>${deliveryFee.toFixed(2)}</span>
                                </div>
                                <div className="border-t-2 border-gray-200 pt-3 flex justify-between text-xl font-bold text-gray-800">
                                    <span>Total</span>
                                    <span>${total.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Place Order Button */}
                            <Button
                                variant="primary"
                                size="md"
                                fullWidth
                                onClick={handlePlaceOrder}
                                loading={loading}
                                disabled={loading}
                            >
                                Place Order
                            </Button>

                            <p className="text-xs text-gray-500 text-center mt-4">
                                By placing your order, you agree to our terms and conditions
                            </p>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
