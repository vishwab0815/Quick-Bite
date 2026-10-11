/**
 * Startup upgrades - safe to run on every start (they only act when needed).
 *
 * 1. Single restaurant -> many hotels: data created before hotels existed (bills, menu,
 *    customers, staff logins) is attached to one hotel, created from the old HOTEL_* settings.
 *    Bill and token numbering carry on from where they were. Nothing is deleted.
 * 2. Indexes: creates the per-hotel unique indexes and drops the old single-restaurant ones
 *    (e.g. "menu item names unique across the whole database").
 */

const Hotel = require('../models/hotel.model');
const Bill = require('../models/bill.model');
const MenuItem = require('../models/menuItem.model');
const Customer = require('../models/customer.model');
const User = require('../models/userauthentication.model');
const Sequence = require('../models/sequence.model');
const AuditLog = require('../models/auditLog.model');
const { settingsFromEnv, slugify } = require('./billing');

const { DAY_MS } = Hotel;
const STARTING_PERIOD_DAYS = 30;
const HOTEL_ROLES = ['admin', 'staff'];
const LEGACY_SEQUENCE = /^(token|bill):/;

const withoutHotel = { hotel: { $exists: false } };

const hasUnassignedData = async () => {
    const found = await Promise.all([
        Bill.exists(withoutHotel),
        MenuItem.exists(withoutHotel),
        Customer.exists(withoutHotel),
        User.exists({ ...withoutHotel, role: { $in: HOTEL_ROLES } }),
    ]);
    return found.some(Boolean);
};

const assignToFirstHotel = async () => {
    if (!(await hasUnassignedData())) return null;

    let hotel = await Hotel.findOne().sort({ createdAt: 1 });
    if (!hotel) {
        const { name, settings } = settingsFromEnv();
        hotel = await Hotel.create({
            name,
            slug: slugify(name),
            settings,
            // Existing restaurant keeps working; the platform owner sets the real plan from the console
            subscription: { plan: 'trial', paidUntil: new Date(Date.now() + STARTING_PERIOD_DAYS * DAY_MS) }
        });
        console.log(`🏨 Created hotel "${hotel.name}" for the existing data`);
    }

    const assign = { $set: { hotel: hotel._id } };
    const [bills, items, customers, users] = await Promise.all([
        Bill.updateMany(withoutHotel, assign),
        MenuItem.updateMany(withoutHotel, assign),
        Customer.updateMany(withoutHotel, assign),
        User.updateMany({ ...withoutHotel, role: { $in: HOTEL_ROLES } }, assign),
    ]);

    // Continue bill / token numbering: "bill:2026-27" -> "<hotelId>:bill:2026-27"
    const legacySequences = await Sequence.find({ _id: LEGACY_SEQUENCE }).lean();
    for (const sequence of legacySequences) {
        await Sequence.updateOne(
            { _id: `${hotel._id}:${sequence._id}` },
            { $max: { seq: sequence.seq } },
            { upsert: true }
        );
    }

    console.log(
        `🏨 Moved existing data into "${hotel.name}": ${bills.modifiedCount} bills, ${items.modifiedCount} menu items, ` +
        `${customers.modifiedCount} customers, ${users.modifiedCount} logins, ${legacySequences.length} counters`
    );
    return hotel;
};

const syncIndexes = async () => {
    for (const Model of [Hotel, Bill, MenuItem, Customer, User, AuditLog]) {
        await Model.syncIndexes();
    }
};

const runStartupMigrations = async () => {
    await assignToFirstHotel();
    await syncIndexes();
};

module.exports = { runStartupMigrations, assignToFirstHotel };
