import React from 'react';
import { motion } from 'framer-motion';
import { FiAlertTriangle, FiRefreshCw, FiHome } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import Button from './Button';

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 * Displays a fallback UI instead of crashing the entire app
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log error details
        console.error('❌ ErrorBoundary caught an error:', error, errorInfo);

        this.setState({
            error: error,
            errorInfo: errorInfo,
        });

        // Send error to logging service (optional)
        if (process.env.NODE_ENV === 'production') {
            // Example: logErrorToService(error, errorInfo);
        }
    }

    handleReload = () => {
        window.location.reload();
    };

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    render() {
        if (this.state.hasError) {
            return <ErrorFallback
                error={this.state.error}
                errorInfo={this.state.errorInfo}
                onReload={this.handleReload}
                onReset={this.handleReset}
            />;
        }

        return this.props.children;
    }
}

/**
 * Error Fallback UI Component
 */
const ErrorFallback = ({ error, errorInfo, onReload, onReset }) => {
    const navigate = useNavigate();
    const isDev = process.env.NODE_ENV === 'development';

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8 md:p-12"
            >
                {/* Error Icon */}
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                        <FiAlertTriangle className="text-4xl text-red-500" />
                    </div>
                </div>

                {/* Error Message */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">
                        Oops! Something went wrong
                    </h1>
                    <p className="text-gray-600 text-lg">
                        We're sorry for the inconvenience. The application encountered an unexpected error.
                    </p>
                </div>

                {/* Development Error Details */}
                {isDev && error && (
                    <div className="mb-8 bg-red-50 border-l-4 border-red-500 rounded-lg p-4 text-left">
                        <h3 className="font-semibold text-red-800 mb-2">Error Details (Development Only):</h3>
                        <p className="text-sm text-red-700 font-mono mb-2">
                            {error.toString()}
                        </p>
                        {errorInfo && (
                            <details className="mt-3">
                                <summary className="cursor-pointer text-sm font-semibold text-red-800 hover:text-red-900">
                                    Component Stack
                                </summary>
                                <pre className="mt-2 text-xs text-red-600 overflow-auto max-h-48 p-2 bg-red-100 rounded">
                                    {errorInfo.componentStack}
                                </pre>
                            </details>
                        )}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button
                        variant="primary"
                        size="md"
                        onClick={onReload}
                        icon={<FiRefreshCw />}
                    >
                        Reload Page
                    </Button>

                    <Button
                        variant="secondary"
                        size="md"
                        onClick={() => navigate('/')}
                        icon={<FiHome />}
                    >
                        Go Home
                    </Button>

                    {isDev && (
                        <Button
                            variant="outline"
                            size="md"
                            onClick={onReset}
                        >
                            Try Again
                        </Button>
                    )}
                </div>

                {/* Support Info */}
                <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                    <p className="text-sm text-gray-500">
                        If this problem persists, please{' '}
                        <a
                            href="/contact"
                            className="text-orange-600 hover:text-orange-700 font-medium underline"
                        >
                            contact support
                        </a>
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default ErrorBoundary;
