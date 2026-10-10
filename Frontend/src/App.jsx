import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { CartProvider } from './context/CartContext';
import CartSidebar from './components/Cart/CartSidebar';
import ErrorBoundary from './components/common/ErrorBoundary';

import Home from './pages/Home';
import Menu from './pages/Menu';
import InfoCard from './components/InfoCard';
import ServicesSection from './pages/Services';
import OrderSuccess from './pages/OrderSuccess';
import Signin from './pages/Signin';
import Register from './pages/Register';
import Contact from './pages/Contact';
import GetStarted from './pages/GetStarted';
import Checkout from './pages/Checkout';
import About from './pages/About';
import OrderHistory from './pages/OrderHistory';
import AdminDashboard from './pages/AdminDashboard';
import PosCounter from './pages/pos/PosCounter';
import KitchenScreen from './pages/pos/KitchenScreen';
import PosBills from './pages/pos/PosBills';
import TokenDisplay from './pages/pos/TokenDisplay';
import ReceiptPage from './pages/pos/ReceiptPage';

const App = () => {
    return (
        <ErrorBoundary>
            <CartProvider>
                <div className="relative">
                    <Routes>
                        <Route path="/" element={<GetStarted />} />
                        <Route path="/signin" element={<Signin />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/contact" element={<Contact />} />
                        <Route path="/about" element={<About />} />
                        <Route path="/home" element={<Home />} />
                        <Route path="/menu" element={<Menu />} />
                        <Route path="/food/:id" element={<InfoCard />} />
                        <Route path="/checkout" element={<Checkout />} />
                        <Route path="/order-success" element={<OrderSuccess />} />
                        <Route path="/orders" element={<OrderHistory />} />
                        <Route path="/admin" element={<AdminDashboard />} />
                        <Route path="/services" element={<ServicesSection />} />

                        {/* Counter billing (staff / admin) */}
                        <Route path="/pos" element={<PosCounter />} />
                        <Route path="/pos/kitchen" element={<KitchenScreen />} />
                        <Route path="/pos/bills" element={<PosBills />} />
                        {/* Public: token TV & e-receipt link */}
                        <Route path="/pos/display" element={<TokenDisplay />} />
                        <Route path="/receipt/:publicId" element={<ReceiptPage />} />
                    </Routes>

                    {/* Global Cart Sidebar */}
                    <CartSidebar />

                    {/* Toast Notifications */}
                    <ToastContainer
                        position="top-right"
                        autoClose={3000}
                        hideProgressBar={false}
                        newestOnTop
                        closeOnClick
                        rtl={false}
                        pauseOnFocusLoss
                        draggable
                        pauseOnHover
                        theme="light"
                    />
                </div>
            </CartProvider>
        </ErrorBoundary>
    );
};

export default App;
