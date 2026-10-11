import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
    FiSearch, FiMinus, FiPlus, FiTrash2, FiMessageCircle, FiCheck, FiX, FiSlash,
    FiPhone, FiUser, FiRepeat, FiChevronUp, FiPrinter, FiShoppingBag, FiZap,
} from 'react-icons/fi';
import PrintArea from '../../components/pos/PrintArea';
import VegDot from '../../components/pos/VegDot';
import Skeleton from '../../components/pos/Skeleton';
import { showToast } from '../../utils/toast';
import {
    posApi, formatINR, computeTotals, buildUpiLink, isValidIndianMobile,
} from '../../utils/pos';
import { usePos } from '../../utils/posContext';
import { useCachedQuery } from '../../utils/useCachedQuery';

const PAYMENT_MODES = [
    { id: 'cash', label: 'Cash' },
    { id: 'upi', label: 'UPI' },
    { id: 'card', label: 'Card' },
];

const LOOKUP_DELAY_MS = 250;
const POPULAR_COUNT = 6;
const AUTO_CLOSE_MS = 2500;

const quickCashAmounts = (total) => {
    const amounts = new Set([total]);
    [50, 100, 200, 500, 2000].forEach((note) => amounts.add(Math.ceil(total / note) * note));
    return [...amounts].filter((amount) => amount >= total).sort((a, b) => a - b).slice(0, 5);
};

const NO_ITEMS = [];
const fetchMenu = () => posApi.get('/menu').then((res) => res.data.items);
// Today's best sellers, pinned above the menu for one-tap billing
const fetchPopular = () => posApi.get('/reports/summary')
    .then((res) => res.data.summary.items.slice(0, POPULAR_COUNT).map((item) => item.name));

const phoneDigits = (value) => String(value || '').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');

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

    const counters = useMemo(
        () => ['All', ...new Set(menu.map((item) => item.counter))],
        [menu]
    );

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

    // Ctrl+Enter confirms the order from anywhere on the counter
    const confirmRef = useRef(null);
    confirmRef.current = handleConfirm;
    const modalOpen = Boolean(result) || upiDialog;
    useEffect(() => {
        if (modalOpen) return undefined;
        const onKey = (event) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                confirmRef.current?.();
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

    const upiConfigured = Boolean(settings.upiVpa);
    const gstIncluded = settings.gstScheme === 'regular' && settings.pricesIncludeGst;
    const gstAdded = settings.gstScheme === 'regular' && !settings.pricesIncludeGst;

    return (
        <div className="flex h-full flex-col">
            <div className="flex min-h-0 flex-1">
                {/* ---------- Menu ---------- */}
                <section className="flex min-h-0 min-w-0 flex-1 flex-col px-3 pt-3 sm:px-5 sm:pt-4">
                    <div className="mb-3 flex items-center gap-2">
                        <div className="relative flex-1">
                            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                            <input
                                ref={searchRef}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={handleSearchKey}
                                placeholder="Search dishes"
                                className="w-full rounded-2xl border border-stone-200 bg-white py-3 pl-11 pr-4 text-[15px] shadow-sm outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100 lg:pr-56"
                                autoFocus
                            />
                            <span className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 text-xs text-stone-400 lg:block">
                                <kbd className="rounded border border-stone-200 px-1.5 py-0.5 font-sans">Enter</kbd> add ·{' '}
                                <kbd className="rounded border border-stone-200 px-1.5 py-0.5 font-sans">Ctrl+Enter</kbd> confirm
                            </span>
                        </div>
                        <button
                            onClick={() => setEditAvailability((value) => !value)}
                            className={`flex shrink-0 items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm transition ${
                                editAvailability ? 'bg-rose-600 text-white' : 'border border-stone-200 bg-white text-stone-600 hover:text-stone-900'
                            }`}
                        >
                            <FiSlash /> <span className="hidden sm:inline">{editAvailability ? 'Done' : 'Sold out'}</span>
                        </button>
                    </div>

                    {editAvailability && (
                        <p className="mb-3 rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
                            Tap a dish to mark it sold out or available again. Tap Done when finished.
                        </p>
                    )}

                    <div className="-mx-3 mb-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
                        {counters.map((counter) => (
                            <button
                                key={counter}
                                onClick={() => setActiveCounter(counter)}
                                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                                    activeCounter === counter
                                        ? 'bg-stone-900 text-white shadow-sm'
                                        : 'bg-white text-stone-600 ring-1 ring-stone-200 hover:text-stone-900'
                                }`}
                            >
                                {counter}
                            </button>
                        ))}
                    </div>

                    {popularItems.length > 0 && !search.trim() && activeCounter === 'All' && !editAvailability && (
                        <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                            <span className="flex shrink-0 items-center gap-1 text-xs font-semibold uppercase tracking-wider text-stone-400">
                                <FiZap className="text-orange-500" /> Popular
                            </span>
                            {popularItems.map((item) => (
                                <button
                                    key={item._id}
                                    onClick={() => addItem(item)}
                                    className="flex shrink-0 items-center gap-2 rounded-full bg-orange-50 px-3.5 py-2 text-sm font-semibold text-orange-900 ring-1 ring-orange-200 transition hover:bg-orange-100 active:scale-95"
                                >
                                    {item.name}
                                    <span className="font-medium text-orange-700/70">{formatINR(item.price)}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-2.5 overflow-y-auto overflow-x-hidden pb-28 sm:grid-cols-3 sm:gap-3 lg:pb-5 xl:grid-cols-4 2xl:grid-cols-5">
                        {visibleMenu.map((item) => {
                            const soldOut = item.isAvailable === false;
                            const inCart = cart.find((line) => line.item._id === item._id);
                            return (
                                <button
                                    key={item._id}
                                    onClick={() => handleTileClick(item)}
                                    className={`relative flex min-h-[96px] flex-col justify-between rounded-2xl border bg-white p-3.5 text-left shadow-[0_1px_2px_rgba(28,25,23,0.05)] transition active:scale-[0.97] ${
                                        soldOut ? 'border-stone-200 opacity-55' : 'border-stone-200/80 hover:border-orange-300 hover:shadow-md'
                                    } ${inCart ? 'border-orange-400 ring-2 ring-orange-100' : ''} ${editAvailability ? 'ring-2 ring-rose-200' : ''}`}
                                >
                                    <span className="flex items-start gap-2 pr-7">
                                        <span className="mt-0.5"><VegDot isVeg={item.isVeg !== false} /></span>
                                        <span className="text-[15px] font-semibold leading-snug text-stone-800">{item.name}</span>
                                    </span>
                                    <span className="mt-3 flex items-center justify-between gap-2">
                                        <span className="text-base font-bold tabular-nums text-stone-900">{formatINR(item.price)}</span>
                                        {soldOut && (
                                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-rose-700">
                                                Sold out
                                            </span>
                                        )}
                                    </span>
                                    {inCart && (
                                        <span className="absolute right-2.5 top-2.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-orange-600 px-1.5 text-xs font-bold tabular-nums text-white shadow">
                                            {inCart.quantity}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                        {!menuData && Array.from({ length: 12 }, (_, index) => <Skeleton key={index} className="h-24" />)}
                        {menuData && visibleMenu.length === 0 && (
                            <p className="col-span-full py-16 text-center text-stone-400">No dishes found</p>
                        )}
                    </div>
                </section>

                {/* ---------- Mobile: sticky bill bar ---------- */}
                {cart.length > 0 && !billOpen && (
                    <button
                        onClick={() => setBillOpen(true)}
                        className="fixed inset-x-3 bottom-3 z-30 flex items-center justify-between rounded-2xl bg-stone-900 px-5 py-4 text-white shadow-xl lg:hidden"
                    >
                        <span className="flex items-center gap-2 text-sm font-semibold">
                            <FiShoppingBag /> {itemCount} item{itemCount === 1 ? '' : 's'} · View order <FiChevronUp />
                        </span>
                        <span className="text-lg font-bold tabular-nums">{formatINR(total)}</span>
                    </button>
                )}
                {billOpen && <div className="fixed inset-0 z-40 bg-stone-900/40 lg:hidden" onClick={() => setBillOpen(false)} />}

                {/* ---------- Order panel (side panel on desktop, bottom sheet on mobile) ---------- */}
                <aside
                    className={`${
                        billOpen ? 'fixed inset-x-0 bottom-0 top-[6vh] z-50 flex rounded-t-3xl shadow-2xl' : 'hidden'
                    } flex-col bg-white lg:static lg:z-auto lg:flex lg:w-[400px] lg:rounded-none lg:border-l lg:border-stone-200 lg:shadow-none xl:w-[430px]`}
                >
                    <div className="flex items-center justify-between px-5 pb-2 pt-4">
                        <div>
                            <h2 className="text-lg font-bold">Current order</h2>
                            <p className="text-xs font-medium text-stone-400">{itemCount ? `${itemCount} item${itemCount === 1 ? '' : 's'}` : 'No items yet'}</p>
                        </div>
                        <div className="flex items-center gap-1">
                            {cart.length > 0 && (
                                <button onClick={resetOrder} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-rose-600 hover:bg-rose-50">
                                    <FiTrash2 /> Clear
                                </button>
                            )}
                            <button onClick={() => setBillOpen(false)} className="rounded-full p-2 text-stone-500 hover:bg-stone-100 lg:hidden" aria-label="Close order">
                                <FiX />
                            </button>
                        </div>
                    </div>

                    {/* Customer */}
                    <div className="relative px-5 pb-3">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <FiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                                <input
                                    value={phone}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/[^\d+ ]/g, '');
                                        setPhone(value);
                                        if (regular && phoneDigits(value) !== regular.phone) setRegular(null);
                                    }}
                                    placeholder="Mobile number"
                                    inputMode="tel"
                                    maxLength={15}
                                    className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                                />
                            </div>
                            <div className="relative w-[42%]">
                                <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                                <input
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    placeholder="Name"
                                    maxLength={60}
                                    className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                                />
                            </div>
                        </div>

                        {suggestions.length > 0 && (
                            <div className="absolute inset-x-5 top-full z-20 -mt-1 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl">
                                {suggestions.map((customer) => (
                                    <button
                                        key={customer.phone}
                                        onClick={() => selectRegular(customer)}
                                        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-orange-50"
                                    >
                                        <span>
                                            <span className="block text-sm font-semibold tabular-nums">{customer.phone.replace(/(\d{5})(\d{5})/, '$1 $2')}</span>
                                            <span className="block text-xs text-stone-500">{customer.name || 'Customer'}</span>
                                        </span>
                                        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-600">
                                            {customer.visits} visit{customer.visits === 1 ? '' : 's'}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {regular && (
                            <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-orange-50 px-3 py-2">
                                <p className="min-w-0 truncate text-sm">
                                    <span className="font-semibold text-orange-800">{regular.name || 'Regular'}</span>
                                    <span className="text-orange-700/80"> · {regular.visits} visit{regular.visits === 1 ? '' : 's'}</span>
                                </p>
                                {regular.lastItems?.length > 0 && (
                                    <button
                                        onClick={repeatLastOrder}
                                        className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-orange-700 shadow-sm ring-1 ring-orange-200 hover:bg-orange-100"
                                        title={regular.lastItems.map((item) => `${item.name} ×${item.quantity}`).join(', ')}
                                    >
                                        <FiRepeat /> Repeat last order
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Lines */}
                    <div className="min-h-[100px] flex-1 overflow-y-auto border-t border-stone-100 px-5 py-2">
                        {cart.length === 0 && (
                            <p className="py-10 text-center text-sm text-stone-400">Tap dishes to add them</p>
                        )}
                        {cart.map((line) => (
                            <div key={line.item._id} className="flex items-center gap-3 border-b border-stone-100 py-3 last:border-0">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[15px] font-semibold">{line.item.name}</p>
                                    <p className="text-xs tabular-nums text-stone-400">{formatINR(line.item.price)}</p>
                                </div>
                                <div className="flex items-center rounded-full bg-stone-100 p-1">
                                    <button onClick={() => changeQuantity(line.item._id, -1)} className="rounded-full p-1.5 text-stone-600 hover:bg-white" aria-label="Decrease">
                                        <FiMinus />
                                    </button>
                                    <span className="w-7 text-center text-sm font-bold tabular-nums">{line.quantity}</span>
                                    <button onClick={() => changeQuantity(line.item._id, 1)} className="rounded-full p-1.5 text-stone-600 hover:bg-white" aria-label="Increase">
                                        <FiPlus />
                                    </button>
                                </div>
                                <span className="w-20 text-right text-[15px] font-bold tabular-nums">{formatINR(line.item.price * line.quantity)}</span>
                            </div>
                        ))}
                    </div>

                    {/* Payment */}
                    <div className="space-y-3 border-t border-stone-100 bg-stone-50/60 px-5 pb-5 pt-4">
                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Total</p>
                                {gstIncluded && totals && cart.length > 0 && (
                                    <p className="text-xs text-stone-400">Includes {formatINR(totals.cgst + totals.sgst)} GST</p>
                                )}
                                {gstAdded && totals && cart.length > 0 && (
                                    <p className="text-xs text-stone-400">
                                        {formatINR(totals.taxableAmount)} + {formatINR(totals.cgst + totals.sgst)} GST
                                    </p>
                                )}
                            </div>
                            <p className="text-3xl font-extrabold tracking-tight tabular-nums">{formatINR(total)}</p>
                        </div>

                        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-stone-200/60 p-1">
                            {PAYMENT_MODES.map((mode) => (
                                <button
                                    key={mode.id}
                                    onClick={() => setPaymentMode(mode.id)}
                                    className={`rounded-xl py-2.5 text-sm font-bold transition ${
                                        paymentMode === mode.id ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'
                                    }`}
                                >
                                    {mode.label}
                                </button>
                            ))}
                        </div>

                        {paymentMode === 'cash' && cart.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex flex-wrap gap-1.5">
                                    {quickCashAmounts(total).map((amount) => (
                                        <button
                                            key={amount}
                                            onClick={() => setCashReceived(String(amount))}
                                            className={`rounded-full px-3 py-1.5 text-sm font-semibold tabular-nums ring-1 transition ${
                                                cashValue === amount ? 'bg-orange-50 text-orange-700 ring-orange-300' : 'bg-white text-stone-600 ring-stone-200'
                                            }`}
                                        >
                                            ₹{amount}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex items-center gap-3">
                                    <input
                                        value={cashReceived}
                                        onChange={(e) => setCashReceived(e.target.value.replace(/[^\d.]/g, ''))}
                                        placeholder={`Cash received (₹${total})`}
                                        inputMode="decimal"
                                        className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                                    />
                                    <span className={`whitespace-nowrap text-sm font-bold tabular-nums ${change < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                                        Change {formatINR(Math.max(change, 0))}
                                    </span>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleConfirm}
                            disabled={cart.length === 0 || submitting}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 py-4 text-lg font-bold text-white shadow-lg shadow-orange-500/25 transition hover:brightness-105 active:scale-[0.99] disabled:opacity-40 disabled:shadow-none"
                        >
                            {submitting ? 'Saving…' : <>Confirm order · <span className="tabular-nums">{formatINR(total)}</span></>}
                        </button>
                        <p className="flex items-center justify-center gap-1.5 text-xs text-stone-400">
                            {hasPhone ? <><FiMessageCircle /> Bill on WhatsApp · token slips print automatically</> : <><FiPrinter /> Bill and token slips print automatically</>}
                        </p>
                    </div>
                </aside>
            </div>

            {/* ---------- UPI ---------- */}
            {upiDialog && (
                <div className="fixed inset-0 z-[60] flex items-end justify-center bg-stone-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
                    <div className="w-full max-w-sm rounded-t-3xl bg-white p-6 text-center shadow-2xl sm:rounded-3xl">
                        <div className="mb-1 flex items-center justify-between">
                            <h3 className="text-base font-bold">Scan & pay with any UPI app</h3>
                            <button onClick={() => setUpiDialog(false)} className="rounded-full p-1.5 text-stone-500 hover:bg-stone-100" aria-label="Close">
                                <FiX />
                            </button>
                        </div>
                        <p className="mb-4 text-4xl font-extrabold tracking-tight tabular-nums">{formatINR(total)}</p>
                        {upiConfigured ? (
                            <div className="mb-4 flex flex-col items-center">
                                <div className="rounded-2xl border border-stone-200 p-3">
                                    <QRCodeSVG
                                        value={buildUpiLink({ vpa: settings.upiVpa, payeeName: settings.upiPayeeName, amount: total, note: `${settings.name} bill` })}
                                        size={208}
                                        level="M"
                                    />
                                </div>
                                <p className="mt-2 text-sm text-stone-500">{settings.upiVpa}</p>
                            </div>
                        ) : (
                            <p className="mb-4 text-sm text-stone-500">Ask the customer to scan the hotel&apos;s UPI QR.</p>
                        )}
                        <input
                            value={upiReference}
                            onChange={(e) => setUpiReference(e.target.value)}
                            placeholder="UPI ref / last 4 digits (optional)"
                            maxLength={64}
                            className="mb-3 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:bg-white"
                        />
                        <button
                            onClick={submitBill}
                            disabled={submitting}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-base font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                            <FiCheck /> {submitting ? 'Saving…' : 'Payment received'}
                        </button>
                        <p className="mt-2 text-xs text-stone-400">Confirm only after the soundbox announces the payment.</p>
                    </div>
                </div>
            )}

            {/* ---------- Token created ---------- */}
            {result && (
                <div className="fixed inset-0 z-[60] flex items-end justify-center bg-stone-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={closeResult}>
                    <div className="w-full max-w-sm rounded-t-3xl bg-white p-7 text-center shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
                        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">
                            <FiCheck />
                        </span>
                        <p className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-stone-400">Token</p>
                        <p className="text-7xl font-extrabold tracking-tight tabular-nums">{result.bill.tokenNumber}</p>
                        <p className="mt-1 text-xs text-stone-400">{result.bill.billNumber}</p>
                        <p className="mt-3 text-xl font-bold tabular-nums">
                            {formatINR(result.bill.total)} <span className="text-sm font-semibold text-stone-400">· {result.bill.payment.mode.toUpperCase()}</span>
                        </p>

                        {result.bill.payment.mode === 'cash' && result.bill.payment.changeReturned > 0 && (
                            <p className="mt-3 rounded-2xl bg-emerald-50 py-3 text-lg font-bold text-emerald-700">
                                Return {formatINR(result.bill.payment.changeReturned)}
                            </p>
                        )}

                        {result.whatsapp && (
                            <div className="mt-3">
                                {result.whatsapp.status === 'sent' && (
                                    <p className="text-sm font-semibold text-emerald-700">✓ Bill sent on WhatsApp</p>
                                )}
                                {result.whatsapp.status === 'failed' && (
                                    <p className="mb-2 text-xs text-rose-600">WhatsApp failed: {result.whatsapp.error}</p>
                                )}
                                {result.whatsapp.status !== 'sent' && result.whatsapp.link && (
                                    <a
                                        href={result.whatsapp.link}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] py-3 font-bold text-white hover:brightness-95"
                                    >
                                        <FiMessageCircle /> Send bill on WhatsApp
                                    </a>
                                )}
                            </div>
                        )}

                        <button
                            onClick={closeResult}
                            className="relative mt-4 w-full overflow-hidden rounded-2xl bg-stone-900 py-3.5 font-bold text-white hover:bg-stone-800"
                        >
                            {autoClose && <span className="pos-countdown absolute inset-x-0 bottom-0 h-1 bg-orange-500" style={{ animationDuration: `${AUTO_CLOSE_MS}ms` }} />}
                            Next order <span className="text-stone-400">↵</span>
                        </button>
                        <button
                            onClick={() => setPrintJob({ bill: result.bill, coupons: settings.printCounterCoupons !== false, includeReceipt: true })}
                            className="mt-2 text-xs font-semibold text-stone-400 hover:text-stone-700"
                        >
                            Printer jammed? Print again
                        </button>
                    </div>
                </div>
            )}

            <PrintArea job={printJob} settings={settings} onDone={handlePrintDone} />
        </div>
    );
}
