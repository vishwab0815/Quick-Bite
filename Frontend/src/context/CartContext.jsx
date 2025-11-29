import { createContext, useContext, useState, useEffect } from 'react';
import { showSuccessToast, showInfoToast } from '../utils/toast';

const CartContext = createContext();

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within CartProvider');
    }
    return context;
};

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);

    // Load cart from localStorage on mount
    useEffect(() => {
        const savedCart = localStorage.getItem('quickbite_cart');
        if (savedCart) {
            try {
                setCartItems(JSON.parse(savedCart));
            } catch (error) {
                console.error('Failed to load cart:', error);
            }
        }
    }, []);

    // Save cart to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('quickbite_cart', JSON.stringify(cartItems));
    }, [cartItems]);

    // Add item to cart
    const addToCart = (item, customizations = {}) => {
        setCartItems((prevItems) => {
            // Check if item with same customizations already exists
            const existingItemIndex = prevItems.findIndex(
                (cartItem) =>
                    cartItem._id === item._id &&
                    JSON.stringify(cartItem.customizations) === JSON.stringify(customizations)
            );

            if (existingItemIndex > -1) {
                // Update quantity if item exists
                const updatedItems = [...prevItems];
                updatedItems[existingItemIndex].quantity += 1;
                showInfoToast(`Increased ${item.name} quantity`);
                return updatedItems;
            } else {
                // Add new item
                showSuccessToast(`Added ${item.name} to cart`);
                return [...prevItems, { ...item, quantity: 1, customizations }];
            }
        });
    };

    // Remove item from cart
    const removeFromCart = (itemId, customizations = {}) => {
        setCartItems((prevItems) =>
            prevItems.filter(
                (item) =>
                    !(
                        item._id === itemId &&
                        JSON.stringify(item.customizations) === JSON.stringify(customizations)
                    )
            )
        );
        showInfoToast('Item removed from cart');
    };

    // Update item quantity
    const updateQuantity = (itemId, quantity, customizations = {}) => {
        if (quantity <= 0) {
            removeFromCart(itemId, customizations);
            return;
        }

        setCartItems((prevItems) =>
            prevItems.map((item) =>
                item._id === itemId &&
                JSON.stringify(item.customizations) === JSON.stringify(customizations)
                    ? { ...item, quantity }
                    : item
            )
        );
    };

    // Clear entire cart
    const clearCart = () => {
        setCartItems([]);
        showInfoToast('Cart cleared');
    };

    // Get cart total
    const getCartTotal = () => {
        return cartItems.reduce((total, item) => {
            const basePrice = parseFloat(item.price) || 0;
            const customizationPrice = Object.values(item.customizations || {}).reduce(
                (sum, customization) => sum + (parseFloat(customization.price) || 0),
                0
            );
            return total + (basePrice + customizationPrice) * item.quantity;
        }, 0);
    };

    // Get total items count
    const getCartCount = () => {
        return cartItems.reduce((count, item) => count + item.quantity, 0);
    };

    // Toggle cart sidebar
    const toggleCart = () => {
        setIsCartOpen(!isCartOpen);
    };

    const value = {
        cartItems,
        isCartOpen,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
        getCartCount,
        toggleCart,
        setIsCartOpen,
    };

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
