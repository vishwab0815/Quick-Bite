/**
 * Sales reports shared by the hotel dashboard and the platform console
 */

const { round2 } = require('./billing');

/**
 * Build the day summary (sales, payment mix, hours, items, counter speed) from that day's bills
 */
const buildSummary = (date, bills, timeZone) => {
    const active = bills.filter((bill) => bill.status !== 'cancelled');
    const hourFormat = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', hour12: false });

    const byMode = { cash: { count: 0, total: 0 }, upi: { count: 0, total: 0 }, card: { count: 0, total: 0 } };
    const itemsMap = new Map();
    const byHour = {};
    const counterSpeed = new Map();
    let taxableAmount = 0;
    let cgst = 0;
    let sgst = 0;
    let total = 0;

    for (const bill of active) {
        total += bill.total;
        taxableAmount += bill.taxableAmount;
        cgst += bill.cgst;
        sgst += bill.sgst;

        const mode = byMode[bill.payment.mode];
        mode.count += 1;
        mode.total += bill.total;

        const hour = hourFormat.format(new Date(bill.createdAt));
        byHour[hour] = byHour[hour] || { count: 0, total: 0 };
        byHour[hour].count += 1;
        byHour[hour].total += bill.total;

        // Preparation time per food counter: billed -> marked ready
        for (const station of bill.stations) {
            if (!station.readyAt) continue;
            const minutes = (new Date(station.readyAt) - new Date(bill.createdAt)) / 60000;
            if (minutes < 0) continue;
            const entry = counterSpeed.get(station.counter) || { counter: station.counter, tokens: 0, totalMinutes: 0 };
            entry.tokens += 1;
            entry.totalMinutes += minutes;
            counterSpeed.set(station.counter, entry);
        }

        for (const item of bill.items) {
            const entry = itemsMap.get(item.name) || { name: item.name, quantity: 0, amount: 0 };
            entry.quantity += item.quantity;
            entry.amount += item.amount;
            itemsMap.set(item.name, entry);
        }
    }

    Object.values(byMode).forEach((mode) => { mode.total = round2(mode.total); });

    return {
        date,
        billCount: active.length,
        cancelledCount: bills.length - active.length,
        total: round2(total),
        taxableAmount: round2(taxableAmount),
        cgst: round2(cgst),
        sgst: round2(sgst),
        averageBill: active.length ? round2(total / active.length) : 0,
        byMode,
        byHour: Object.entries(byHour)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([hour, data]) => ({ hour, count: data.count, total: round2(data.total) })),
        items: [...itemsMap.values()]
            .map((item) => ({ ...item, amount: round2(item.amount) }))
            .sort((a, b) => b.quantity - a.quantity),
        counterSpeed: [...counterSpeed.values()]
            .map(({ counter, tokens, totalMinutes }) => ({
                counter,
                tokens,
                avgMinutes: Math.round((totalMinutes / tokens) * 10) / 10
            }))
            .sort((a, b) => b.avgMinutes - a.avgMinutes)
    };
};

// Only the fields a summary needs - keeps comparison queries light
const SUMMARY_FIELDS = 'status total taxableAmount cgst sgst payment.mode createdAt stations.counter stations.readyAt items.name items.quantity items.amount';

module.exports = { buildSummary, SUMMARY_FIELDS };
