import { useCallback, useMemo, useState } from 'react';
import { FiPrinter, FiMessageCircle, FiXCircle, FiRefreshCw, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi';
import PrintArea from '../../components/pos/PrintArea';
import Skeleton from '../../components/pos/Skeleton';
import { Card, StatTile, HourlyColumns, PaymentMix, BarList } from '../../components/pos/DashboardCharts';
import { showToast } from '../../utils/toast';
import { posApi, formatINR, formatTime, todayInTimeZone, isValidIndianMobile } from '../../utils/pos';
import { usePos } from '../../utils/posContext';
import { useCachedQuery } from '../../utils/useCachedQuery';

const LIVE_REFRESH_MS = 30000;
const BILLS_PREVIEW = 25;
const NO_BILLS = [];

const STATUS_STYLES = {
    preparing: 'bg-orange-50 text-orange-800',
    ready: 'bg-emerald-50 text-emerald-800',
    served: 'bg-stone-100 text-stone-600',
    cancelled: 'bg-rose-50 text-rose-700',
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
    const { user, settings } = usePos();
    const today = todayInTimeZone(settings.timeZone);

    const [date, setDate] = useState(today);
    const [countedCash, setCountedCash] = useState('');
    const [printJob, setPrintJob] = useState(null);
    const [showAllBills, setShowAllBills] = useState(false);

    // One request for bills + summary + last week's comparison; today's view stays live
    const isToday = date === today;
    const { data, error, refresh, isLoading } = useCachedQuery(
        `dashboard:${date}`,
        () => posApi.get('/reports/dashboard', { params: { date } }).then((res) => res.data),
        { refreshInterval: isToday ? LIVE_REFRESH_MS : 0 }
    );
    const [refreshing, setRefreshing] = useState(false);

    const bills = data?.bills || NO_BILLS;
    const summary = data?.summary;
    const lastWeek = data?.compare;

    const reload = useCallback(async () => {
        setRefreshing(true);
        await refresh();
        setRefreshing(false);
    }, [refresh]);

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
            refresh();
        } catch (err) {
            tab?.close();
            showToast.error(err.response?.data?.message || 'Failed to send receipt');
        }
    };

    const cancelBill = async (bill) => {
        const reason = window.prompt(`Cancel token #${bill.tokenNumber} (${formatINR(bill.total)})? Enter the reason:`);
        if (!reason) return;
        try {
            await posApi.patch(`/bills/${bill._id}/cancel`, { reason });
            showToast.success(`Token #${bill.tokenNumber} cancelled`);
            refresh();
        } catch (err) {
            showToast.error(err.response?.data?.message || 'Failed to cancel bill');
        }
    };

    const prep = averagePrepMinutes(summary);
    const prepLastWeek = averagePrepMinutes(lastWeek);
    const compareLabel = `vs last ${weekday(date)}`;

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

    const renderActions = (bill) => (
        <div className="flex gap-0.5">
            <button
                onClick={() => setPrintJob({ bill, coupons: false })}
                className="rounded-full p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-900"
                title="Print bill again"
            >
                <FiPrinter />
            </button>
            {bill.status !== 'cancelled' && (
                <button
                    onClick={() => sendWhatsapp(bill)}
                    className={`rounded-full p-2 transition hover:bg-emerald-50 ${
                        bill.receipt?.whatsapp?.status === 'sent' ? 'text-emerald-600' : 'text-stone-400 hover:text-stone-900'
                    }`}
                    title={bill.receipt?.whatsapp?.status === 'sent' ? 'Sent - resend on WhatsApp' : 'Send on WhatsApp'}
                >
                    <FiMessageCircle />
                </button>
            )}
            {user.role === 'admin' && bill.status !== 'cancelled' && (
                <button
                    onClick={() => cancelBill(bill)}
                    className="rounded-full p-2 text-stone-400 transition hover:bg-rose-50 hover:text-rose-600"
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
        <div className="mx-auto max-w-7xl space-y-4 px-3 py-5 sm:px-6 sm:py-6">
            {/* Title */}
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <p className="flex items-center gap-2 text-xs font-medium text-stone-500">
                        {isToday && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />}
                        {isToday ? 'Live · updates every 30s' : 'Day report'}
                    </p>
                    <h1 className="mt-0.5 text-xl font-semibold tracking-tight">{longDate(date)}</h1>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={date}
                        max={today}
                        onChange={(e) => {
                            setDate(e.target.value || today);
                            setShowAllBills(false);
                            setCountedCash('');
                        }}
                        className="rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-sm shadow-sm"
                    />
                    <button
                        onClick={reload}
                        className="flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-sm font-medium text-stone-600 shadow-sm transition hover:text-stone-900"
                    >
                        <FiRefreshCw className={refreshing ? 'animate-spin' : ''} /> Refresh
                    </button>
                </div>
            </div>

            {error && !data && (
                <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">Couldn&apos;t load the dashboard. Check the connection and press Refresh.</p>
            )}

            {isLoading && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-[104px]" />)}
                    </div>
                    <div className="grid gap-4 lg:grid-cols-3">
                        <Skeleton className="h-72 lg:col-span-2" />
                        <Skeleton className="h-72" />
                    </div>
                </div>
            )}

            {summary && (
                <>
                    {/* KPIs */}
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <StatTile
                            label="Sales"
                            value={wholeRupees(summary.total)}
                            delta={percentChange(summary.total, lastWeek?.total)}
                            deltaLabel={compareLabel}
                        />
                        <StatTile
                            label="Bills"
                            value={summary.billCount.toLocaleString('en-IN')}
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
                            subtitle={summary.byHour.length ? 'Hover a column for details' : 'No sales yet'}
                            className="lg:col-span-2"
                        >
                            <HourlyColumns data={summary.byHour} />
                        </Card>

                        <div className="space-y-4">
                            <Card title="Payment mix" subtitle={`${summary.billCount} paid · ${summary.cancelledCount} cancelled`}>
                                <PaymentMix byMode={summary.byMode} />
                            </Card>

                            <Card title="Cash drawer check" subtitle={`Expected in drawer: ${formatINR(expectedCash)}`}>
                                <input
                                    value={countedCash}
                                    onChange={(e) => setCountedCash(e.target.value.replace(/[^\d.]/g, ''))}
                                    placeholder="Counted cash"
                                    inputMode="decimal"
                                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                                />
                                {cashDifference !== null && (
                                    <p className={`mt-2.5 flex items-center gap-2 text-sm font-medium ${cashDifference === 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
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
                        <Card title="Counter speed" subtitle="Average minutes from bill to ready">
                            <BarList
                                rows={counterRows}
                                formatValue={(value) => `${value} min`}
                                emptyText="Appears once counters start marking tokens ready"
                                emphasizeFirst={counterRows.length > 1}
                                emphasisLabel="Slowest"
                            />
                        </Card>
                        <Card title="Top dishes" subtitle="Plates sold">
                            <BarList rows={topItems} formatValue={(value) => `${value}`} emptyText="No sales yet" />
                        </Card>
                    </div>
                </>
            )}

            {/* Bills */}
            {data && (
                <>
                    <div className="flex items-center justify-between pt-2">
                        <h2 className="text-sm font-semibold">
                            Bills <span className="font-normal text-stone-400">· {bills.length}</span>
                        </h2>
                        {bills.length > BILLS_PREVIEW && (
                            <button
                                onClick={() => setShowAllBills((value) => !value)}
                                className="rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-medium text-stone-600 shadow-sm transition hover:text-stone-900"
                            >
                                {showAllBills ? `Show latest ${BILLS_PREVIEW}` : `Show all ${bills.length}`}
                            </button>
                        )}
                    </div>

                    {/* Cards on phones */}
                    <div className="space-y-2 md:hidden">
                        {visibleBills.map((bill) => (
                            <div key={bill._id} className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(28,25,23,0.05)]">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-lg font-semibold">#{bill.tokenNumber}</p>
                                        <p className="text-xs text-stone-400">
                                            {formatTime(bill.createdAt, settings.timeZone)} · {bill.payment.mode.toUpperCase()}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold">{formatINR(bill.total)}</p>
                                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[bill.status]}`}>{bill.status}</span>
                                    </div>
                                </div>
                                <p className="mt-2 text-sm text-stone-600">
                                    {bill.items.map((item) => `${item.name} ×${item.quantity}`).join(', ')}
                                </p>
                                {bill.status === 'cancelled' && bill.cancelReason && (
                                    <p className="mt-1 text-xs text-stone-500">Cancelled: {bill.cancelReason}</p>
                                )}
                                <div className="mt-2 flex items-center justify-between border-t border-stone-100 pt-2">
                                    <span className="font-mono text-[11px] text-stone-400">{bill.billNumber}</span>
                                    {renderActions(bill)}
                                </div>
                            </div>
                        ))}
                        {bills.length === 0 && (
                            <p className="rounded-2xl bg-white py-10 text-center text-sm text-stone-400">No bills for this day</p>
                        )}
                    </div>

                    {/* Table on tablets & desktops */}
                    <div className="hidden overflow-x-auto rounded-2xl border border-stone-200/80 bg-white shadow-[0_1px_2px_rgba(28,25,23,0.05)] md:block">
                        <table className="w-full text-[13px]">
                            <thead className="border-b border-stone-100 text-left text-[11px] font-medium uppercase tracking-wider text-stone-400">
                                <tr>
                                    <th className="px-4 py-2.5 font-medium">Token</th>
                                    <th className="px-4 py-2.5 font-medium">Bill no</th>
                                    <th className="px-4 py-2.5 font-medium">Time</th>
                                    <th className="px-4 py-2.5 font-medium">Items</th>
                                    <th className="px-4 py-2.5 font-medium">Paid by</th>
                                    <th className="px-4 py-2.5 text-right font-medium">Total</th>
                                    <th className="px-4 py-2.5 font-medium">Status</th>
                                    <th className="px-4 py-2.5"><span className="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleBills.map((bill) => (
                                    <tr key={bill._id} className="border-t border-stone-100 transition-colors hover:bg-stone-50/70">
                                        <td className="px-4 py-2 font-semibold tabular-nums">#{bill.tokenNumber}</td>
                                        <td className="px-4 py-2 font-mono text-[11px] text-stone-500">{bill.billNumber}</td>
                                        <td className="px-4 py-2 tabular-nums text-stone-600">{formatTime(bill.createdAt, settings.timeZone)}</td>
                                        <td className="max-w-xs px-4 py-2 text-stone-600">
                                            {bill.items.map((item) => `${item.name} ×${item.quantity}`).join(', ')}
                                        </td>
                                        <td className="px-4 py-2 text-[11px] font-medium uppercase text-stone-500">{bill.payment.mode}</td>
                                        <td className="px-4 py-2 text-right font-medium tabular-nums">{formatINR(bill.total)}</td>
                                        <td className="px-4 py-2">
                                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[bill.status]}`}>
                                                {bill.status}
                                            </span>
                                            {bill.status === 'cancelled' && bill.cancelReason && (
                                                <p className="mt-0.5 text-[11px] text-stone-500">{bill.cancelReason}</p>
                                            )}
                                        </td>
                                        <td className="px-4 py-1">{renderActions(bill)}</td>
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
                </>
            )}

            <PrintArea job={printJob} settings={settings} onDone={handlePrintDone} />
        </div>
    );
}
