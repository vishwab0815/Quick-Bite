import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiPrinter, FiMessageCircle, FiXCircle, FiRefreshCw, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi';
import PosHeader from '../../components/pos/PosHeader';
import PrintArea from '../../components/pos/PrintArea';
import { Card, StatTile, HourlyColumns, PaymentMix, BarList } from '../../components/pos/DashboardCharts';
import { showToast } from '../../utils/toast';
import {
    posApi, formatINR, formatTime, todayInTimeZone, isValidIndianMobile, useStaffUser, usePosSettings,
} from '../../utils/pos';

const LIVE_REFRESH_MS = 30000;
const BILLS_PREVIEW = 25;

const STATUS_STYLES = {
    preparing: 'bg-orange-50 text-orange-800',
    ready: 'bg-emerald-50 text-emerald-800',
    served: 'bg-stone-100 text-stone-600',
    cancelled: 'bg-rose-50 text-rose-700',
};

const shiftDate = (date, days) => {
    const value = new Date(`${date}T00:00:00Z`);
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
};

const weekday = (date) => new Intl.DateTimeFormat('en-IN', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));

const longDate = (date) => new Intl.DateTimeFormat('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
}).format(new Date(`${date}T00:00:00Z`));

// Headline figures read better without paise: ₹27,595
const wholeRupees = (amount) => `₹${Math.round(amount).toLocaleString('en-IN')}`;

const percentChange = (current, previous) => (
    previous > 0 ? Math.round(((current - previous) / previous) * 100) : undefined
);

const averagePrepMinutes = (summary) => {
    const speed = summary?.counterSpeed || [];
    const tokens = speed.reduce((sum, entry) => sum + entry.tokens, 0);
    if (!tokens) return null;
    return Math.round((speed.reduce((sum, entry) => sum + entry.avgMinutes * entry.tokens, 0) / tokens) * 10) / 10;
};

export default function PosBills() {
    const user = useStaffUser();
    const settings = usePosSettings(Boolean(user));

    const [date, setDate] = useState('');
    const [bills, setBills] = useState([]);
    const [summary, setSummary] = useState(null);
    const [lastWeek, setLastWeek] = useState(null);
    const [loading, setLoading] = useState(false);
    const [countedCash, setCountedCash] = useState('');
    const [printJob, setPrintJob] = useState(null);
    const [showAllBills, setShowAllBills] = useState(false);

    const today = settings ? todayInTimeZone(settings.timeZone) : '';

    useEffect(() => {
        if (settings && !date) setDate(todayInTimeZone(settings.timeZone));
    }, [settings, date]);

    const load = useCallback(async ({ quiet = false } = {}) => {
        if (!date) return;
        if (!quiet) setLoading(true);
        try {
            const [billsRes, summaryRes, lastWeekRes] = await Promise.all([
                posApi.get('/bills', { params: { date } }),
                posApi.get('/reports/summary', { params: { date } }),
                posApi.get('/reports/summary', { params: { date: shiftDate(date, -7) } }),
            ]);
            setBills(billsRes.data.bills);
            setSummary(summaryRes.data.summary);
            setLastWeek(lastWeekRes.data.summary);
        } catch (error) {
            if (!quiet) showToast.error(error.response?.data?.message || 'Failed to load the dashboard');
        } finally {
            if (!quiet) setLoading(false);
        }
    }, [date]);

    useEffect(() => {
        if (user) load();
    }, [user, load]);

    // Live: today's dashboard refreshes itself
    useEffect(() => {
        if (!user || !date || date !== today) return undefined;
        const timer = setInterval(() => load({ quiet: true }), LIVE_REFRESH_MS);
        return () => clearInterval(timer);
    }, [user, date, today, load]);

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
            load({ quiet: true });
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
            load({ quiet: true });
        } catch (error) {
            showToast.error(error.response?.data?.message || 'Failed to cancel bill');
        }
    };

    const prep = averagePrepMinutes(summary);
    const prepLastWeek = averagePrepMinutes(lastWeek);
    const compareLabel = date ? `vs last ${weekday(date)}` : '';

    const topItems = useMemo(() => (summary?.items || []).slice(0, 6).map((item) => ({
        label: item.name,
        value: item.quantity,
        detail: formatINR(item.amount),
    })), [summary]);

    const counterRows = useMemo(() => (summary?.counterSpeed || []).map((entry) => ({
        label: entry.counter,
        value: entry.avgMinutes,
        detail: `${entry.tokens} tokens`,
    })), [summary]);

    if (!user || !settings) {
        return (
            <div className="pos-app flex min-h-screen items-center justify-center bg-stone-100">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
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

    const visibleBills = showAllBills ? bills : bills.slice(0, BILLS_PREVIEW);
    const expectedCash = summary?.byMode.cash.total || 0;
    const cashDifference = countedCash === '' ? null : Math.round((Number(countedCash) - expectedCash) * 100) / 100;

    return (
        <div className="min-h-screen pos-app bg-stone-100">
            <PosHeader user={user} hotelName={settings.name} />

            <div className="mx-auto max-w-7xl space-y-4 px-3 py-5 sm:px-5">
                {/* Title */}
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <p className="flex items-center gap-2 text-sm font-medium text-stone-500">
                            {date === today && <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />}
                            {date === today ? 'Live · updates every 30s' : 'Day report'}
                        </p>
                        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{date ? longDate(date) : 'Dashboard'}</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={date}
                            max={today}
                            onChange={(e) => setDate(e.target.value)}
                            className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium shadow-sm"
                        />
                        <button
                            onClick={() => load()}
                            className="flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 shadow-sm hover:text-stone-900"
                        >
                            <FiRefreshCw className={loading ? 'animate-spin' : ''} /> Refresh
                        </button>
                    </div>
                </div>

                {summary && (
                    <>
                        {/* KPIs */}
                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                            <StatTile
                                hero
                                label="Sales"
                                value={wholeRupees(summary.total)}
                                delta={percentChange(summary.total, lastWeek?.total)}
                                deltaLabel={compareLabel}
                            />
                            <StatTile
                                label="Bills"
                                value={summary.billCount}
                                delta={percentChange(summary.billCount, lastWeek?.billCount)}
                                deltaLabel={compareLabel}
                            />
                            <StatTile
                                label="Average bill"
                                value={wholeRupees(summary.averageBill)}
                                delta={percentChange(summary.averageBill, lastWeek?.averageBill)}
                                deltaLabel={compareLabel}
                            />
                            <StatTile
                                label="Avg time to ready"
                                value={prep === null ? '—' : `${prep} min`}
                                delta={prep === null ? undefined : percentChange(prep, prepLastWeek)}
                                deltaLabel={compareLabel}
                                upIsGood={false}
                            />
                        </div>

                        <div className="grid gap-4 lg:grid-cols-3">
                            <Card
                                title="Sales by hour"
                                subtitle={summary.byHour.length ? 'Hover a column for details · busiest hour labelled' : 'No sales yet'}
                                className="lg:col-span-2"
                            >
                                <HourlyColumns data={summary.byHour} />
                            </Card>

                            <div className="space-y-4">
                                <Card title="Payment mix" subtitle={`${summary.billCount} paid bills · ${summary.cancelledCount} cancelled`}>
                                    <PaymentMix byMode={summary.byMode} />
                                </Card>

                                <Card title="Cash drawer check" subtitle={`Expected in drawer: ${formatINR(expectedCash)}`}>
                                    <input
                                        value={countedCash}
                                        onChange={(e) => setCountedCash(e.target.value.replace(/[^\d.]/g, ''))}
                                        placeholder="Count the cash and enter it here"
                                        inputMode="decimal"
                                        className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                                    />
                                    {cashDifference !== null && (
                                        <p className={`mt-3 flex items-center gap-2 text-sm font-semibold ${cashDifference === 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                            {cashDifference === 0 ? <FiCheckCircle /> : <FiAlertTriangle />}
                                            {cashDifference === 0
                                                ? 'Cash matches'
                                                : cashDifference > 0
                                                    ? `Excess ${formatINR(cashDifference)}`
                                                    : `Short ${formatINR(-cashDifference)}`}
                                        </p>
                                    )}
                                </Card>
                            </div>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-2">
                            <Card title="Counter speed" subtitle="Average minutes from bill to ready · slowest first">
                                <BarList
                                    rows={counterRows}
                                    formatValue={(value) => `${value} min`}
                                    emptyText="Appears once counters start marking tokens ready"
                                    emphasizeFirst={counterRows.length > 1}
                                    emphasisLabel="Slowest"
                                />
                            </Card>
                            <Card title="Top dishes" subtitle="Plates sold today">
                                <BarList rows={topItems} formatValue={(value) => `${value}`} emptyText="No sales yet" />
                            </Card>
                        </div>
                    </>
                )}

                {/* Bills - cards on phones */}
                <div className="flex items-center justify-between pt-2">
                    <h2 className="text-lg font-bold">Bills <span className="text-sm font-medium text-stone-400">({bills.length})</span></h2>
                    {bills.length > BILLS_PREVIEW && (
                        <button
                            onClick={() => setShowAllBills((value) => !value)}
                            className="rounded-full border border-stone-200 bg-white px-4 py-1.5 text-sm font-semibold text-stone-700 shadow-sm hover:text-stone-900"
                        >
                            {showAllBills ? `Show latest ${BILLS_PREVIEW}` : `Show all ${bills.length}`}
                        </button>
                    )}
                </div>
                <div className="space-y-2 md:hidden">
                    {visibleBills.map((bill) => (
                        <div key={bill._id} className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(28,25,23,0.05)]">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-2xl font-bold">#{bill.tokenNumber}</p>
                                    <p className="text-xs text-stone-400">
                                        {formatTime(bill.createdAt, settings.timeZone)} · {bill.payment.mode.toUpperCase()}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-bold">{formatINR(bill.total)}</p>
                                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[bill.status]}`}>{bill.status}</span>
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
                <div className="hidden overflow-x-auto rounded-3xl border border-stone-200/80 bg-white shadow-[0_1px_2px_rgba(28,25,23,0.05)] md:block">
                    <table className="w-full text-sm">
                        <thead className="border-b border-stone-100 text-left text-xs font-semibold uppercase tracking-wider text-stone-400">
                            <tr>
                                <th className="px-4 py-3">Token</th>
                                <th className="px-4 py-3">Bill no</th>
                                <th className="px-4 py-3">Time</th>
                                <th className="px-4 py-3">Items</th>
                                <th className="px-4 py-3">Paid by</th>
                                <th className="px-4 py-3 text-right">Total</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleBills.map((bill) => (
                                <tr key={bill._id} className="border-t border-stone-100 hover:bg-stone-50/60">
                                    <td className="px-4 py-2.5 text-base font-bold tabular-nums">#{bill.tokenNumber}</td>
                                    <td className="px-4 py-2.5 font-mono text-xs text-stone-500">{bill.billNumber}</td>
                                    <td className="px-4 py-2.5 tabular-nums text-stone-600">{formatTime(bill.createdAt, settings.timeZone)}</td>
                                    <td className="max-w-xs px-4 py-2.5 text-stone-600">
                                        {bill.items.map((item) => `${item.name} ×${item.quantity}`).join(', ')}
                                    </td>
                                    <td className="px-4 py-2.5 text-xs font-semibold uppercase text-stone-500">{bill.payment.mode}</td>
                                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{formatINR(bill.total)}</td>
                                    <td className="px-4 py-2.5">
                                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[bill.status]}`}>
                                            {bill.status}
                                        </span>
                                        {bill.status === 'cancelled' && bill.cancelReason && (
                                            <p className="mt-0.5 text-xs text-stone-500">{bill.cancelReason}</p>
                                        )}
                                    </td>
                                    <td className="px-4 py-2.5">{renderActions(bill)}</td>
                                </tr>
                            ))}
                            {bills.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center text-stone-400">No bills for this day</td>
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
