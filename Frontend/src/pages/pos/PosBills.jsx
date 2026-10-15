import { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
    PiPrinterBold, PiWhatsappLogoFill, PiArrowsClockwiseBold, PiCheckCircleFill, PiWarningCircleFill,
    PiCaretLeftBold, PiCaretRightBold, PiTrendUpBold, PiTrendDownBold, PiCurrencyInrDuotone, PiReceiptDuotone,
    PiCoinsDuotone, PiTimerDuotone, PiMagnifyingGlassBold, PiProhibitBold, PiXBold, PiMoneyDuotone,
    PiQrCodeDuotone, PiCreditCardDuotone, PiUserBold,
} from 'react-icons/pi';
import PrintArea from '../../components/pos/PrintArea';
import Skeleton from '../../components/pos/Skeleton';
import { HourlyColumns, PaymentMix, BarList } from '../../components/pos/DashboardCharts';
import {
    Button, ConfirmDialog, DishPhoto, EmptyState, Field, IconButton, Modal, PageHeader, Segmented, cardClass, inputClass,
} from '../../components/pos/ui';
import { showToast } from '../../utils/toast';
import { posApi, formatINR, formatPrice, formatTime, todayInTimeZone, isValidIndianMobile } from '../../utils/pos';
import { usePos } from '../../utils/posContext';
import { useCachedQuery } from '../../utils/useCachedQuery';

const LIVE_REFRESH_MS = 30000;
const BILLS_PREVIEW = 25;
const NO_BILLS = [];

const STATUS = {
    preparing: { label: 'Preparing', className: 'bg-amber-50 text-amber-800 ring-amber-200' },
    ready: { label: 'Ready', className: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
    served: { label: 'Served', className: 'bg-stone-100 text-stone-600 ring-stone-200' },
    cancelled: { label: 'Cancelled', className: 'bg-rose-50 text-rose-700 ring-rose-200' },
};

const MODE_ICONS = { cash: PiMoneyDuotone, upi: PiQrCodeDuotone, card: PiCreditCardDuotone };

const FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'cash', label: 'Cash' },
    { value: 'upi', label: 'UPI' },
    { value: 'card', label: 'Card' },
    { value: 'cancelled', label: 'Cancelled' },
];

const weekday = (date) => new Intl.DateTimeFormat('en-IN', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));

const longDate = (date) => new Intl.DateTimeFormat('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
}).format(new Date(`${date}T00:00:00Z`));

const shiftDate = (date, days) => {
    const next = new Date(`${date}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + days);
    return next.toISOString().slice(0, 10);
};

const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
};

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

const itemsText = (bill) => bill.items.map((item) => `${item.name} ×${item.quantity}`).join(', ');

/* ---------- Pieces ---------- */

const Panel = ({ title, subtitle, action, children, className = '' }) => (
    <section className={`${cardClass} p-5 sm:p-6 ${className}`}>
        {(title || action) && (
            <header className="mb-5 flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-[15px] font-semibold text-stone-900">{title}</h2>
                    {subtitle && <p className="mt-0.5 text-[13px] text-stone-500">{subtitle}</p>}
                </div>
                {action}
            </header>
        )}
        {children}
    </section>
);

Panel.propTypes = {
    title: PropTypes.node,
    subtitle: PropTypes.node,
    action: PropTypes.node,
    children: PropTypes.node,
    className: PropTypes.string,
};

/** Key figure with its change against the same weekday last week (colour + arrow + sign, never colour alone) */
const KpiCard = ({ icon, label, value, delta, compareDay, upIsGood = true }) => {
    const Icon = icon;
    const hasDelta = Number.isFinite(delta);
    const good = hasDelta && (delta === 0 || (delta > 0) === upIsGood);
    const Trend = delta >= 0 ? PiTrendUpBold : PiTrendDownBold;
    return (
        <div className={`${cardClass} p-5`}>
            <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-stone-500">{label}</span>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-xl text-saffron-deep"><Icon aria-hidden="true" /></span>
            </div>
            <p className="mt-2 font-display text-[30px] font-bold leading-none tracking-tight tabular-nums text-stone-900">{value}</p>
            <p className="mt-3 flex items-center gap-1.5 text-xs">
                {hasDelta ? (
                    <>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold tabular-nums ${good ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                            <Trend aria-hidden="true" /> {delta > 0 ? '+' : ''}{delta}%
                        </span>
                        <span className="whitespace-nowrap text-stone-500">vs <span className="hidden sm:inline">last </span>{compareDay}</span>
                    </>
                ) : (
                    <span className="text-stone-400">No data for last {compareDay}</span>
                )}
            </p>
        </div>
    );
};

KpiCard.propTypes = {
    icon: PropTypes.elementType.isRequired,
    label: PropTypes.string.isRequired,
    value: PropTypes.node.isRequired,
    delta: PropTypes.number,
    compareDay: PropTypes.string,
    upIsGood: PropTypes.bool,
};

/** Best sellers with their photos - ranked bars, value at the tip */
const TopDishes = ({ items }) => {
    if (items.length === 0) return <p className="py-8 text-center text-sm text-stone-400">No sales yet</p>;
    const max = Math.max(...items.map((item) => item.quantity)) || 1;
    return (
        <ol className="space-y-3.5">
            {items.map((item, index) => (
                <li key={item.name} className="flex items-center gap-3" title={`${item.name}: ${item.quantity} sold · ${formatINR(item.amount)}`}>
                    <span className="w-4 text-right text-xs font-bold tabular-nums text-stone-400">{index + 1}</span>
                    <DishPhoto item={{ name: item.name }} className="h-11 w-11 shrink-0" rounded="rounded-xl" />
                    <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                            <span className="truncate text-sm font-semibold text-stone-800">{item.name}</span>
                            <span className="shrink-0 text-sm tabular-nums">
                                <span className="font-semibold text-stone-900">{item.quantity}</span>
                                <span className="ml-1.5 text-xs text-stone-400">{formatPrice(Math.round(item.amount))}</span>
                            </span>
                        </div>
                        <div className="mt-1.5 h-2 rounded-r-[4px] bg-stone-100">
                            <div className="h-full rounded-r-[4px]" style={{ width: `${Math.max((item.quantity / max) * 100, 3)}%`, background: index === 0 ? 'var(--viz-series-2)' : 'var(--viz-series-1)' }} />
                        </div>
                    </div>
                </li>
            ))}
        </ol>
    );
};

TopDishes.propTypes = { items: PropTypes.array.isRequired };

const hourName = (hour) => {
    const h = Number(hour);
    if (h === 0) return '12 AM';
    if (h === 12) return '12 PM';
    return h < 12 ? `${h} AM` : `${h - 12} PM`;
};

/** Three quick facts under the hourly chart */
const HourFacts = ({ summary }) => {
    const busiest = summary.byHour.reduce((best, slot) => (slot.total > (best?.total || 0) ? slot : best), null);
    const facts = [
        { label: 'Busiest hour', value: busiest ? hourName(busiest.hour) : '—', note: busiest ? wholeRupees(busiest.total) : 'No sales yet' },
        { label: 'Bills per hour', value: summary.byHour.length ? Math.round(summary.billCount / summary.byHour.length) : '—', note: `over ${summary.byHour.length} open hours` },
        { label: 'GST collected', value: wholeRupees(summary.cgst + summary.sgst), note: `on ${wholeRupees(summary.taxableAmount)} taxable` },
    ];
    return (
        <dl className="mt-6 grid grid-cols-3 divide-x divide-line border-t border-line pt-5">
            {facts.map((fact) => (
                <div key={fact.label} className="px-4 first:pl-0 last:pr-0">
                    <dt className="text-xs font-medium text-stone-500">{fact.label}</dt>
                    <dd className="mt-1 font-display text-xl font-bold tabular-nums text-stone-900">{fact.value}</dd>
                    <dd className="truncate text-xs text-stone-400">{fact.note}</dd>
                </div>
            ))}
        </dl>
    );
};

HourFacts.propTypes = { summary: PropTypes.object.isRequired };

// Ordered and paid by the customer online (website, table QR or kiosk)
const OnlineTag = () => (
    <span className="ml-1.5 inline-flex items-center rounded-full bg-violet-50 px-2 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wide text-violet-700 ring-1 ring-violet-200">Online</span>
);

const isOnline = (bill) => Boolean(bill.payment?.gateway) || (bill.source && bill.source !== 'counter');

const StatusPill = ({ status }) => (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${STATUS[status]?.className}`}>{STATUS[status]?.label || status}</span>
);

StatusPill.propTypes = { status: PropTypes.string };

/** One bill: items, totals, payment and actions */
const BillDetail = ({ bill, timeZone, isOwner, onPrint, onWhatsapp, onCancel, onClose }) => {
    const ModeIcon = MODE_ICONS[bill.payment.mode] || PiMoneyDuotone;
    return (
        <Modal
            title={<span className="flex items-center gap-3">Token #{bill.tokenNumber} <StatusPill status={bill.status} /></span>}
            description={`${bill.billNumber} · ${formatTime(bill.createdAt, timeZone)}`}
            onClose={onClose}
            footer={(
                <>
                    {isOwner && bill.status !== 'cancelled' && (
                        <Button variant="dangerGhost" onClick={onCancel} className="mr-auto"><PiProhibitBold /> Cancel bill</Button>
                    )}
                    <Button variant="secondary" onClick={onPrint}><PiPrinterBold /> Print</Button>
                    {bill.status !== 'cancelled' && <Button variant="success" onClick={onWhatsapp}><PiWhatsappLogoFill /> WhatsApp</Button>}
                </>
            )}
        >
            <ul className="divide-y divide-line">
                {bill.items.map((item) => (
                    <li key={`${item.itemId}-${item.name}`} className="flex items-center gap-3 py-2.5">
                        <DishPhoto item={{ name: item.name }} className="h-10 w-10 shrink-0" rounded="rounded-lg" />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.name}</span>
                        <span className="text-sm tabular-nums text-stone-500">{item.quantity} × {formatPrice(item.price)}</span>
                        <span className="w-20 text-right text-sm font-semibold tabular-nums">{formatINR(item.amount)}</span>
                    </li>
                ))}
            </ul>
            <div className="mt-3 space-y-1.5 rounded-2xl bg-stone-50 p-4 text-sm">
                {(bill.cgst > 0 || bill.sgst > 0) && (
                    <div className="flex justify-between text-stone-500"><span>GST</span><span className="tabular-nums">{formatINR(bill.cgst + bill.sgst)}</span></div>
                )}
                <div className="flex items-end justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="font-display text-2xl font-bold tabular-nums">{formatINR(bill.total)}</span>
                </div>
                <div className="flex items-center justify-between pt-1 text-stone-600">
                    <span className="flex items-center gap-1.5 font-semibold uppercase"><ModeIcon className="text-base text-saffron-deep" /> {bill.payment.mode}{bill.payment.gateway && <span className="font-normal normal-case text-stone-500">· paid online</span>}</span>
                    {bill.payment.refund?.id && <span className="font-semibold text-violet-700">Refunded {formatINR(bill.payment.refund.amount)}</span>}
                    {bill.payment.mode === 'cash' && bill.payment.cashReceived > 0 && (
                        <span className="tabular-nums">Received {formatINR(bill.payment.cashReceived)} · change {formatINR(bill.payment.changeReturned || 0)}</span>
                    )}
                </div>
            </div>
            {(bill.customer?.name || bill.customer?.phone) && (
                <p className="mt-3 flex items-center gap-2 text-sm text-stone-600"><PiUserBold className="text-stone-400" /> {bill.customer.name || 'Customer'} {bill.customer.phone && <span className="tabular-nums text-stone-400">· {bill.customer.phone.slice(-10)}</span>}</p>
            )}
            {bill.status === 'cancelled' && bill.cancelReason && (
                <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800">Cancelled: {bill.cancelReason}</p>
            )}
        </Modal>
    );
};

BillDetail.propTypes = {
    bill: PropTypes.object.isRequired,
    timeZone: PropTypes.string,
    isOwner: PropTypes.bool,
    onPrint: PropTypes.func.isRequired,
    onWhatsapp: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
};

const PhoneDialog = ({ onSend, onClose }) => {
    const [phone, setPhone] = useState('');
    const valid = isValidIndianMobile(phone);
    return (
        <Modal title="Send bill on WhatsApp" description="This bill has no mobile number yet." onClose={onClose} size="sm">
            <form onSubmit={(event) => { event.preventDefault(); if (valid) onSend(phone); }} className="space-y-4">
                <Field label="Customer mobile number">
                    <input className={inputClass} value={phone} onChange={(event) => setPhone(event.target.value.replace(/[^\d+ ]/g, ''))} inputMode="tel" maxLength={15} autoFocus placeholder="98765 43210" />
                </Field>
                <Button type="submit" variant="success" disabled={!valid} className="w-full"><PiWhatsappLogoFill /> Send</Button>
            </form>
        </Modal>
    );
};

PhoneDialog.propTypes = { onSend: PropTypes.func.isRequired, onClose: PropTypes.func.isRequired };

/* ---------- Page ---------- */

export default function PosBills() {
    const { user, settings } = usePos();
    const today = todayInTimeZone(settings.timeZone);

    const [date, setDate] = useState(today);
    const [countedCash, setCountedCash] = useState('');
    const [printJob, setPrintJob] = useState(null);
    const [showAllBills, setShowAllBills] = useState(false);
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState('all');
    const [openBill, setOpenBill] = useState(null);
    const [cancelling, setCancelling] = useState(null);
    const [askPhoneFor, setAskPhoneFor] = useState(null);

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
    const isOwner = user.role === 'admin';

    const reload = useCallback(async () => {
        setRefreshing(true);
        await refresh();
        setRefreshing(false);
    }, [refresh]);

    const changeDate = (next) => {
        setDate(next > today ? today : next);
        setShowAllBills(false);
        setCountedCash('');
    };

    const handlePrintDone = useCallback(() => setPrintJob(null), []);

    const sendWhatsapp = async (bill, phone) => {
        if (!bill.customer?.phone && !phone) {
            setAskPhoneFor(bill);
            return;
        }
        setAskPhoneFor(null);
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

    const cancelBill = async (bill, reason) => {
        try {
            const res = await posApi.patch(`/bills/${bill._id}/cancel`, { reason });
            showToast.success(`Token #${bill.tokenNumber}: ${res.data.message}`);
            setCancelling(null);
            setOpenBill(null);
            refresh();
        } catch (err) {
            showToast.error(err.response?.data?.message || 'Failed to cancel bill');
        }
    };

    const prep = averagePrepMinutes(summary);
    const prepLastWeek = averagePrepMinutes(lastWeek);

    const counterRows = useMemo(() => (summary?.counterSpeed || []).map((entry) => ({
        label: entry.counter,
        value: entry.avgMinutes,
        detail: `${entry.tokens} tokens`,
    })), [summary]);

    const filteredBills = useMemo(() => {
        const text = query.trim().toLowerCase();
        return bills.filter((bill) => {
            if (filter === 'cancelled' && bill.status !== 'cancelled') return false;
            if (['cash', 'upi', 'card'].includes(filter) && (bill.payment.mode !== filter || bill.status === 'cancelled')) return false;
            if (!text) return true;
            return String(bill.tokenNumber) === text.replace('#', '')
                || bill.billNumber.toLowerCase().includes(text)
                || bill.items.some((item) => item.name.toLowerCase().includes(text))
                || (bill.customer?.name || '').toLowerCase().includes(text);
        });
    }, [bills, query, filter]);

    const visibleBills = showAllBills || query || filter !== 'all' ? filteredBills : filteredBills.slice(0, BILLS_PREVIEW);
    const expectedCash = summary?.byMode.cash.total || 0;
    const cashDifference = countedCash === '' ? null : Math.round((Number(countedCash) - expectedCash) * 100) / 100;
    const firstName = String(user.name || '').split(' ')[0];

    return (
        <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <PageHeader
                eyebrow={isToday
                    ? <><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Live · updates every 30 seconds</>
                    : <>Day report</>}
                title={isToday ? `${greeting()}, ${firstName}` : longDate(date)}
                subtitle={isToday ? `${longDate(date)} · ${settings.name}` : settings.name}
                actions={(
                    <>
                        <div className="flex items-center rounded-xl bg-white ring-1 ring-line">
                            <IconButton label="Previous day" onClick={() => changeDate(shiftDate(date, -1))}><PiCaretLeftBold /></IconButton>
                            <input
                                type="date"
                                value={date}
                                max={today}
                                onChange={(event) => changeDate(event.target.value || today)}
                                aria-label="Day"
                                className="h-9 w-[136px] bg-transparent px-1 text-center text-sm font-medium outline-none"
                            />
                            <IconButton label="Next day" onClick={() => changeDate(shiftDate(date, 1))} disabled={isToday} className="disabled:opacity-30"><PiCaretRightBold /></IconButton>
                        </div>
                        {!isToday && <Button variant="secondary" size="sm" onClick={() => changeDate(today)}>Today</Button>}
                        <Button variant="secondary" size="sm" onClick={reload} aria-label="Refresh">
                            <PiArrowsClockwiseBold className={refreshing ? 'animate-spin' : ''} /> <span className="hidden sm:inline">Refresh</span>
                        </Button>
                    </>
                )}
            />

            {error && !data && (
                <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">Couldn&apos;t load the dashboard. Check the connection and press Refresh.</p>
            )}

            {isLoading && (
                <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-[136px] rounded-3xl" />)}</div>
                    <div className="grid gap-5 lg:grid-cols-3"><Skeleton className="h-80 rounded-3xl lg:col-span-2" /><Skeleton className="h-80 rounded-3xl" /></div>
                </div>
            )}

            {summary && (
                <>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                        <KpiCard icon={PiCurrencyInrDuotone} label="Sales" value={wholeRupees(summary.total)} delta={percentChange(summary.total, lastWeek?.total)} compareDay={weekday(date)} />
                        <KpiCard icon={PiReceiptDuotone} label="Bills" value={summary.billCount.toLocaleString('en-IN')} delta={percentChange(summary.billCount, lastWeek?.billCount)} compareDay={weekday(date)} />
                        <KpiCard icon={PiCoinsDuotone} label="Average bill" value={wholeRupees(summary.averageBill)} delta={percentChange(summary.averageBill, lastWeek?.averageBill)} compareDay={weekday(date)} />
                        <KpiCard
                            icon={PiTimerDuotone}
                            label="Time to ready"
                            value={prep === null ? '—' : `${prep} min`}
                            delta={prep === null ? undefined : percentChange(prep, prepLastWeek)}
                            compareDay={weekday(date)}
                            upIsGood={false}
                        />
                    </div>

                    <div className="grid gap-5 lg:grid-cols-3">
                        <Panel title="Sales by hour" subtitle={summary.byHour.length ? 'Hover a column for details' : 'No sales yet'} className="lg:col-span-2">
                            <HourlyColumns data={summary.byHour} />
                            <HourFacts summary={summary} />
                        </Panel>
                        <div className="space-y-5">
                            <Panel title="How customers paid" subtitle={`${summary.billCount} paid · ${summary.cancelledCount} cancelled`}>
                                <PaymentMix byMode={summary.byMode} />
                            </Panel>
                            <Panel title="Cash drawer check" subtitle={`Expected in drawer: ${formatINR(expectedCash)}`}>
                                <input
                                    value={countedCash}
                                    onChange={(event) => setCountedCash(event.target.value.replace(/[^\d.]/g, ''))}
                                    placeholder="Count the cash and enter it"
                                    aria-label="Counted cash"
                                    inputMode="decimal"
                                    className={inputClass}
                                />
                                {cashDifference !== null && (
                                    <p className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${cashDifference === 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                                        {cashDifference === 0 ? <PiCheckCircleFill /> : <PiWarningCircleFill />}
                                        {cashDifference === 0 ? 'Cash matches' : cashDifference > 0 ? `Excess ${formatINR(cashDifference)}` : `Short ${formatINR(-cashDifference)}`}
                                    </p>
                                )}
                            </Panel>
                        </div>
                    </div>

                    <div className="grid gap-5 lg:grid-cols-2">
                        <Panel title="Top dishes" subtitle="Plates sold">
                            <TopDishes items={(summary.items || []).slice(0, 6)} />
                        </Panel>
                        <Panel title="Counter speed" subtitle="Average minutes from bill to ready">
                            <BarList
                                rows={counterRows}
                                formatValue={(value) => `${value} min`}
                                emptyText="Appears once counters start marking tokens ready"
                                emphasizeFirst={counterRows.length > 1}
                                emphasisLabel="Slowest"
                            />
                        </Panel>
                    </div>
                </>
            )}

            {/* Bills */}
            {data && (
                <section className="space-y-4 pt-2">
                    <div className="flex flex-wrap items-center gap-3">
                        <h2 className="mr-auto font-display text-xl font-bold tracking-tight">
                            Bills <span className="font-sans text-sm font-medium text-stone-400">· {bills.length}</span>
                        </h2>
                        <div className="relative w-full sm:w-64">
                            <PiMagnifyingGlassBold className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Token, bill no, dish or name" aria-label="Search bills" className={`${inputClass} h-10 pl-10 text-sm`} />
                        </div>
                        <Segmented options={FILTERS} value={filter} onChange={setFilter} className="w-full sm:w-auto" />
                    </div>

                    {filteredBills.length === 0 ? (
                        <EmptyState icon={PiReceiptDuotone} title={bills.length ? 'No bills match' : 'No bills for this day'}>
                            {bills.length ? 'Try a different search or filter.' : 'Bills appear here as soon as the counter starts billing.'}
                        </EmptyState>
                    ) : (
                        <>
                            {/* Phones: cards */}
                            <ul className="space-y-2.5 md:hidden">
                                {visibleBills.map((bill) => (
                                    <li key={bill._id}>
                                        <button type="button" onClick={() => setOpenBill(bill)} className={`${cardClass} w-full p-4 text-left active:bg-stone-50`}>
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="font-display text-lg font-bold">#{bill.tokenNumber}{isOnline(bill) && <OnlineTag />}</p>
                                                    <p className="text-xs text-stone-500">{formatTime(bill.createdAt, settings.timeZone)} · {bill.payment.mode.toUpperCase()}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`font-semibold tabular-nums ${bill.status === 'cancelled' ? 'text-stone-400 line-through' : ''}`}>{formatINR(bill.total)}</p>
                                                    <StatusPill status={bill.status} />
                                                </div>
                                            </div>
                                            <p className="mt-2 line-clamp-2 text-sm text-stone-600">{itemsText(bill)}</p>
                                        </button>
                                    </li>
                                ))}
                            </ul>

                            {/* Tablets & laptops: table */}
                            <div className={`${cardClass} hidden overflow-hidden md:block`}>
                                <table className="w-full text-[13px]">
                                    <thead className="border-b border-line bg-stone-50/70 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">
                                        <tr>
                                            <th className="px-5 py-3">Token</th>
                                            <th className="px-4 py-3">Time</th>
                                            <th className="px-4 py-3">Items</th>
                                            <th className="px-4 py-3">Paid by</th>
                                            <th className="px-4 py-3 text-right">Total</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-line">
                                        {visibleBills.map((bill) => {
                                            const ModeIcon = MODE_ICONS[bill.payment.mode] || PiMoneyDuotone;
                                            return (
                                                <tr key={bill._id} onClick={() => setOpenBill(bill)} className="cursor-pointer transition-colors hover:bg-orange-50/40">
                                                    <td className="whitespace-nowrap px-5 py-3">
                                                        <p className="whitespace-nowrap font-display text-[15px] font-bold tabular-nums">#{bill.tokenNumber}{isOnline(bill) && <OnlineTag />}</p>
                                                        <p className="font-mono text-[10px] text-stone-400">{bill.billNumber}</p>
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-stone-600">{formatTime(bill.createdAt, settings.timeZone)}</td>
                                                    <td className="max-w-sm px-4 py-3 text-stone-600"><span className="line-clamp-1">{itemsText(bill)}</span></td>
                                                    <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase text-stone-600"><ModeIcon className="text-base text-stone-400" /> {bill.payment.mode}</span></td>
                                                    <td className={`whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums ${bill.status === 'cancelled' ? 'text-stone-400 line-through' : 'text-stone-900'}`}>{formatINR(bill.total)}</td>
                                                    <td className="px-4 py-3"><StatusPill status={bill.status} /></td>
                                                    <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                                                        <div className="flex justify-end">
                                                            <IconButton label="Print bill again" onClick={() => setPrintJob({ bill, coupons: false })}><PiPrinterBold /></IconButton>
                                                            {bill.status !== 'cancelled' && (
                                                                <IconButton
                                                                    label={bill.receipt?.whatsapp?.status === 'sent' ? 'Sent - resend on WhatsApp' : 'Send on WhatsApp'}
                                                                    onClick={() => sendWhatsapp(bill)}
                                                                    className={bill.receipt?.whatsapp?.status === 'sent' ? 'text-emerald-600' : ''}
                                                                >
                                                                    <PiWhatsappLogoFill />
                                                                </IconButton>
                                                            )}
                                                            {isOwner && bill.status !== 'cancelled' && (
                                                                <IconButton label="Cancel bill" tone="danger" onClick={() => setCancelling(bill)}><PiXBold /></IconButton>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {filteredBills.length > visibleBills.length && (
                                <div className="flex justify-center">
                                    <Button variant="secondary" size="sm" onClick={() => setShowAllBills(true)}>Show all {filteredBills.length} bills</Button>
                                </div>
                            )}
                        </>
                    )}
                </section>
            )}

            {openBill && (
                <BillDetail
                    bill={openBill}
                    timeZone={settings.timeZone}
                    isOwner={isOwner}
                    onPrint={() => setPrintJob({ bill: openBill, coupons: false })}
                    onWhatsapp={() => sendWhatsapp(openBill)}
                    onCancel={() => setCancelling(openBill)}
                    onClose={() => setOpenBill(null)}
                />
            )}
            {cancelling && (
                <ConfirmDialog
                    title={`Cancel token #${cancelling.tokenNumber}?`}
                    description={cancelling.payment?.gateway
                        ? `${formatINR(cancelling.total)} will be refunded to the customer through Razorpay and removed from today's sales. This is recorded with your name.`
                        : `${formatINR(cancelling.total)} will be removed from today's sales. This is recorded with your name.`}
                    reasonLabel="Reason"
                    confirmLabel="Cancel bill"
                    onConfirm={(reason) => cancelBill(cancelling, reason)}
                    onClose={() => setCancelling(null)}
                />
            )}
            {askPhoneFor && <PhoneDialog onSend={(phone) => sendWhatsapp(askPhoneFor, phone)} onClose={() => setAskPhoneFor(null)} />}

            <PrintArea job={printJob} settings={settings} onDone={handlePrintDone} />
        </div>
    );
}
