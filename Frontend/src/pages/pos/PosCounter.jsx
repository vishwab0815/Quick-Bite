import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
    FiSearch, FiMinus, FiPlus, FiTrash2, FiPrinter, FiMessageCircle, FiTag,
    FiCheckCircle, FiX, FiSlash, FiExternalLink,
} from 'react-icons/fi';
import PosHeader from '../../components/pos/PosHeader';
import PrintArea from '../../components/pos/PrintArea';
import VegDot from '../../components/pos/VegDot';
import { showToast } from '../../utils/toast';
import {
    posApi, formatINR, computeTotals, buildUpiLink, isValidIndianMobile,
    loadPref, savePref, useStaffUser, usePosSettings,
} from '../../utils/pos';

const PAYMENT_MODES = [
    { id: 'cash', label: 'Cash' },
    { id: 'upi', label: 'UPI' },
    { id: 'card', label: 'Card' },
];

const DEFAULT_OPTIONS = { print: true, coupons: true, whatsapp: false };

const quickCashAmounts = (total) => {
    const amounts = new Set([total]);
    [50, 100, 200, 500, 2000].forEach((note) => {
        amounts.add(Math.ceil(total / note) * note);
    });
    return [...amounts].filter((amount) => amount >= total).sort((a, b) => a - b).slice(0, 5);
};

export default function PosCounter() {
    const user = useStaffUser();
    const settings = usePosSettings(Boolean(user));

    const [menu, setMenu] = useState([]);
    const [search, setSearch] = useState('');
    const [activeCounter, setActiveCounter] = useState('All');
    const [editAvailability, setEditAvailability] = useState(false);

    const [cart, setCart] = useState([]);
    const [customer, setCustomer] = useState({ name: '', phone: '' });
    const [paymentMode, setPaymentMode] = useState('cash');
    const [cashReceived, setCashReceived] = useState('');
    const [options, setOptions] = useState(() => ({ ...DEFAULT_OPTIONS, ...loadPref('qb_pos_options', {}) }));

    const [submitting, setSubmitting] = useState(false);
    const [upiDialog, setUpiDialog] = useState(false);
    const [upiReference, setUpiReference] = useState('');
    const [result, setResult] = useState(null);
    const [printJob, setPrintJob] = useState(null);

    const searchRef = useRef(null);

    const loadMenu = useCallback(async () => {
        try {
            const res = await posApi.get('/menu');
            setMenu(res.data.items);
        } catch {
            showToast.error('Failed to load menu');
        }
    }, []);

    useEffect(() => {
        if (user) loadMenu();
    }, [user, loadMenu]);

    useEffect(() => {
        savePref('qb_pos_options', options);
    }, [options]);

    const counters = useMemo(
        () => ['All', ...new Set(menu.map((item) => item.counter || 'Main Kitchen'))],
        [menu]
    );

    const visibleMenu = useMemo(() => {
        const term = search.trim().toLowerCase();
        return menu.filter((item) =>
            (activeCounter === 'All' || item.counter === activeCounter) &&
            (!term || item.name.toLowerCase().includes(term))
        );
    }, [menu, search, activeCounter]);

    const totals = useMemo(() => {
        if (!settings) return null;
        return computeTotals(
            cart.map((line) => ({ price: line.item.price, quantity: line.quantity })),
            settings
        );
    }, [cart, settings]);

    const total = totals?.total || 0;
    const cashValue = cashReceived === '' ? total : Number(cashReceived);
    const change = paymentMode === 'cash' ? cashValue - total : 0;

    // Cart actions
    const addItem = (item) => {
        setCart((prev) => {
            const existing = prev.find((line) => line.item._id === item._id);
            if (existing) {
                return prev.map((line) =>
                    line.item._id === item._id ? { ...line, quantity: Math.min(line.quantity + 1, 99) } : line
                );
            }
            return [...prev, { item, quantity: 1 }];
        });
    };

    const changeQuantity = (itemId, delta) => {
        setCart((prev) => prev
            .map((line) => (line.item._id === itemId ? { ...line, quantity: Math.min(line.quantity + delta, 99) } : line))
            .filter((line) => line.quantity > 0));
    };

    const resetOrder = () => {
        setCart([]);
        setCustomer({ name: '', phone: '' });
        setCashReceived('');
        setUpiReference('');
        setPaymentMode('cash');
    };

    const toggleAvailability = async (item) => {
        try {
            const res = await posApi.patch(`/menu/${item._id}/availability`, { isAvailable: item.isAvailable === false });
            setMenu((prev) => prev.map((menuItem) => (menuItem._id === item._id ? res.data.item : menuItem)));
            if (res.data.item.isAvailable === false) {
                setCart((prev) => prev.filter((line) => line.item._id !== item._id));
            }
            showToast.info(`${item.name} marked ${res.data.item.isAvailable ? 'available' : 'sold out'}`);
        } catch (error) {
            showToast.error(error.response?.data?.message || 'Failed to update item');
        }
    };

    const handleTileClick = (item) => {
        if (editAvailability) {
            toggleAvailability(item);
        } else if (item.isAvailable === false) {
            showToast.warning(`${item.name} is sold out`);
        } else {
            addItem(item);
        }
    };

    // Billing
    const validate = () => {
        if (cart.length === 0) {
            showToast.error('Add items to the bill');
            return false;
        }
        if (customer.phone && !isValidIndianMobile(customer.phone)) {
            showToast.error('Enter a valid 10-digit mobile number');
            return false;
        }
        if (options.whatsapp && !customer.phone) {
            showToast.error('Enter the customer mobile number for the WhatsApp receipt');
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
                customer: { name: customer.name || undefined, phone: customer.phone || undefined },
                sendWhatsapp: Boolean(options.whatsapp && customer.phone),
            });

            const { bill, whatsapp } = res.data;
            setResult({ bill, whatsapp });
            setUpiDialog(false);
            resetOrder();

            if (options.print) {
                setPrintJob({ bill, coupons: options.coupons });
                posApi.post(`/bills/${bill._id}/printed`).catch(() => {});
            }
        } catch (error) {
            showToast.error(error.response?.data?.message || 'Failed to create bill');
            // Prices / availability may have changed
            loadMenu();
        } finally {
            setSubmitting(false);
        }
    };

    const handleCharge = () => {
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

    if (!user || !settings) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-100">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
            </div>
        );
    }

    const upiConfigured = Boolean(settings.upiVpa);

    return (
        <div className="flex h-screen flex-col bg-gray-100 text-gray-900 [color-scheme:light]">
            <PosHeader user={user} hotelName={settings.name} />

            <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
                {/* Menu */}
                <section className="flex min-h-0 flex-1 flex-col p-3">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                        <div className="relative min-w-[200px] flex-1">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                ref={searchRef}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search menu..."
                                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 outline-none focus:border-orange-500"
                                autoFocus
                            />
                        </div>
                        <button
                            onClick={() => setEditAvailability((value) => !value)}
                            className={`flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold ${
                                editAvailability ? 'bg-red-500 text-white' : 'bg-white text-gray-700 border border-gray-200'
                            }`}
                        >
                            <FiSlash /> {editAvailability ? 'Done' : 'Sold out'}
                        </button>
                    </div>

                    {editAvailability && (
                        <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                            Tap an item to mark it sold out / available. Tap Done when finished.
                        </p>
                    )}

                    <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                        {counters.map((counter) => (
                            <button
                                key={counter}
                                onClick={() => setActiveCounter(counter)}
                                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${
                                    activeCounter === counter
                                        ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white'
                                        : 'bg-white text-gray-700 border border-gray-200'
                                }`}
                            >
                                {counter}
                            </button>
                        ))}
                    </div>

                    <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 xl:grid-cols-4">
                        {visibleMenu.map((item) => {
                            const soldOut = item.isAvailable === false;
                            const inCart = cart.find((line) => line.item._id === item._id);
                            return (
                                <button
                                    key={item._id}
                                    onClick={() => handleTileClick(item)}
                                    className={`relative flex min-h-[84px] flex-col justify-between rounded-xl border p-3 text-left transition active:scale-95 ${
                                        soldOut
                                            ? 'border-gray-200 bg-gray-100 text-gray-400'
                                            : 'border-gray-200 bg-white hover:border-orange-400 hover:shadow-md'
                                    } ${editAvailability ? 'ring-2 ring-red-200' : ''}`}
                                >
                                    <span className="flex items-start gap-1.5 text-sm font-semibold leading-tight">
                                        <span className="mt-0.5"><VegDot isVeg={item.isVeg !== false} /></span>
                                        {item.name}
                                    </span>
                                    <span className="mt-2 flex items-center justify-between">
                                        <span className={`font-bold ${soldOut ? '' : 'text-orange-600'}`}>{formatINR(item.price)}</span>
                                        {soldOut && <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-bold text-red-600">SOLD OUT</span>}
                                    </span>
                                    {inCart && (
                                        <span className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-pink-500 px-1.5 text-xs font-bold text-white">
                                            {inCart.quantity}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                        {visibleMenu.length === 0 && (
                            <p className="col-span-full py-10 text-center text-gray-500">No items found</p>
                        )}
                    </div>
                </section>

                {/* Bill */}
                <aside className="flex min-h-0 w-full flex-col border-t border-gray-200 bg-white lg:w-[400px] lg:border-l lg:border-t-0">
                    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                        <h2 className="text-lg font-bold text-gray-800">Current Bill</h2>
                        {cart.length > 0 && (
                            <button onClick={resetOrder} className="flex items-center gap-1 text-sm font-semibold text-red-500">
                                <FiTrash2 /> Clear
                            </button>
                        )}
                    </div>

                    <div className="min-h-[120px] flex-1 overflow-y-auto px-4 py-2">
                        {cart.length === 0 && (
                            <p className="py-8 text-center text-gray-400">Tap items to add them to the bill</p>
                        )}
                        {cart.map((line) => (
                            <div key={line.item._id} className="flex items-center gap-2 border-b border-gray-50 py-2">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-gray-800">{line.item.name}</p>
                                    <p className="text-xs text-gray-500">{formatINR(line.item.price)} each</p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => changeQuantity(line.item._id, -1)} className="rounded-lg bg-gray-100 p-2 hover:bg-gray-200" aria-label="Decrease">
                                        <FiMinus />
                                    </button>
                                    <span className="w-7 text-center font-bold">{line.quantity}</span>
                                    <button onClick={() => changeQuantity(line.item._id, 1)} className="rounded-lg bg-gray-100 p-2 hover:bg-gray-200" aria-label="Increase">
                                        <FiPlus />
                                    </button>
                                </div>
                                <span className="w-20 text-right text-sm font-bold">{formatINR(line.item.price * line.quantity)}</span>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-3 border-t border-gray-100 px-4 py-3">
                        {/* Totals */}
                        {totals && cart.length > 0 && (
                            <div className="space-y-0.5 text-sm text-gray-600">
                                {settings.gstScheme === 'regular' ? (
                                    <>
                                        <div className="flex justify-between"><span>Taxable value</span><span>{formatINR(totals.taxableAmount)}</span></div>
                                        <div className="flex justify-between"><span>CGST {settings.gstRate / 2}% + SGST {settings.gstRate / 2}%</span><span>{formatINR(totals.cgst + totals.sgst)}</span></div>
                                    </>
                                ) : (
                                    <div className="flex justify-between"><span>Subtotal</span><span>{formatINR(totals.subtotal)}</span></div>
                                )}
                                {totals.roundOff !== 0 && (
                                    <div className="flex justify-between"><span>Round off</span><span>{formatINR(totals.roundOff)}</span></div>
                                )}
                            </div>
                        )}

                        {/* Customer */}
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                value={customer.phone}
                                onChange={(e) => setCustomer({ ...customer, phone: e.target.value.replace(/[^\d+ ]/g, '') })}
                                placeholder="Mobile (WhatsApp)"
                                inputMode="tel"
                                maxLength={15}
                                className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-500"
                            />
                            <input
                                value={customer.name}
                                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                                placeholder="Name (optional)"
                                maxLength={60}
                                className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-500"
                            />
                        </div>

                        {/* Payment */}
                        <div className="grid grid-cols-3 gap-2">
                            {PAYMENT_MODES.map((mode) => (
                                <button
                                    key={mode.id}
                                    onClick={() => setPaymentMode(mode.id)}
                                    className={`rounded-lg py-2 text-sm font-bold ${
                                        paymentMode === mode.id
                                            ? 'bg-gray-900 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                                            className={`rounded-lg border px-2.5 py-1.5 text-sm font-semibold ${
                                                cashValue === amount ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200'
                                            }`}
                                        >
                                            ₹{amount}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        value={cashReceived}
                                        onChange={(e) => setCashReceived(e.target.value.replace(/[^\d.]/g, ''))}
                                        placeholder={`Cash received (₹${total})`}
                                        inputMode="decimal"
                                        className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-500"
                                    />
                                    <span className={`text-sm font-bold ${change < 0 ? 'text-red-600' : 'text-green-700'}`}>
                                        Change {formatINR(Math.max(change, 0))}
                                    </span>
                                </div>
                            </div>
                        )}

                        {paymentMode === 'upi' && !upiConfigured && (
                            <p className="rounded-lg bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
                                UPI ID not set (UPI_VPA). Use the hotel&apos;s printed QR and confirm the payment on the soundbox.
                            </p>
                        )}

                        {/* Receipt options */}
                        <div className="flex flex-wrap gap-1.5">
                            {[
                                { key: 'print', label: 'Print bill', icon: FiPrinter },
                                { key: 'coupons', label: 'Counter coupons', icon: FiTag, disabled: !options.print },
                                { key: 'whatsapp', label: 'WhatsApp', icon: FiMessageCircle },
                            ].map((option) => {
                                const Icon = option.icon;
                                const { key, disabled } = option;
                                return (
                                    <button
                                        key={key}
                                        disabled={disabled}
                                        onClick={() => setOptions((prev) => ({ ...prev, [key]: !prev[key] }))}
                                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold disabled:opacity-40 ${
                                            options[key] && !disabled
                                                ? key === 'whatsapp'
                                                    ? 'border-green-500 bg-green-50 text-green-700'
                                                    : 'border-orange-500 bg-orange-50 text-orange-700'
                                                : 'border-gray-200 text-gray-500'
                                        }`}
                                    >
                                        <Icon /> {option.label}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={handleCharge}
                            disabled={cart.length === 0 || submitting}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 py-4 text-lg font-black text-white shadow-lg disabled:opacity-50"
                        >
                            {submitting ? 'Creating bill...' : `Charge ${formatINR(total)}`}
                        </button>
                    </div>
                </aside>
            </div>

            {/* UPI payment dialog */}
            {upiDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
                        <div className="mb-2 flex items-center justify-between">
                            <h3 className="text-lg font-bold">Scan & pay with any UPI app</h3>
                            <button onClick={() => setUpiDialog(false)} className="rounded-lg p-1 hover:bg-gray-100" aria-label="Close">
                                <FiX />
                            </button>
                        </div>
                        <p className="mb-4 text-4xl font-black text-gray-900">{formatINR(total)}</p>
                        {upiConfigured ? (
                            <div className="mb-3 flex flex-col items-center">
                                <QRCodeSVG
                                    value={buildUpiLink({
                                        vpa: settings.upiVpa,
                                        payeeName: settings.upiPayeeName,
                                        amount: total,
                                        note: `${settings.name} bill`,
                                    })}
                                    size={220}
                                    level="M"
                                />
                                <p className="mt-2 text-sm text-gray-500">{settings.upiVpa}</p>
                            </div>
                        ) : (
                            <p className="mb-3 text-sm text-gray-500">Ask the customer to scan the hotel&apos;s UPI QR.</p>
                        )}
                        <input
                            value={upiReference}
                            onChange={(e) => setUpiReference(e.target.value)}
                            placeholder="UPI ref / last 4 digits (optional)"
                            maxLength={64}
                            className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-500"
                        />
                        <button
                            onClick={submitBill}
                            disabled={submitting}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-lg font-bold text-white hover:bg-green-700 disabled:opacity-50"
                        >
                            <FiCheckCircle /> {submitting ? 'Creating bill...' : 'Payment received'}
                        </button>
                        <p className="mt-2 text-xs text-gray-500">Confirm only after the soundbox / app shows the payment.</p>
                    </div>
                </div>
            )}

            {/* Token created */}
            {result && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
                        <FiCheckCircle className="mx-auto mb-2 text-4xl text-green-500" />
                        <p className="text-sm font-semibold uppercase tracking-widest text-gray-500">Token</p>
                        <p className="text-7xl font-black text-gray-900">#{result.bill.tokenNumber}</p>
                        <p className="mt-1 text-sm text-gray-500">{result.bill.billNumber}</p>
                        <p className="mt-3 text-2xl font-bold">{formatINR(result.bill.total)} · {result.bill.payment.mode.toUpperCase()}</p>
                        {result.bill.payment.mode === 'cash' && result.bill.payment.changeReturned > 0 && (
                            <p className="mt-2 rounded-lg bg-green-50 py-2 text-xl font-black text-green-700">
                                Return change: {formatINR(result.bill.payment.changeReturned)}
                            </p>
                        )}

                        {result.whatsapp && (
                            <div className="mt-3">
                                {result.whatsapp.status === 'sent' ? (
                                    <p className="text-sm font-semibold text-green-700">✓ Receipt sent on WhatsApp</p>
                                ) : (
                                    <>
                                        {result.whatsapp.status === 'failed' && (
                                            <p className="mb-1 text-xs text-red-600">Auto-send failed: {result.whatsapp.error}</p>
                                        )}
                                        {result.whatsapp.link && (
                                            <a
                                                href={result.whatsapp.link}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 font-bold text-white hover:bg-green-700"
                                            >
                                                <FiMessageCircle /> Send on WhatsApp <FiExternalLink />
                                            </a>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        <div className="mt-5 grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setPrintJob({ bill: result.bill, coupons: options.coupons })}
                                className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 font-semibold hover:bg-gray-50"
                            >
                                <FiPrinter /> Reprint
                            </button>
                            <button
                                onClick={closeResult}
                                className="rounded-xl bg-gray-900 py-3 font-bold text-white hover:bg-gray-800"
                            >
                                Next order ↵
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <PrintArea job={printJob} settings={settings} onDone={handlePrintDone} />
        </div>
    );
}
