import React, { Suspense, lazy } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { CartProvider } from './context/CartContext';
import ErrorBoundary from './components/common/ErrorBoundary';

// Customer cart - website pages only (the counter never needs it or its animation library)
const CartSidebar = lazy(() => import('./components/Cart/CartSidebar'));

// Each page is downloaded only when it's first opened
const Home = lazy(() => import('./pages/Home'));
const Menu = lazy(() => import('./pages/Menu'));
const InfoCard = lazy(() => import('./components/InfoCard'));
const ServicesSection = lazy(() => import('./pages/Services'));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess'));
const Signin = lazy(() => import('./pages/Signin'));
const Register = lazy(() => import('./pages/Register'));
const Contact = lazy(() => import('./pages/Contact'));
const Landing = lazy(() => import('./pages/Landing'));
const Checkout = lazy(() => import('./pages/Checkout'));
const About = lazy(() => import('./pages/About'));
const OrderHistory = lazy(() => import('./pages/OrderHistory'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
// Counter billing: all counter screens in one bundle so tab switches are instant
const PosApp = lazy(() => import('./pages/pos/PosApp'));
const ReceiptPage = lazy(() => import('./pages/pos/ReceiptPage'));

const PageLoader = () => (
    <div className="flex min-h-screen items-center justify-center bg-stone-50">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-orange-500 border-t-transparent" />
    </div>
);

const App = () => {
    const { pathname } = useLocation();
    const isCounterApp = pathname.startsWith('/pos') || pathname.startsWith('/receipt');

    return (
        <ErrorBoundary>
            <CartProvider>
                <div className="relative">
                    <Suspense fallback={<PageLoader />}>
                        <Routes>
                            <Route path="/" element={<Landing />} />
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

                            {/* Counter billing (staff / admin) + public token TV at /pos/display */}
                            <Route path="/pos/*" element={<PosApp />} />
                            {/* Public e-receipt link */}
                            <Route path="/receipt/:publicId" element={<ReceiptPage />} />
                        </Routes>
                    </Suspense>

                    {/* Customer cart sidebar (website only) */}
                    {!isCounterApp && (
                        <Suspense fallback={null}>
                            <CartSidebar />
                        </Suspense>
                    )}

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
