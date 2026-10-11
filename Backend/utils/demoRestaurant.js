/**
 * The client demo restaurant behind the "Try the demo" buttons on the sign-in page.
 *
 * - Created on first use, completely separate from real hotels (its own menu, bills, customers)
 * - Comes with realistic sales: today's bills up to now, the same weekday last week (for the
 *   dashboard comparison), a few tokens still in the kitchen, and regular customers
 * - Resets itself every few hours, so whatever a visitor changes is wiped
 * - Its two logins have random passwords nobody knows - the only way in is the demo button
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Hotel = require('../models/hotel.model');
const User = require('../models/userauthentication.model');
const MenuItem = require('../models/menuItem.model');
const Bill = require('../models/bill.model');
const Customer = require('../models/customer.model');
const Sequence = require('../models/sequence.model');
const { SAMPLE_MENU } = require('./sampleMenu');
const { getBusinessSettings, computeTotals, getBusinessDate, getFinancialYear, shiftBusinessDate, round2 } = require('./billing');

const DEMO_SLUG = 'quickbite-demo';
const RESET_EVERY_MS = 6 * 60 * 60 * 1000;
const OWNER_EMAIL = 'demo-owner@quickbite.app';
const CASHIER_EMAIL = 'demo-cashier@quickbite.app';
const OPENS_AT_HOUR = 7;
const CLOSES_AT_HOUR = 22;
const IST_OFFSET_MINUTES = 330;

// Regulars the counter can find by typing a few digits (demo numbers, never messaged)
const REGULARS = [
    ['Ravi', '9000000001'], ['Lakshmi', '9000000002'], ['Arjun', '9000000003'],
    ['Meena', '9000000004'], ['Suresh', '9000000005'], ['Priya', '9000000006'],
];

const randomPassword = () => bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

/** A seeded random generator, so every reset produces the same believable day */
const seededRandom = (seed) => {
    let state = seed % 2147483647 || 1;
    return () => {
        state = (state * 16807) % 2147483647;
        return (state - 1) / 2147483646;
    };
};

/** Date for a business day (YYYY-MM-DD, IST) at minutes after midnight */
const istTime = (businessDate, minutes) => new Date(Date.parse(`${businessDate}T00:00:00Z`) + (minutes - IST_OFFSET_MINUTES) * 60000);

const minutesNowIst = () => {
    const now = new Date(Date.now() + IST_OFFSET_MINUTES * 60000);
    return now.getUTCHours() * 60 + now.getUTCMinutes();
};

/** Busier at breakfast and lunch, like a real tiffin room */
const pickMinute = (random, untilMinute) => {
    const peaks = [8 * 60 + 30, 13 * 60, 19 * 60 + 30];
    for (let attempt = 0; attempt < 20; attempt++) {
        const peak = peaks[Math.floor(random() * peaks.length)];
        const minute = Math.round(peak + (random() + random() + random() - 1.5) * 150);
        if (minute >= OPENS_AT_HOUR * 60 && minute <= Math.min(untilMinute, CLOSES_AT_HOUR * 60)) return minute;
    }
    return null;
};

const buildBills = ({ hotel, settings, menu, businessDate, count, untilMinute, random, live }) => {
    const minutes = Array.from({ length: count }, () => pickMinute(random, untilMinute)).filter((minute) => minute !== null).sort((a, b) => a - b);

    return minutes.map((minute, index) => {
        const lineCount = 1 + Math.floor(random() * 3);
        const picked = new Map();
        for (let line = 0; line < lineCount; line++) {
            const item = menu[Math.floor(random() * menu.length)];
            picked.set(String(item._id), { item, quantity: (picked.get(String(item._id))?.quantity || 0) + 1 + (random() < 0.25 ? 1 : 0) });
        }
        const items = [...picked.values()].map(({ item, quantity }) => ({
            itemId: item._id, name: item.name, price: item.price, quantity, amount: round2(item.price * quantity), counter: item.counter,
        }));
        const totals = computeTotals(items, settings);
        const roll = random();
        const mode = roll < 0.6 ? 'upi' : roll < 0.95 ? 'cash' : 'card';
        const createdAt = istTime(businessDate, minute);
        const regular = random() < 0.3 ? REGULARS[Math.floor(random() * REGULARS.length)] : null;

        // The last few tokens of today are still being cooked / waiting to be collected
        const fromEnd = minutes.length - index;
        const state = live && fromEnd <= 3 ? 'preparing' : live && fromEnd <= 5 ? 'ready' : 'served';
        const readyAt = new Date(createdAt.getTime() + (4 + random() * 9) * 60000);
        const stations = [...new Set(items.map((item) => item.counter))].map((counter) => ({
            counter,
            status: state,
            ...(state !== 'preparing' && { readyAt }),
            ...(state === 'served' && { servedAt: new Date(readyAt.getTime() + (1 + random() * 3) * 60000) }),
        }));

        return {
            hotel: hotel._id,
            businessDate,
            publicId: crypto.randomBytes(12).toString('base64url'),
            items,
            stations,
            ...totals,
            gstScheme: settings.gstScheme,
            gstRate: settings.gstScheme === 'regular' ? settings.gstRate : 0,
            pricesIncludeGst: settings.pricesIncludeGst,
            payment: mode === 'cash'
                ? { mode, cashReceived: Math.ceil(totals.total / 50) * 50, changeReturned: Math.ceil(totals.total / 50) * 50 - totals.total }
                : { mode },
            customer: regular ? { name: regular[0], phone: `91${regular[1]}` } : {},
            status: state,
            receipt: { printed: true },
            createdAt,
            updatedAt: createdAt,
        };
    });
};

/**
 * Wipe the demo restaurant and fill it with a fresh, believable day
 */
const resetDemoData = async (hotel) => {
    const hotelId = hotel._id;
    await Promise.all([
        Bill.deleteMany({ hotel: hotelId }),
        Customer.deleteMany({ hotel: hotelId }),
        MenuItem.deleteMany({ hotel: hotelId }),
        Sequence.deleteMany({ _id: new RegExp(`^${hotelId}:`) }),
    ]);

    const menu = await MenuItem.insertMany(SAMPLE_MENU.map(([name, price, counter, category], index) => ({
        hotel: hotelId, name, nameKey: name.toLowerCase(), price, counter, category, sortOrder: index,
    })));

    const settings = getBusinessSettings(hotel);
    const today = getBusinessDate(new Date(), settings.timeZone);
    const lastWeek = shiftBusinessDate(today, -7);
    const random = seededRandom(Number(today.replace(/-/g, '')));
    const nowMinute = minutesNowIst();

    // Same weekday last week: a full day. Today: everything up to a few minutes ago.
    const elapsedShare = Math.max(0, Math.min(1, (nowMinute - OPENS_AT_HOUR * 60) / ((CLOSES_AT_HOUR - OPENS_AT_HOUR) * 60)));
    const days = [
        { businessDate: lastWeek, count: 140, untilMinute: CLOSES_AT_HOUR * 60, live: false },
        { businessDate: today, count: Math.round(155 * elapsedShare), untilMinute: nowMinute - 3, live: true },
    ];

    let billSeq = 0;
    const financialYear = getFinancialYear(today);
    for (const day of days) {
        const bills = buildBills({ hotel, settings, menu, random, ...day });
        bills.forEach((bill, index) => {
            billSeq += 1;
            bill.tokenNumber = index + 1;
            bill.billNumber = `${settings.billPrefix}/${getFinancialYear(day.businessDate)}/${String(billSeq).padStart(6, '0')}`;
        });
        if (bills.length > 0) {
            await Bill.insertMany(bills, { timestamps: false });
            await Sequence.updateOne({ _id: `${hotelId}:token:${day.businessDate}` }, { $set: { seq: bills.length } }, { upsert: true });
        }
        for (const bill of bills.filter((entry) => entry.customer.phone)) {
            await Customer.recordVisit(bill);
        }
    }
    await Sequence.updateOne({ _id: `${hotelId}:bill:${financialYear}` }, { $set: { seq: billSeq } }, { upsert: true });

    hotel.demoResetAt = new Date();
    await hotel.save();
    console.log(`🧪 Demo restaurant reset with ${billSeq} sample bills`);
};

const createDemoHotel = async () => {
    const hotel = await Hotel.create({
        name: 'Annapoorna Tiffin Room (Demo)',
        slug: DEMO_SLUG,
        isDemo: true,
        settings: {
            address: '80 Feet Road, Indiranagar, Bengaluru 560038',
            phone: '9000000000',
            hours: '7:00 AM – 10:00 PM',
            upiVpa: 'demo@quickbite',
            upiPayeeName: 'Annapoorna Tiffin Room',
            billPrefix: 'AT',
        },
        // Never expires
        subscription: { plan: 'yearly', monthlyFee: 0, paidUntil: new Date('2099-12-31') },
    });
    await User.create([
        { name: 'Demo Owner', email: OWNER_EMAIL, password: await randomPassword(), role: 'admin', hotel: hotel._id },
        { name: 'Demo Cashier', email: CASHIER_EMAIL, password: await randomPassword(), role: 'staff', hotel: hotel._id },
    ]);
    return hotel;
};

let pending = null;

/**
 * The demo restaurant and its two logins, created / refreshed when needed.
 * Calls are serialised so two visitors clicking at once don't both reset it.
 */
const getDemoRestaurant = () => {
    pending = pending || (async () => {
        try {
            let hotel = await Hotel.findOne({ slug: DEMO_SLUG, isDemo: true });
            if (!hotel) hotel = await createDemoHotel();

            const [owner, cashier] = await Promise.all([
                User.findOne({ email: OWNER_EMAIL, hotel: hotel._id }),
                User.findOne({ email: CASHIER_EMAIL, hotel: hotel._id }),
            ]);
            if (!owner || !cashier) throw new Error('Demo logins are missing');

            if (!hotel.demoResetAt || Date.now() - hotel.demoResetAt.getTime() > RESET_EVERY_MS) {
                await resetDemoData(hotel);
            }
            return { hotel, owner, cashier };
        } finally {
            pending = null;
        }
    })();
    return pending;
};

module.exports = { getDemoRestaurant, resetDemoData, DEMO_SLUG };
