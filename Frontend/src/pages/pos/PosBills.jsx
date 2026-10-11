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
    served: 'bg-stone-100 text-stone-600',
    cancelled: 'bg-red-100 text-red-700',
};

const StatCard = ({ label, value, sub }) => (
    <div className="rounded-2xl border border-stone-200/80 bg-white shadow-[0_1px_2px_rgba(28,25,23,0.05)] p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">{label}</p>
        <p className="mt-1 text-2xl font-black text-stone-900">{value}</p>
        {sub && <p className="text-xs text-stone-500">{sub}</p>}
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
            <div className="pos-app flex min-h-screen items-center justify-center bg-stone-100">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
            </div>
        );
    }

    const renderActions = (bill) => (
        <div className="flex gap-1">
            <button
                onClick={() => setPrintJob({ bill, coupons: false })}
                className="rounded-full p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900"
                title="Print bill again"
            >
                <FiPrinter />
            </button>
            {bill.status !== 'cancelled' && (
                <button
                    onClick={() => sendWhatsapp(bill)}
                    className={`rounded-full p-2 hover:bg-emerald-50 ${
                        bill.receipt?.whatsapp?.status === 'sent' ? 'text-emerald-600' : 'text-stone-500'
                    }`}
                    title={bill.receipt?.whatsapp?.status === 'sent' ? 'Sent - resend on WhatsApp' : 'Send on WhatsApp'}
                >
                    <FiMessageCircle />
                </button>
            )}
            {user.role === 'admin' && bill.status !== 'cancelled' && (
                <button
                    onClick={() => cancelBill(bill)}
                    className="rounded-full p-2 text-rose-500 hover:bg-rose-50"
                    title="Cancel bill"
                >
                    <FiXCircle />
                </button>
            )}
        </div>
    );

    const expectedCash = summary?.byMode.cash.total || 0;
    const cashDifference = countedCash === '' ? null : Number(countedCash) - expectedCash;
    const maxHourTotal = Math.max(1, ...(summary?.byHour || []).map((hour) => hour.total));

    return (
        <div className="min-h-screen pos-app bg-stone-100">
            <PosHeader user={user} hotelName={settings.name} />

            <div className="mx-auto max-w-7xl space-y-4 p-4">
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl font-black text-stone-900">Bills & Sales</h1>
                    <input
                        type="date"
                        value={date}
                        max={todayInTimeZone(settings.timeZone)}
                        onChange={(e) => setDate(e.target.value)}
                        className="rounded-lg border border-stone-200 bg-white px-3 py-2"
                    />
                    <button onClick={load} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 font-semibold text-stone-700 border border-stone-200">
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
                            <div className="rounded-2xl border border-stone-200/80 bg-white shadow-[0_1px_2px_rgba(28,25,23,0.05)] p-4">
                                <h2 className="mb-2 font-bold text-stone-800">Cash drawer check</h2>
                                <p className="text-sm text-stone-600">Expected cash: <span className="font-bold">{formatINR(expectedCash)}</span></p>
                                <input
                                    value={countedCash}
                                    onChange={(e) => setCountedCash(e.target.value.replace(/[^\d.]/g, ''))}
                                    placeholder="Counted cash in drawer"
                                    inputMode="decimal"
                                    className="mt-2 w-full rounded-lg border border-stone-200 px-3 py-2 outline-none focus:border-orange-500"
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
                            <div className="rounded-2xl border border-stone-200/80 bg-white shadow-[0_1px_2px_rgba(28,25,23,0.05)] p-4">
                                <h2 className="mb-2 font-bold text-stone-800">Sales by hour</h2>
                                <div className="space-y-1">
                                    {summary.byHour.map((hour) => (
                                        <div key={hour.hour} className="flex items-center gap-2 text-sm">
                                            <span className="w-12 text-stone-500">{hour.hour}:00</span>
                                            <div className="h-4 flex-1 rounded bg-stone-100">
                                                <div
                                                    className="h-4 rounded bg-gradient-to-r from-orange-400 to-pink-500"
                                                    style={{ width: `${(hour.total / maxHourTotal) * 100}%` }}
                                                />
                                            </div>
                                            <span className="w-24 text-right font-semibold">{formatINR(hour.total)}</span>
                                        </div>
                                    ))}
                                    {summary.byHour.length === 0 && <p className="text-sm text-stone-400">No sales yet</p>}
                                </div>
                            </div>

                            {/* Top items */}
                            <div className="rounded-2xl border border-stone-200/80 bg-white shadow-[0_1px_2px_rgba(28,25,23,0.05)] p-4">
                                <h2 className="mb-2 font-bold text-stone-800">Top items</h2>
                                <div className="max-h-56 space-y-1 overflow-y-auto">
                                    {summary.items.map((item) => (
                                        <div key={item.name} className="flex justify-between gap-2 text-sm">
                                            <span className="truncate">{item.name}</span>
                                            <span className="whitespace-nowrap font-semibold">{item.quantity} · {formatINR(item.amount)}</span>
                                        </div>
                                    ))}
                                    {summary.items.length === 0 && <p className="text-sm text-stone-400">No sales yet</p>}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Bills - cards on phones */}
                <div className="space-y-2 md:hidden">
                    {bills.map((bill) => (
                        <div key={bill._id} className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(28,25,23,0.05)]">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-2xl font-extrabold tabular-nums">#{bill.tokenNumber}</p>
                                    <p className="text-xs text-stone-400">
                                        {formatTime(bill.createdAt, settings.timeZone)} · {bill.payment.mode.toUpperCase()}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-bold tabular-nums">{formatINR(bill.total)}</p>
                                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_STYLES[bill.status]}`}>{bill.status}</span>
                                </div>
                            </div>
                            <p className="mt-2 text-sm text-stone-600">
                                {bill.items.map((item) => `${item.name} ×${item.quantity}`).join(', ')}
                            </p>
                            {bill.status === 'cancelled' && bill.cancelReason && (
                                <p className="mt-1 text-xs text-stone-500">Cancelled: {bill.cancelReason}</p>
                            )}
                            <div className="mt-2 flex items-center justify-between border-t border-stone-100 pt-2">
                                <span className="font-mono text-xs text-stone-400">{bill.billNumber}</span>
                                {renderActions(bill)}
                            </div>
                        </div>
                    ))}
                    {bills.length === 0 && (
                        <p className="rounded-2xl bg-white py-10 text-center text-stone-400">No bills for this day</p>
                    )}
                </div>

                {/* Bills - table on tablets & desktops */}
                <div className="hidden overflow-x-auto rounded-2xl border border-stone-200/80 bg-white shadow-[0_1px_2px_rgba(28,25,23,0.05)] md:block">
                    <table className="w-full text-sm">
                        <thead className="bg-stone-50 text-left text-xs uppercase tracking-wider text-stone-500">
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
                                <tr key={bill._id} className="border-t border-stone-100">
                                    <td className="px-3 py-2 text-lg font-black">#{bill.tokenNumber}</td>
                                    <td className="px-3 py-2 font-mono text-xs">{bill.billNumber}</td>
                                    <td className="px-3 py-2">{formatTime(bill.createdAt, settings.timeZone)}</td>
                                    <td className="max-w-xs px-3 py-2 text-stone-600">
                                        {bill.items.map((item) => `${item.name} ×${item.quantity}`).join(', ')}
                                    </td>
                                    <td className="px-3 py-2 uppercase">{bill.payment.mode}</td>
                                    <td className="px-3 py-2 text-right font-bold">{formatINR(bill.total)}</td>
                                    <td className="px-3 py-2">
                                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_STYLES[bill.status]}`}>
                                            {bill.status}
                                        </span>
                                        {bill.status === 'cancelled' && bill.cancelReason && (
                                            <p className="mt-0.5 text-xs text-stone-500">{bill.cancelReason}</p>
                                        )}
                                    </td>
                                    <td className="px-3 py-2">{renderActions(bill)}</td>
                                </tr>
                            ))}
                            {bills.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-3 py-10 text-center text-stone-400">No bills for this day</td>
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
