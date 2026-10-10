import { useCallback, useEffect, useState } from 'react';
import { FiPrinter, FiMessageCircle, FiXCircle, FiRefreshCw } from 'react-icons/fi';
import PosHeader from '../../components/pos/PosHeader';
import PrintArea from '../../components/pos/PrintArea';
import { showToast } from '../../utils/toast';
import {
    posApi, formatINR, formatTime, todayInTimeZone, isValidIndianMobile, useStaffUser, usePosSettings,
} from '../../utils/pos';

const STATUS_STYLES = {
    preparing: 'bg-orange-100 text-orange-700',
    ready: 'bg-green-100 text-green-700',
    served: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-red-100 text-red-700',
};

const StatCard = ({ label, value, sub }) => (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
        <p className="mt-1 text-2xl font-black text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
);

export default function PosBills() {
    const user = useStaffUser();
    const settings = usePosSettings(Boolean(user));

    const [date, setDate] = useState('');
    const [bills, setBills] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [countedCash, setCountedCash] = useState('');
    const [printJob, setPrintJob] = useState(null);

    useEffect(() => {
        if (settings && !date) setDate(todayInTimeZone(settings.timeZone));
    }, [settings, date]);

    const load = useCallback(async () => {
        if (!date) return;
        setLoading(true);
        try {
            const [billsRes, summaryRes] = await Promise.all([
                posApi.get('/bills', { params: { date } }),
                posApi.get('/reports/summary', { params: { date } }),
            ]);
            setBills(billsRes.data.bills);
            setSummary(summaryRes.data.summary);
        } catch (error) {
            showToast.error(error.response?.data?.message || 'Failed to load bills');
        } finally {
            setLoading(false);
        }
    }, [date]);

    useEffect(() => {
        if (user) load();
    }, [user, load]);

    const handlePrintDone = useCallback(() => setPrintJob(null), []);

    const sendWhatsapp = async (bill) => {
        let phone;
        if (!bill.customer?.phone) {
            phone = window.prompt('Customer mobile number (10 digits):');
            if (!phone) return;
            if (!isValidIndianMobile(phone)) {
                showToast.error('Enter a valid 10-digit mobile number');
                return;
            }
        }
        // Open the tab now (inside the click) so the browser doesn't block it
        const tab = window.open('', '_blank');
        try {
            const res = await posApi.post(`/bills/${bill._id}/whatsapp`, phone ? { phone } : {});
            const { whatsapp } = res.data;
            if (whatsapp.status === 'sent') {
                tab?.close();
                showToast.success('Receipt sent on WhatsApp');
            } else if (whatsapp.link && tab) {
                tab.location.href = whatsapp.link;
            } else {
                tab?.close();
                showToast.error(whatsapp.error || 'Could not send receipt');
            }
            load();
        } catch (error) {
            tab?.close();
            showToast.error(error.response?.data?.message || 'Failed to send receipt');
        }
    };

    const cancelBill = async (bill) => {
        const reason = window.prompt(`Cancel token #${bill.tokenNumber} (${formatINR(bill.total)})? Enter the reason:`);
        if (!reason) return;
        try {
            await posApi.patch(`/bills/${bill._id}/cancel`, { reason });
            showToast.success(`Token #${bill.tokenNumber} cancelled`);
            load();
        } catch (error) {
            showToast.error(error.response?.data?.message || 'Failed to cancel bill');
        }
    };

    if (!user || !settings) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-100">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
            </div>
        );
    }

    const expectedCash = summary?.byMode.cash.total || 0;
    const cashDifference = countedCash === '' ? null : Number(countedCash) - expectedCash;
    const maxHourTotal = Math.max(1, ...(summary?.byHour || []).map((hour) => hour.total));

    return (
        <div className="min-h-screen bg-gray-100 text-gray-900 [color-scheme:light]">
            <PosHeader user={user} hotelName={settings.name} />

            <div className="mx-auto max-w-7xl space-y-4 p-4">
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl font-black text-gray-900">Bills & Sales</h1>
                    <input
                        type="date"
                        value={date}
                        max={todayInTimeZone(settings.timeZone)}
                        onChange={(e) => setDate(e.target.value)}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2"
                    />
                    <button onClick={load} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 font-semibold text-gray-700 border border-gray-200">
                        <FiRefreshCw className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                </div>

                {summary && (
                    <>
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
                            <StatCard label="Total sales" value={formatINR(summary.total)} sub={`${summary.billCount} bills`} />
                            <StatCard label="Average bill" value={formatINR(summary.averageBill)} />
                            <StatCard label="Cash" value={formatINR(summary.byMode.cash.total)} sub={`${summary.byMode.cash.count} bills`} />
                            <StatCard label="UPI" value={formatINR(summary.byMode.upi.total)} sub={`${summary.byMode.upi.count} bills`} />
                            <StatCard label="Card" value={formatINR(summary.byMode.card.total)} sub={`${summary.byMode.card.count} bills`} />
                            <StatCard
                                label="GST collected"
                                value={formatINR(summary.cgst + summary.sgst)}
                                sub={`Cancelled: ${summary.cancelledCount}`}
                            />
                        </div>

                        <div className="grid gap-4 lg:grid-cols-3">
                            {/* Cash drawer check */}
                            <div className="rounded-xl border border-gray-200 bg-white p-4">
                                <h2 className="mb-2 font-bold text-gray-800">Cash drawer check</h2>
                                <p className="text-sm text-gray-600">Expected cash: <span className="font-bold">{formatINR(expectedCash)}</span></p>
                                <input
                                    value={countedCash}
                                    onChange={(e) => setCountedCash(e.target.value.replace(/[^\d.]/g, ''))}
                                    placeholder="Counted cash in drawer"
                                    inputMode="decimal"
                                    className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-orange-500"
                                />
                                {cashDifference !== null && (
                                    <p className={`mt-2 font-bold ${cashDifference === 0 ? 'text-green-700' : 'text-red-600'}`}>
                                        {cashDifference === 0
                                            ? '✓ Cash matches'
                                            : cashDifference > 0
                                                ? `Excess ${formatINR(cashDifference)}`
                                                : `Short ${formatINR(-cashDifference)}`}
                                    </p>
                                )}
                            </div>

                            {/* Hourly sales */}
                            <div className="rounded-xl border border-gray-200 bg-white p-4">
                                <h2 className="mb-2 font-bold text-gray-800">Sales by hour</h2>
                                <div className="space-y-1">
                                    {summary.byHour.map((hour) => (
                                        <div key={hour.hour} className="flex items-center gap-2 text-sm">
                                            <span className="w-12 text-gray-500">{hour.hour}:00</span>
                                            <div className="h-4 flex-1 rounded bg-gray-100">
                                                <div
                                                    className="h-4 rounded bg-gradient-to-r from-orange-400 to-pink-500"
                                                    style={{ width: `${(hour.total / maxHourTotal) * 100}%` }}
                                                />
                                            </div>
                                            <span className="w-24 text-right font-semibold">{formatINR(hour.total)}</span>
                                        </div>
                                    ))}
                                    {summary.byHour.length === 0 && <p className="text-sm text-gray-400">No sales yet</p>}
                                </div>
                            </div>

                            {/* Top items */}
                            <div className="rounded-xl border border-gray-200 bg-white p-4">
                                <h2 className="mb-2 font-bold text-gray-800">Top items</h2>
                                <div className="max-h-56 space-y-1 overflow-y-auto">
                                    {summary.items.map((item) => (
                                        <div key={item.name} className="flex justify-between gap-2 text-sm">
                                            <span className="truncate">{item.name}</span>
                                            <span className="whitespace-nowrap font-semibold">{item.quantity} · {formatINR(item.amount)}</span>
                                        </div>
                                    ))}
                                    {summary.items.length === 0 && <p className="text-sm text-gray-400">No sales yet</p>}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Bills table */}
                <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                            <tr>
                                <th className="px-3 py-2">Token</th>
                                <th className="px-3 py-2">Bill No</th>
                                <th className="px-3 py-2">Time</th>
                                <th className="px-3 py-2">Items</th>
                                <th className="px-3 py-2">Paid by</th>
                                <th className="px-3 py-2 text-right">Total</th>
                                <th className="px-3 py-2">Status</th>
                                <th className="px-3 py-2">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bills.map((bill) => (
                                <tr key={bill._id} className="border-t border-gray-100">
                                    <td className="px-3 py-2 text-lg font-black">#{bill.tokenNumber}</td>
                                    <td className="px-3 py-2 font-mono text-xs">{bill.billNumber}</td>
                                    <td className="px-3 py-2">{formatTime(bill.createdAt, settings.timeZone)}</td>
                                    <td className="max-w-xs px-3 py-2 text-gray-600">
                                        {bill.items.map((item) => `${item.name} ×${item.quantity}`).join(', ')}
                                    </td>
                                    <td className="px-3 py-2 uppercase">{bill.payment.mode}</td>
                                    <td className="px-3 py-2 text-right font-bold">{formatINR(bill.total)}</td>
                                    <td className="px-3 py-2">
                                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_STYLES[bill.status]}`}>
                                            {bill.status}
                                        </span>
                                        {bill.status === 'cancelled' && bill.cancelReason && (
                                            <p className="mt-0.5 text-xs text-gray-500">{bill.cancelReason}</p>
                                        )}
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => setPrintJob({ bill, coupons: false })}
                                                className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
                                                title="Reprint bill"
                                            >
                                                <FiPrinter />
                                            </button>
                                            {bill.status !== 'cancelled' && (
                                                <button
                                                    onClick={() => sendWhatsapp(bill)}
                                                    className={`rounded-lg p-2 hover:bg-green-50 ${
                                                        bill.receipt?.whatsapp?.status === 'sent' ? 'text-green-600' : 'text-gray-600'
                                                    }`}
                                                    title={bill.receipt?.whatsapp?.status === 'sent' ? 'Sent - resend on WhatsApp' : 'Send on WhatsApp'}
                                                >
                                                    <FiMessageCircle />
                                                </button>
                                            )}
                                            {user.role === 'admin' && bill.status !== 'cancelled' && (
                                                <button
                                                    onClick={() => cancelBill(bill)}
                                                    className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                                                    title="Cancel bill"
                                                >
                                                    <FiXCircle />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {bills.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-3 py-10 text-center text-gray-400">No bills for this day</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <PrintArea job={printJob} settings={settings} onDone={handlePrintDone} />
        </div>
    );
}
