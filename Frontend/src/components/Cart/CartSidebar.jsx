import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiShoppingCart, FiPlus, FiMinus, FiTrash2 } from 'react-icons/fi';
import { useCart } from '../../context/CartContext';
import Button from '../common/Button';
import { useNavigate } from 'react-router-dom';

const CartSidebar = () => {
    const {
        cartItems,
        isCartOpen,
        setIsCartOpen,
        updateQuantity,
        removeFromCart,
        getCartTotal,
        getCartCount,
        clearCart,
    } = useCart();

    const navigate = useNavigate();

    const handleCheckout = () => {
        if (cartItems.length === 0) return;
        // Navigate to checkout or order placement
        setIsCartOpen(false);
        // TODO: Implement checkout logic
        navigate('/checkout');
    };

    return (
        <AnimatePresence>
            {isCartOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsCartOpen(false)}
                        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
                    />

                    {/* Sidebar */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50 flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-pink-50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 flex items-center justify-center">
                                    <FiShoppingCart className="text-white text-lg" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800">Your Cart</h2>
                                    <p className="text-sm text-gray-600">
                                        {getCartCount()} {getCartCount() === 1 ? 'item' : 'items'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsCartOpen(false)}
                                className="p-2 hover:bg-white rounded-full transition-colors"
                            >
                                <FiX className="text-2xl text-gray-600" />
                            </button>
                        </div>

                        {/* Cart Items */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {cartItems.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex flex-col items-center justify-center h-full text-center"
                                >
                                    <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                        <FiShoppingCart className="text-4xl text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                        Your cart is empty
                                    </h3>
                                    <p className="text-gray-600 mb-6">
                                        Add some delicious items to get started!
                                    </p>
                                    <Button
                                        variant="primary"
                                        size="md"
                                        onClick={() => setIsCartOpen(false)}
                                    >
                                        Continue Shopping
                                    </Button>
                                </motion.div>
                            ) : (
                                <div className="space-y-4">
                                    {cartItems.map((item, index) => (
                                        <motion.div
                                            key={`${item._id}-${index}`}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
                                        >
                                            <div className="flex gap-3">
                                                {/* Image */}
                                                <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                                                    <img
                                                        src={item.image}
                                                        alt={item.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>

                                                {/* Details */}
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-semibold text-gray-800 truncate">
                                                        {item.name}
                                                    </h4>
                                                    <p className="text-sm text-gray-600 mb-2">
                                                        ${parseFloat(item.price).toFixed(2)}
                                                    </p>

                                                    {/* Customizations */}
                                                    {item.customizations &&
                                                        Object.keys(item.customizations).length > 0 && (
                                                            <div className="text-xs text-gray-500 mb-2">
                                                                {Object.entries(item.customizations).map(
                                                                    ([key, value]) => (
                                                                        <div key={key}>
                                                                            {value.label}
                                                                            {value.price > 0 &&
                                                                                ` (+$${value.price})`}
                                                                        </div>
                                                                    )
                                                                )}
                                                            </div>
                                                        )}

                                                    {/* Quantity Controls */}
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() =>
                                                                updateQuantity(
                                                                    item._id,
                                                                    item.quantity - 1,
                                                                    item.customizations
                                                                )
                                                            }
                                                            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                                                        >
                                                            <FiMinus className="text-sm" />
                                                        </button>
                                                        <span className="w-8 text-center font-semibold">
                                                            {item.quantity}
                                                        </span>
                                                        <button
                                                            onClick={() =>
                                                                updateQuantity(
                                                                    item._id,
                                                                    item.quantity + 1,
                                                                    item.customizations
                                                                )
                                                            }
                                                            className="w-7 h-7 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white flex items-center justify-center transition-all"
                                                        >
                                                            <FiPlus className="text-sm" />
                                                        </button>

                                                        <button
                                                            onClick={() =>
                                                                removeFromCart(
                                                                    item._id,
                                                                    item.customizations
                                                                )
                                                            }
                                                            className="ml-auto p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        >
                                                            <FiTrash2 className="text-sm" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}

                                    {/* Clear Cart Button */}
                                    {cartItems.length > 0 && (
                                        <button
                                            onClick={clearCart}
                                            className="w-full text-sm text-red-600 hover:text-red-700 font-medium py-2"
                                        >
                                            Clear Cart
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer with Total and Checkout */}
                        {cartItems.length > 0 && (
                            <div className="border-t border-gray-200 p-4 space-y-4 bg-gray-50">
                                {/* Subtotal */}
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Subtotal:</span>
                                    <span className="text-lg font-semibold text-gray-800">
                                        ${getCartTotal().toFixed(2)}
                                    </span>
                                </div>

                                {/* Tax & Delivery Info */}
                                <p className="text-xs text-gray-500 text-center">
                                    Taxes and delivery fee calculated at checkout
                                </p>

                                {/* Checkout Button */}
                                <Button
                                    variant="primary"
                                    size="md"
                                    fullWidth
                                    onClick={handleCheckout}
                                >
                                    Proceed to Checkout
                                </Button>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default CartSidebar;
