import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { QRCodeSVG } from 'qrcode.react';
import {
    PiMagnifyingGlassBold, PiMinusBold, PiPlusBold, PiTrashBold, PiWhatsappLogoFill, PiCheckBold, PiXBold,
    PiProhibitBold, PiPhoneBold, PiUserBold, PiRepeatBold, PiCaretUpBold, PiPrinterBold, PiLightningFill,
    PiReceiptDuotone, PiMoneyDuotone, PiQrCodeDuotone, PiCreditCardDuotone, PiCrownSimpleFill, PiArrowRightBold, PiArrowElbowDownLeftBold,
} from 'react-icons/pi';
import PrintArea from '../../components/pos/PrintArea';
import Skeleton from '../../components/pos/Skeleton';
import { Button, DishPhoto, IconButton, Kbd, Modal, Segmented, VegMark, inputClass } from '../../components/pos/ui';
import { showToast } from '../../utils/toast';
import {
    posApi, formatINR, formatPrice, computeTotals, buildUpiLink, isValidIndianMobile,
} from '../../utils/pos';
import { usePos } from '../../utils/posContext';
import { useCachedQuery } from '../../utils/useCachedQuery';

const PAYMENT_MODES = [
    { value: 'cash', label: 'Cash', icon: PiMoneyDuotone },
    { value: 'upi', label: 'UPI', icon: PiQrCodeDuotone },
    { value: 'card', label: 'Card', icon: PiCreditCardDuotone },
];

const LOOKUP_DELAY_MS = 250;
const POPULAR_COUNT = 8;
const AUTO_CLOSE_MS = 2500;

const quickCashAmounts = (total) => {
    const amounts = new Set([total]);
    [50, 100, 200, 500, 2000].forEach((note) => amounts.add(Math.ceil(total / note) * note));
    return [...amounts].filter((amount) => amount >= total).sort((a, b) => a - b).slice(0, 4);
};

const NO_ITEMS = [];
const fetchMenu = () => posApi.get('/menu').then((res) => res.data.items);
// Today's best sellers, pinned above the menu for one-tap billing
const fetchPopular = () => posApi.get('/reports/summary')
    .then((res) => res.data.summary.items.slice(0, POPULAR_COUNT).map((item) => item.name));

const phoneDigits = (value) => String(value || '').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

/* ---------- Menu ---------- */

const DishCard = ({ item, quantity, editing, onClick }) => {
    const soldOut = item.isAvailable === false;
    return (
        <button
            type="button"
            onClick={() => onClick(item)}
            aria-label={`${item.name}, ${formatPrice(item.price)}${soldOut ? ', sold out' : ''}${quantity ? `, ${quantity} in order` : ''}`}
            className={`group relative flex flex-col overflow-hidden rounded-[20px] border bg-white text-left shadow-[var(--shadow-card)] transition-[transform,box-shadow,border-color] duration-200 active:scale-[0.97] ${
                quantity ? 'border-saffron ring-2 ring-saffron/25' : 'border-line hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-[var(--shadow-lift)]'
            } ${editing ? 'ring-2 ring-rose-300/70' : ''}`}
        >
            <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
                <DishPhoto item={item} rounded="" dimmed={soldOut} className="h-full w-full transition-transform duration-500 group-hover:scale-[1.04]" />
                <span className="absolute left-2.5 top-2.5 rounded-md bg-white/95 p-[3px] shadow-sm"><VegMark isVeg={item.isVeg !== false} /></span>
                {quantity > 0 && (
                    <span key={quantity} className="qb-pop absolute right-2.5 top-2.5 flex h-7 min-w-7 items-center justify-center rounded-full bg-saffron px-2 text-[13px] font-bold tabular-nums text-white shadow-lg shadow-orange-700/30">
                        {quantity}
                    </span>
                )}
                {soldOut && (
                    <span className="absolute inset-0 flex items-center justify-center bg-white/45">
                        <span className="rounded-full bg-stone-900/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">Sold out</span>
                    </span>
                )}
            </div>
            <div className="flex flex-1 flex-col justify-between gap-2.5 p-3">
                <p className="line-clamp-2 text-[14px] font-semibold leading-snug text-stone-900">{item.name}</p>
                <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-[17px] font-bold tabular-nums text-stone-900">{formatPrice(item.price)}</span>
                    {editing ? (
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${soldOut ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                            {soldOut ? 'Make available' : 'Mark sold out'}
                        </span>
                    ) : !soldOut && (
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-900 text-sm text-white transition-colors group-hover:bg-saffron" aria-hidden="true">
                            <PiPlusBold />
                        </span>
                    )}
                </div>
            </div>
        </button>
    );
};

DishCard.propTypes = {
    item: PropTypes.object.isRequired,
    quantity: PropTypes.number,
    editing: PropTypes.bool,
    onClick: PropTypes.func.isRequired,
};

/* ---------- Order ---------- */

const CartLine = ({ line, onChange }) => (
    <li className="qb-fade flex gap-3 py-3">
        <DishPhoto item={line.item} className="h-[52px] w-[52px] shrink-0" rounded="rounded-xl" />
        <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
                <p className="truncate text-[14px] font-semibold leading-snug text-stone-900">{line.item.name}</p>
                <span className="shrink-0 text-[14px] font-semibold tabular-nums text-stone-900">{formatPrice(line.item.price * line.quantity)}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-3">
                <span className="text-xs tabular-nums text-stone-500">{formatPrice(line.item.price)} each</span>
                <div className="flex items-center rounded-full bg-white ring-1 ring-line">
                    <button type="button" onClick={() => onChange(line.item._id, -1)} className="flex h-8 w-8 items-center justify-center rounded-full text-stone-600 transition-colors hover:bg-stone-100" aria-label={`One less ${line.item.name}`}>
                        {line.quantity === 1 ? <PiTrashBold className="text-rose-500" /> : <PiMinusBold />}
                    </button>
                    <span className="w-6 text-center text-sm font-bold tabular-nums">{line.quantity}</span>
                    <button type="button" onClick={() => onChange(line.item._id, 1)} className="flex h-8 w-8 items-center justify-center rounded-full text-stone-600 transition-colors hover:bg-stone-100" aria-label={`One more ${line.item.name}`}>
                        <PiPlusBold />
                    </button>
                </div>
            </div>
        </div>
    </li>
);

CartLine.propTypes = {
    line: PropTypes.object.isRequired,
    onChange: PropTypes.func.isRequired,
};

const SummaryRow = ({ label, value, muted = false }) => (
    <div className={`flex items-center justify-between text-[13px] ${muted ? 'text-stone-500' : 'text-stone-700'}`}>
        <span>{label}</span>
        <span className="tabular-nums">{value}</span>
    </div>
);

SummaryRow.propTypes = { label: PropTypes.node, value: PropTypes.node, muted: PropTypes.bool };

/* ---------- Dialogs ---------- */

const UpiDialog = ({ total, settings, reference, onReference, submitting, onConfirm, onClose }) => (
    <Modal title="Scan & pay" description="Any UPI app - GPay, PhonePe, Paytm, BHIM" onClose={onClose} size="sm">
        <div className="text-center">
            <p className="font-display text-[44px] font-bold leading-none tracking-tight tabular-nums">{formatINR(total)}</p>
            {settings.upiVpa ? (
                <div className="mx-auto mt-5 w-fit rounded-3xl border border-line bg-white p-4 shadow-[var(--shadow-card)]">
                    <QRCodeSVG
                        value={buildUpiLink({ vpa: settings.upiVpa, payeeName: settings.upiPayeeName, amount: total, note: `${settings.name} bill` })}
                        size={208}
                        level="M"
                    />
                    <p className="mt-3 text-[13px] font-semibold text-stone-700">{settings.upiPayeeName}</p>
                    <p className="text-xs text-stone-500">{settings.upiVpa}</p>
                </div>
            ) : (
                <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">No UPI ID is set for this hotel yet - ask the customer to scan your printed UPI QR.</p>
            )}
            <input
                value={reference}
                onChange={(event) => onReference(event.target.value)}
                placeholder="UPI reference / last 4 digits (optional)"
                maxLength={64}
                className={`${inputClass} mt-5 text-center`}
            />
            <Button variant="success" size="lg" onClick={onConfirm} disabled={submitting} className="mt-3 w-full">
                <PiCheckBold /> {submitting ? 'Saving…' : 'Payment received'}
            </Button>
            <p className="mt-2.5 text-xs text-stone-500">Confirm only after the soundbox announces the payment.</p>
        </div>
    </Modal>
);

UpiDialog.propTypes = {
    total: PropTypes.number.isRequired,
    settings: PropTypes.object.isRequired,
    reference: PropTypes.string,
    onReference: PropTypes.func.isRequired,
    submitting: PropTypes.bool,
    onConfirm: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
};

const TokenDialog = ({ result, autoClose, onClose, onReprint }) => {
    const { bill, whatsapp } = result;
    return (
        <div className="qb-fade fixed inset-0 z-[70] flex items-end justify-center bg-stone-950/50 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={onClose}>
            <div className="qb-sheet w-full max-w-sm overflow-hidden rounded-t-[28px] bg-white text-center shadow-2xl sm:rounded-[28px]" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Token ${bill.tokenNumber}`}>
                <div className="relative bg-gradient-to-br from-emerald-500 to-emerald-700 px-7 pb-7 pt-8 text-white">
                    <svg className="qb-tick mx-auto h-12 w-12" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                        <circle cx="24" cy="24" r="22" fill="white" fillOpacity="0.18" />
                        <path d="M14 24.5l7 7 13-14" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.3em] text-emerald-50/80">Token</p>
                    <p className="font-display text-[88px] font-extrabold leading-[0.95] tracking-tight tabular-nums">{bill.tokenNumber}</p>
                    <p className="mt-1 font-mono text-xs text-emerald-50/75">{bill.billNumber}</p>
                </div>
                <div className="p-6">
                    <p className="flex items-center justify-center gap-2 font-display text-2xl font-bold tabular-nums">
                        {formatINR(bill.total)}
                        <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-stone-600">{bill.payment.mode}</span>
                    </p>

                    {bill.payment.mode === 'cash' && bill.payment.changeReturned > 0 && (
                        <p className="mt-4 rounded-2xl bg-emerald-50 py-3.5 text-lg font-bold text-emerald-800 ring-1 ring-emerald-200">
                            Return {formatINR(bill.payment.changeReturned)}
                        </p>
                    )}

                    {whatsapp && (
                        <div className="mt-4">
                            {whatsapp.status === 'sent' && <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-emerald-700"><PiWhatsappLogoFill /> Bill sent on WhatsApp</p>}
                            {whatsapp.status === 'failed' && <p className="mb-2 text-xs text-rose-600">WhatsApp failed: {whatsapp.error}</p>}
                            {whatsapp.status !== 'sent' && whatsapp.link && (
                                <a href={whatsapp.link} target="_blank" rel="noreferrer" className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] font-bold text-white transition hover:brightness-95">
                                    <PiWhatsappLogoFill className="text-xl" /> Send bill on WhatsApp
                                </a>
                            )}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={onClose}
                        className="relative mt-3 flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-ink text-base font-bold text-white transition hover:bg-stone-800"
                    >
                        {autoClose && <span className="pos-countdown absolute inset-x-0 bottom-0 h-1 bg-saffron" style={{ animationDuration: `${AUTO_CLOSE_MS}ms` }} />}
                        Next order <Kbd dark><PiArrowElbowDownLeftBold /></Kbd>
                    </button>
                    <button type="button" onClick={onReprint} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-800">
                        <PiPrinterBold /> Printer jammed? Print again
                    </button>
                </div>
            </div>
        </div>
    );
};

TokenDialog.propTypes = {
    result: PropTypes.object.isRequired,
    autoClose: PropTypes.bool,
    onClose: PropTypes.func.isRequired,
    onReprint: PropTypes.func.isRequired,
};

/* ---------- Counter ---------- */

export default function PosCounter() {
    const { settings } = usePos();
    const { data: menuData, error: menuError, refresh: loadMenu, mutate: mutateMenu } = useCachedQuery('menu', fetchMenu);
    const { data: popular = NO_ITEMS, refresh: loadPopular } = useCachedQuery('popular', fetchPopular);
    const menu = menuData || NO_ITEMS;
    const [search, setSearch] = useState('');
    const [activeCounter, setActiveCounter] = useState('All');
    const [editAvailability, setEditAvailability] = useState(false);

    const [cart, setCart] = useState([]);
    const [phone, setPhone] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [regular, setRegular] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [paymentMode, setPaymentMode] = useState('cash');
    const [cashReceived, setCashReceived] = useState('');

    const [billOpen, setBillOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [upiDialog, setUpiDialog] = useState(false);
    const [upiReference, setUpiReference] = useState('');
    const [result, setResult] = useState(null);
    const [printJob, setPrintJob] = useState(null);

    const searchRef = useRef(null);

    useEffect(() => {
        if (menuError) showToast.error('Failed to load menu');
    }, [menuError]);

    // Find regulars as the cashier types the first digits of their number
    useEffect(() => {
        const digits = phoneDigits(phone);
        if (digits.length < 3 || digits === regular?.phone) {
            setSuggestions([]);
            return undefined;
        }

        const timer = setTimeout(async () => {
            try {
                const res = await posApi.get('/customers', { params: { phone: digits } });
                const found = res.data.customers;
                const exact = found.find((customer) => customer.phone === digits);
                if (exact) {
                    setRegular(exact);
                    setCustomerName((current) => current || exact.name || '');
                    setSuggestions([]);
                } else {
                    setSuggestions(found);
                }
            } catch {
                setSuggestions([]);
            }
        }, LOOKUP_DELAY_MS);

        return () => clearTimeout(timer);
    }, [phone, regular]);

    const counters = useMemo(() => {
        const counts = new Map();
        menu.forEach((item) => counts.set(item.counter, (counts.get(item.counter) || 0) + 1));
        return [['All', menu.length], ...counts.entries()];
    }, [menu]);

    const visibleMenu = useMemo(() => {
        const term = search.trim().toLowerCase();
        return menu.filter((item) =>
            (activeCounter === 'All' || item.counter === activeCounter) &&
            (!term || item.name.toLowerCase().includes(term))
        );
    }, [menu, search, activeCounter]);

    const popularItems = useMemo(
        () => popular
            .map((name) => menu.find((item) => item.name === name))
            .filter((item) => item && item.isAvailable !== false),
        [popular, menu]
    );

    const quantities = useMemo(() => new Map(cart.map((line) => [line.item._id, line.quantity])), [cart]);

    const totals = useMemo(() => {
        if (!settings) return null;
        return computeTotals(cart.map((line) => ({ price: line.item.price, quantity: line.quantity })), settings);
    }, [cart, settings]);

    const total = totals?.total || 0;
    const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);
    const cashValue = cashReceived === '' ? total : Number(cashReceived);
    const change = paymentMode === 'cash' ? cashValue - total : 0;
    const digits = phoneDigits(phone);
    const hasPhone = digits.length > 0;

    // ---- Cart ----
    const addItem = (item, quantity = 1) => {
        setCart((prev) => {
            const existing = prev.find((line) => line.item._id === item._id);
            if (existing) {
                return prev.map((line) => (
                    line.item._id === item._id ? { ...line, quantity: Math.min(line.quantity + quantity, 99) } : line
                ));
            }
            return [...prev, { item, quantity: Math.min(quantity, 99) }];
        });
    };

    const changeQuantity = (itemId, delta) => {
        setCart((prev) => prev
            .map((line) => (line.item._id === itemId ? { ...line, quantity: Math.min(line.quantity + delta, 99) } : line))
            .filter((line) => line.quantity > 0));
    };

    const resetOrder = () => {
        setCart([]);
        setPhone('');
        setCustomerName('');
        setRegular(null);
        setSuggestions([]);
        setCashReceived('');
        setUpiReference('');
        setPaymentMode('cash');
        setBillOpen(false);
    };

    const selectRegular = (customer) => {
        setRegular(customer);
        setPhone(customer.phone);
        setCustomerName(customer.name || '');
        setSuggestions([]);
    };

    const repeatLastOrder = () => {
        const skipped = [];
        regular.lastItems.forEach((last) => {
            const item = menu.find((menuItem) => menuItem._id === last.itemId) ||
                menu.find((menuItem) => menuItem.name === last.name);
            if (item && item.isAvailable !== false) addItem(item, last.quantity);
            else skipped.push(last.name);
        });
        if (skipped.length) showToast.warning(`Not available now: ${skipped.join(', ')}`);
    };

    const toggleAvailability = async (item) => {
        try {
            const res = await posApi.patch(`/menu/${item._id}/availability`, { isAvailable: item.isAvailable === false });
            mutateMenu((prev = []) => prev.map((menuItem) => (menuItem._id === item._id ? res.data.item : menuItem)));
            if (res.data.item.isAvailable === false) {
                setCart((prev) => prev.filter((line) => line.item._id !== item._id));
            }
            showToast.info(`${item.name} is ${res.data.item.isAvailable ? 'available' : 'sold out'}`);
        } catch (error) {
            showToast.error(error.response?.data?.message || 'Failed to update item');
        }
    };

    const handleTileClick = (item) => {
        if (editAvailability) toggleAvailability(item);
        else if (item.isAvailable === false) showToast.warning(`${item.name} is sold out`);
        else addItem(item);
    };

    // ---- Billing ----
    const validate = () => {
        if (cart.length === 0) {
            showToast.error('Add items to the order');
            return false;
        }
        if (hasPhone && !isValidIndianMobile(digits)) {
            showToast.error('Enter a valid 10-digit mobile number, or clear it');
            return false;
        }
        if (paymentMode === 'cash' && (!Number.isFinite(cashValue) || cashValue < total)) {
            showToast.error(`Cash received must be at least ${formatINR(total)}`);
            return false;
        }
        return true;
    };

    const submitBill = async () => {
        setSubmitting(true);
        try {
            const res = await posApi.post('/bills', {
                items: cart.map((line) => ({ itemId: line.item._id, quantity: line.quantity })),
                payment: {
                    mode: paymentMode,
                    cashReceived: paymentMode === 'cash' ? cashValue : undefined,
                    reference: paymentMode !== 'cash' ? upiReference || undefined : undefined,
                },
                customer: { name: customerName || undefined, phone: digits || undefined },
                sendWhatsapp: hasPhone,
            });

            const { bill, whatsapp } = res.data;
            setResult({ bill, whatsapp });
            setUpiDialog(false);
            resetOrder();

            // Automatic printing: token slips always; the full bill only when it isn't going on WhatsApp
            const coupons = settings.printCounterCoupons !== false;
            const receiptOnWhatsapp = Boolean(whatsapp) && whatsapp.status !== 'failed';
            const includeReceipt = !receiptOnWhatsapp || !coupons;
            setPrintJob({ bill, coupons, includeReceipt });
            posApi.post(`/bills/${bill._id}/printed`).catch(() => {});
            loadPopular();
        } catch (error) {
            showToast.error(error.response?.data?.message || 'Failed to create bill');
            loadMenu();
        } finally {
            setSubmitting(false);
        }
    };

    const handleConfirm = () => {
        if (submitting || !validate()) return;
        if (paymentMode === 'upi') {
            setUpiDialog(true);
            return;
        }
        submitBill();
    };

    const closeResult = useCallback(() => {
        setResult(null);
        searchRef.current?.focus();
    }, []);

    const handlePrintDone = useCallback(() => setPrintJob(null), []);

    useEffect(() => {
        if (!result) return undefined;
        const onKey = (event) => {
            if (event.key === 'Enter' || event.key === 'Escape') closeResult();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [result, closeResult]);

    // Nothing left to do on the token screen (no change to return, no WhatsApp tap) - move on by itself
    const autoClose = Boolean(result) &&
        !(result.bill.payment.changeReturned > 0) &&
        (!result.whatsapp || result.whatsapp.status === 'sent');

    useEffect(() => {
        if (!autoClose) return undefined;
        const timer = setTimeout(closeResult, AUTO_CLOSE_MS);
        return () => clearTimeout(timer);
    }, [autoClose, closeResult]);

    // Ctrl+Enter confirms the order from anywhere on the counter; "/" jumps to search
    const confirmRef = useRef(null);
    confirmRef.current = handleConfirm;
    const modalOpen = Boolean(result) || upiDialog;
    useEffect(() => {
        if (modalOpen) return undefined;
        const onKey = (event) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                confirmRef.current?.();
            } else if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
                event.preventDefault();
                searchRef.current?.focus();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [modalOpen]);

    const handleSearchKey = (event) => {
        if (event.key === 'Escape') {
            setSearch('');
        } else if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey && search.trim()) {
            const match = visibleMenu.find((item) => item.isAvailable !== false);
            if (match) {
                addItem(match);
                setSearch('');
            }
        }
    };

    const gstLabel = settings.gstScheme !== 'regular'
        ? null
        : `GST ${settings.gstRate}%${settings.pricesIncludeGst ? ' (included)' : ''}`;
    const showPopular = popularItems.length > 0 && !search.trim() && activeCounter === 'All' && !editAvailability;

    return (
        <div className="flex h-full">
            {/* ---------- Menu ---------- */}
            <section className="flex min-h-0 min-w-0 flex-1 flex-col">
                <div className="space-y-3 px-4 pb-3 pt-4 sm:px-6 sm:pt-5">
                    <div className="flex items-center gap-2.5">
                        <div className="relative min-w-0 flex-1">
                            <PiMagnifyingGlassBold className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-stone-400" />
                            <input
                                ref={searchRef}
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                onKeyDown={handleSearchKey}
                                placeholder="Search dishes"
                                aria-label="Search dishes"
                                className="h-12 w-full rounded-2xl border border-line bg-white pl-11 pr-4 text-[15px] shadow-[var(--shadow-card)] outline-none transition placeholder:text-stone-400 focus:border-stone-900 focus:ring-4 focus:ring-stone-900/5 xl:pr-60"
                                autoFocus
                            />
                            <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1.5 text-xs text-stone-400 xl:flex">
                                <Kbd><PiArrowElbowDownLeftBold /></Kbd> add <span className="mx-1 text-stone-300">·</span> <Kbd>Ctrl</Kbd><Kbd><PiArrowElbowDownLeftBold /></Kbd> charge
                            </span>
                        </div>
                        <Button
                            variant={editAvailability ? 'danger' : 'secondary'}
                            onClick={() => setEditAvailability((value) => !value)}
                            className="h-12 rounded-2xl"
                            aria-pressed={editAvailability}
                        >
                            <PiProhibitBold className="text-base" /> <span className="hidden sm:inline">{editAvailability ? 'Done' : 'Sold out'}</span>
                        </Button>
                    </div>

                    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-6 sm:px-6">
                        {counters.map(([counter, count]) => (
                            <button
                                key={counter}
                                type="button"
                                onClick={() => setActiveCounter(counter)}
                                className={`flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-full pl-4 pr-3 text-[13px] font-semibold transition-colors ${
                                    activeCounter === counter ? 'bg-ink text-white' : 'bg-white text-stone-600 ring-1 ring-line hover:text-stone-900 hover:ring-stone-300'
                                }`}
                            >
                                {counter === 'All' ? 'All dishes' : counter}
                                <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${activeCounter === counter ? 'bg-white/15 text-white' : 'bg-stone-100 text-stone-500'}`}>{count}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-44 sm:px-6 md:pb-28 lg:pb-6">
                    {editAvailability && (
                        <p className="qb-fade mb-4 flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 ring-1 ring-rose-200">
                            <PiProhibitBold className="shrink-0" /> Tap a dish to mark it sold out, or available again. Tap Done when finished.
                        </p>
                    )}

                    {showPopular && (
                        <div className="mb-5">
                            <p className="mb-2.5 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.12em] text-stone-500">
                                <PiLightningFill className="text-saffron" /> Selling fast today
                            </p>
                            <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 [mask-image:linear-gradient(to_right,black_88%,transparent)] [scrollbar-width:none] sm:-mx-6 sm:px-6">
                                {popularItems.map((item) => (
                                    <button
                                        key={item._id}
                                        type="button"
                                        onClick={() => addItem(item)}
                                        className="flex shrink-0 items-center gap-2.5 rounded-2xl border border-line bg-white py-1.5 pl-1.5 pr-4 shadow-[var(--shadow-card)] transition hover:border-saffron/60 active:scale-[0.97]"
                                    >
                                        <DishPhoto item={item} className="h-10 w-10" rounded="rounded-xl" />
                                        <span className="text-left leading-tight">
                                            <span className="block max-w-[150px] truncate text-[13px] font-semibold text-stone-900">{item.name}</span>
                                            <span className="text-xs font-semibold tabular-nums text-stone-500">{formatPrice(item.price)}</span>
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid gap-3 sm:gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 158px), 1fr))' }}>
                        {visibleMenu.map((item) => (
                            <DishCard key={item._id} item={item} quantity={quantities.get(item._id) || 0} editing={editAvailability} onClick={handleTileClick} />
                        ))}
                        {!menuData && Array.from({ length: 10 }, (_, index) => <Skeleton key={index} className="aspect-[4/5]" />)}
                    </div>
                    {menuData && visibleMenu.length === 0 && (
                        <p className="py-20 text-center text-stone-500">No dishes match “{search}”.</p>
                    )}
                </div>
            </section>

            {/* ---------- Phones & portrait tablets: order bar ---------- */}
            {cart.length > 0 && !billOpen && (
                <button
                    type="button"
                    onClick={() => setBillOpen(true)}
                    className="qb-sheet fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-30 flex items-center gap-3 rounded-2xl bg-ink py-3 pl-3 pr-5 text-white shadow-[0_18px_40px_-12px_rgba(15,14,12,0.6)] md:bottom-4 lg:hidden"
                >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-saffron text-sm font-bold tabular-nums">{itemCount}</span>
                    <span className="flex-1 text-left text-sm font-semibold">View order <PiCaretUpBold className="inline" /></span>
                    <span className="font-display text-xl font-bold tabular-nums">{formatINR(total)}</span>
                </button>
            )}
            {billOpen && <div className="qb-fade fixed inset-0 z-40 bg-stone-950/45 lg:hidden" onClick={() => setBillOpen(false)} />}

            {/* ---------- Order panel (side panel on laptops, bottom sheet on phones) ---------- */}
            <aside
                className={`${billOpen ? 'qb-sheet fixed inset-x-0 bottom-0 top-[5vh] z-50 flex rounded-t-[28px] shadow-2xl' : 'hidden'} flex-col overflow-hidden bg-white lg:static lg:z-auto lg:flex lg:w-[380px] lg:rounded-none lg:border-l lg:border-line lg:shadow-none xl:w-[420px]`}
                aria-label="Current order"
            >
                <div className="flex items-center justify-between gap-3 px-6 pb-3 pt-5">
                    <div>
                        <h2 className="font-display text-xl font-bold tracking-tight">Current order</h2>
                        <p className="text-[13px] text-stone-500">{itemCount ? plural(itemCount, 'item') : 'Tap a dish to start'}</p>
                    </div>
                    <div className="flex items-center gap-1">
                        {cart.length > 0 && (
                            <Button variant="dangerGhost" size="sm" onClick={resetOrder}>
                                <PiTrashBold /> Clear
                            </Button>
                        )}
                        <IconButton label="Close order" onClick={() => setBillOpen(false)} className="lg:hidden"><PiXBold /></IconButton>
                    </div>
                </div>

                {/* Customer */}
                <div className="relative px-6 pb-4">
                    <div className="grid grid-cols-[1.15fr_1fr] gap-2">
                        <div className="relative">
                            <PiPhoneBold className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                            <input
                                value={phone}
                                onChange={(event) => {
                                    const value = event.target.value.replace(/[^\d+ ]/g, '');
                                    setPhone(value);
                                    if (regular && phoneDigits(value) !== regular.phone) setRegular(null);
                                }}
                                placeholder="Mobile"
                                aria-label="Customer mobile number"
                                inputMode="tel"
                                maxLength={15}
                                className="h-11 w-full rounded-xl border border-line bg-stone-50 pl-10 pr-3 text-sm outline-none transition focus:border-stone-900 focus:bg-white focus:ring-4 focus:ring-stone-900/5"
                            />
                        </div>
                        <div className="relative">
                            <PiUserBold className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                            <input
                                value={customerName}
                                onChange={(event) => setCustomerName(event.target.value)}
                                placeholder="Name"
                                aria-label="Customer name"
                                maxLength={60}
                                className="h-11 w-full rounded-xl border border-line bg-stone-50 pl-10 pr-3 text-sm outline-none transition focus:border-stone-900 focus:bg-white focus:ring-4 focus:ring-stone-900/5"
                            />
                        </div>
                    </div>

                    {suggestions.length > 0 && (
                        <div className="qb-pop absolute inset-x-6 top-full z-20 -mt-2 origin-top overflow-hidden rounded-2xl border border-line bg-white shadow-[var(--shadow-lift)]">
                            {suggestions.map((customer) => (
                                <button
                                    key={customer.phone}
                                    type="button"
                                    onClick={() => selectRegular(customer)}
                                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-orange-50"
                                >
                                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-800">
                                        {(customer.name || '?').charAt(0).toUpperCase()}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-semibold">{customer.name || 'Customer'}</span>
                                        <span className="block text-xs tabular-nums text-stone-500">{customer.phone.replace(/(\d{5})(\d{5})/, '$1 $2')}</span>
                                    </span>
                                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600">{plural(customer.visits, 'visit')}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {regular && (
                        <div className="qb-fade mt-3 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 p-3 ring-1 ring-orange-200/70">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-saffron to-orange-600 font-bold text-white">
                                {(regular.name || 'R').charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0 flex-1 leading-tight">
                                <p className="flex items-center gap-1 truncate text-sm font-semibold text-stone-900">
                                    {regular.name || 'Regular'} {regular.visits >= 5 && <PiCrownSimpleFill className="text-amber-500" title="Regular" />}
                                </p>
                                <p className="truncate text-xs text-orange-900/70">{plural(regular.visits, 'visit')}</p>
                            </div>
                            {regular.lastItems?.length > 0 && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={repeatLastOrder}
                                    className="ring-orange-200 text-orange-800"
                                    title={regular.lastItems.map((item) => `${item.name} ×${item.quantity}`).join(', ')}
                                >
                                    <PiRepeatBold /> Repeat
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                {/* Lines */}
                <div className="min-h-[96px] flex-1 overflow-y-auto border-t border-line px-6">
                    {cart.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center py-10 text-center">
                            <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-stone-100 text-[32px] text-stone-400">
                                <PiReceiptDuotone />
                            </span>
                            <p className="mt-4 font-semibold text-stone-800">No items yet</p>
                            <p className="mt-1 max-w-[240px] text-[13px] leading-relaxed text-stone-500">Tap a dish, or type its name and press <Kbd>Enter</Kbd></p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-line">
                            {cart.map((line) => <CartLine key={line.item._id} line={line} onChange={changeQuantity} />)}
                        </ul>
                    )}
                </div>

                {/* Payment */}
                <div className="space-y-4 border-t border-line bg-stone-50/70 px-6 pb-6 pt-5 [@media(max-height:820px)]:space-y-3 [@media(max-height:820px)]:pb-4 [@media(max-height:820px)]:pt-4">
                    {cart.length > 0 && totals && (
                        <div className="space-y-1.5 [@media(max-height:820px)]:hidden">
                            <SummaryRow label={`Subtotal · ${plural(itemCount, 'item')}`} value={formatINR(totals.subtotal)} />
                            {gstLabel && <SummaryRow label={gstLabel} value={formatINR(totals.cgst + totals.sgst)} muted />}
                            {totals.roundOff !== 0 && <SummaryRow label="Round off" value={formatINR(totals.roundOff)} muted />}
                        </div>
                    )}
                    <div className="flex items-end justify-between">
                        <span className="text-[13px] font-semibold uppercase tracking-[0.12em] text-stone-500">Total</span>
                        <span className="font-display text-[36px] font-bold leading-none tracking-tight tabular-nums [@media(max-height:820px)]:text-[30px]">{formatINR(total)}</span>
                    </div>

                    <Segmented options={PAYMENT_MODES} value={paymentMode} onChange={setPaymentMode} size="lg" />

                    {paymentMode === 'cash' && cart.length > 0 && (
                        <div className="qb-fade space-y-2.5">
                            <div className="grid grid-cols-4 gap-1.5">
                                {quickCashAmounts(total).map((amount) => (
                                    <button
                                        key={amount}
                                        type="button"
                                        onClick={() => setCashReceived(String(amount))}
                                        className={`h-9 rounded-xl text-[13px] font-semibold tabular-nums transition-colors ${
                                            cashValue === amount ? 'bg-ink text-white' : 'bg-white text-stone-700 ring-1 ring-line hover:ring-stone-300'
                                        }`}
                                    >
                                        {amount === total ? 'Exact' : `₹${amount}`}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    value={cashReceived}
                                    onChange={(event) => setCashReceived(event.target.value.replace(/[^\d.]/g, ''))}
                                    placeholder={`Cash received · ₹${total}`}
                                    aria-label="Cash received"
                                    inputMode="decimal"
                                    className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-white px-3.5 text-sm tabular-nums outline-none transition focus:border-stone-900 focus:ring-4 focus:ring-stone-900/5"
                                />
                                <span className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm font-bold tabular-nums ${change < 0 ? 'bg-rose-50 text-rose-700' : change > 0 ? 'bg-emerald-50 text-emerald-800' : 'text-stone-500'}`}>
                                    {change < 0 ? `${formatINR(-change)} short` : change > 0 ? `Return ${formatINR(change)}` : 'No change'}
                                </span>
                            </div>
                        </div>
                    )}

                    <Button variant="accent" size="lg" onClick={handleConfirm} disabled={cart.length === 0 || submitting} className="w-full text-[17px]">
                        {submitting ? 'Saving…' : (
                            <>
                                <span className="flex-1 text-left">Charge <span className="tabular-nums">{formatINR(total)}</span></span>
                                <span className="hidden items-center gap-1 sm:flex"><Kbd dark>Ctrl</Kbd><Kbd dark><PiArrowElbowDownLeftBold /></Kbd></span>
                                <PiArrowRightBold className="sm:hidden" />
                            </>
                        )}
                    </Button>
                    <p className="flex items-center justify-center gap-1.5 text-xs text-stone-500 [@media(max-height:820px)]:hidden">
                        {hasPhone
                            ? <><PiWhatsappLogoFill className="text-emerald-600" /> Bill on WhatsApp · token slips print automatically</>
                            : <><PiPrinterBold /> Bill and token slips print automatically</>}
                    </p>
                </div>
            </aside>

            {upiDialog && (
                <UpiDialog
                    total={total}
                    settings={settings}
                    reference={upiReference}
                    onReference={setUpiReference}
                    submitting={submitting}
                    onConfirm={submitBill}
                    onClose={() => setUpiDialog(false)}
                />
            )}

            {result && (
                <TokenDialog
                    result={result}
                    autoClose={autoClose}
                    onClose={closeResult}
                    onReprint={() => setPrintJob({ bill: result.bill, coupons: settings.printCounterCoupons !== false, includeReceipt: true })}
                />
            )}

            <PrintArea job={printJob} settings={settings} onDone={handlePrintDone} />
            <span className="sr-only" aria-live="polite">{itemCount ? `${plural(itemCount, 'item')}, ${formatINR(total)}` : ''}</span>
        </div>
    );
}
