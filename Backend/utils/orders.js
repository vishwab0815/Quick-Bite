const crypto = require('crypto');
const Bill = require('../models/bill.model');
const Sequence = require('../models/sequence.model');
const MenuItem = require('../models/menuItem.model');
const Customer = require('../models/customer.model');
const { isValidObjectId } = require('../middleware/validation');
const { DEFAULT_COUNTER, round2, getBusinessDate, getFinancialYear } = require('./billing');

const MAX_LINES = 50;
const MAX_QUANTITY = 99;

/** A problem with the order itself - shown to the cashier / customer as is */
class OrderError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.name = 'OrderError';
        this.status = status;
    }
}

/**
 * Turn [{ itemId, quantity }] into priced bill lines.
 * Prices always come from the database, never from the client.
 */
const priceOrderLines = async (hotelId, items) => {
    if (!Array.isArray(items) || items.length === 0) throw new OrderError('Add at least one item to the bill');
    if (items.length > MAX_LINES) throw new OrderError(`A bill can have at most ${MAX_LINES} lines`);

    const quantities = new Map();
    for (const line of items) {
        const quantity = Number(line?.quantity);
        if (!isValidObjectId(line?.itemId) || !Number.isInteger(quantity) || quantity < 1) {
            throw new OrderError('Each item needs a valid itemId and quantity');
        }
        const merged = (quantities.get(String(line.itemId)) || 0) + quantity;
        if (merged > MAX_QUANTITY) throw new OrderError(`Quantity cannot exceed ${MAX_QUANTITY}`);
        quantities.set(String(line.itemId), merged);
    }

    const menuItems = await MenuItem.find({ _id: { $in: [...quantities.keys()] }, hotel: hotelId }).lean();
    const menuById = new Map(menuItems.map((menuItem) => [String(menuItem._id), menuItem]));

    const lines = [];
    for (const [itemId, quantity] of quantities) {
        const menuItem = menuById.get(itemId);
        if (!menuItem) throw new OrderError('Some items are no longer on the menu');
        if (menuItem.isAvailable === false) throw new OrderError(`${menuItem.name} is sold out`);
        lines.push({
            itemId: menuItem._id,
            name: menuItem.name,
            price: menuItem.price,
            quantity,
            amount: round2(menuItem.price * quantity),
            counter: menuItem.counter || DEFAULT_COUNTER
        });
    }
    return lines;
};

/**
 * Number and save a bill: the token resets daily, the bill number runs per financial year.
 * Regular customers are remembered in the background.
 */
const issueBill = async ({ hotelId, settings, lines, totals, payment, customer = {}, source = 'counter', note, createdBy }) => {
    const businessDate = getBusinessDate(new Date(), settings.timeZone);
    const financialYear = getFinancialYear(businessDate);
    const tokenNumber = await Sequence.next(`${hotelId}:token:${businessDate}`);
    const billSeq = await Sequence.next(`${hotelId}:bill:${financialYear}`);
    const billNumber = `${settings.billPrefix}/${financialYear}/${String(billSeq).padStart(6, '0')}`;
    const counters = [...new Set(lines.map((line) => line.counter))];

    const bill = new Bill({
        hotel: hotelId,
        billNumber,
        tokenNumber,
        businessDate,
        publicId: crypto.randomBytes(12).toString('base64url'),
        items: lines,
        stations: counters.map((counter) => ({ counter })),
        ...totals,
        gstScheme: settings.gstScheme,
        gstRate: settings.gstScheme === 'regular' ? settings.gstRate : 0,
        pricesIncludeGst: settings.pricesIncludeGst,
        payment,
        customer,
        source: ['counter', 'kiosk', 'qr'].includes(source) ? source : 'counter',
        ...(note && { note }),
        createdBy
    });
    await bill.save();

    console.log(`✅ Bill ${billNumber} created - token #${tokenNumber}, ₹${totals.total} (${payment.mode}${payment.gateway ? ` via ${payment.gateway}` : ''})`);

    if (customer.phone) {
        Customer.recordVisit(bill).catch((error) => {
            console.error('❌ Error recording customer visit:', error.message);
        });
    }
    return bill;
};

module.exports = { OrderError, priceOrderLines, issueBill, MAX_LINES, MAX_QUANTITY };
