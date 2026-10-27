import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ErrorBoundary from './components/common/ErrorBoundary';

// Each area is downloaded only when it's first opened
// QuickBite product page (the root of the site)
const Landing = lazy(() => import('./pages/Landing'));
// Udupi Sri Krishna Naivedya's own website
const RestaurantSite = lazy(() => import('./pages/RestaurantSite'));
const Signin = lazy(() => import('./pages/Signin'));
// Customers order and pay online (website, table QR, self-order kiosk)
const OrderPage = lazy(() => import('./pages/order/OrderPage'));
const OrderStatus = lazy(() => import('./pages/order/OrderStatus'));
// A UPI payment request: what scanning an order's QR code opens
const PayPage = lazy(() => import('./pages/order/PayPage'));
// Counter billing: all counter screens in one bundle so tab switches are instant
const PosApp = lazy(() => import('./pages/pos/PosApp'));
const TokenDisplay = lazy(() => import('./pages/pos/TokenDisplay'));
const ReceiptPage = lazy(() => import('./pages/pos/ReceiptPage'));
// Platform owner console - not linked anywhere; the server only answers it for the platform owner
const ConsoleApp = lazy(() => import('./pages/console/ConsoleApp'));

const PageLoader = () => (
    <div className="flex min-h-screen items-center justify-center bg-stone-50">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-orange-500 border-t-transparent" />
    </div>
);

const App = () => (
    <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/naivedya" element={<RestaurantSite />} />
                <Route path="/signin" element={<Signin />} />
                <Route path="/order" element={<OrderPage />} />
                <Route path="/order/:publicId" element={<OrderStatus />} />
                <Route path="/pay/:linkId" element={<PayPage />} />

                {/* Hotel staff & owners */}
                <Route path="/pos/*" element={<PosApp />} />
                {/* Public: each hotel's token TV, and the e-receipt link */}
                <Route path="/tv/:slug" element={<TokenDisplay />} />
                <Route path="/receipt/:publicId" element={<ReceiptPage />} />

                {/* Platform owner */}
                <Route path="/console/*" element={<ConsoleApp />} />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Suspense>

        <ToastContainer
            position="top-right"
            autoClose={3000}
            newestOnTop
            closeOnClick
            pauseOnFocusLoss
            pauseOnHover
            theme="light"
        />
    </ErrorBoundary>
);

export default App;
