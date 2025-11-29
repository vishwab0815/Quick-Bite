/**
 * Admin Authorization Middleware
 * Checks if authenticated user has admin role
 */

const isAdmin = (req, res, next) => {
    try {
        // Check if user is authenticated (should use authenticateToken first)
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Check if user has admin role
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        next();
    } catch (error) {
        console.error('❌ Admin authorization error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Authorization failed'
        });
    }
};

module.exports = { isAdmin };
