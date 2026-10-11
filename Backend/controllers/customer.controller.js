const Customer = require('../models/customer.model');

const MIN_DIGITS = 3;

/**
 * Find regular customers by the first digits of their mobile number
 * GET /pos/customers?phone=98765
 */
module.exports.searchCustomers = async (req, res) => {
    try {
        let digits = String(req.query.phone || '').replace(/\D/g, '');
        if (digits.length > 10 && digits.startsWith('91')) digits = digits.slice(2);

        if (digits.length < MIN_DIGITS) {
            return res.status(200).json({ success: true, customers: [] });
        }

        // Digits only, so safe to use in a prefix regex (uses the phone index)
        const customers = await Customer.find({ hotel: req.hotelId, phone: { $regex: `^91${digits.slice(0, 10)}` } })
            .sort({ lastVisitAt: -1 })
            .limit(5)
            .select('phone name visits lastVisitAt lastItems')
            .lean();

        res.status(200).json({
            success: true,
            customers: customers.map((customer) => ({
                ...customer,
                phone: customer.phone.slice(2)
            }))
        });
    } catch (error) {
        console.error('❌ Error searching customers:', error);
        res.status(500).json({ success: false, message: 'Failed to search customers' });
    }
};
