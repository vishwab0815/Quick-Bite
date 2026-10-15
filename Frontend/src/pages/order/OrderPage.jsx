import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PiArrowLeft, PiMinusBold, PiPlusBold, PiShieldCheckDuotone, PiShoppingBagOpenDuotone, PiX } from 'react-icons/pi';
import { RESTAURANT, publicPaths } from '../../site/restaurant';
import { dishPhoto } from '../../utils/foodPhotos';
import { formatPrice, isValidIndianMobile, posApi } from '../../utils/pos';

const CART_KEY = 'naivedya-cart';
const CHECKOUT_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

const readCart = () => {
    try {
        return JSON.parse(localStorage.getItem(CART_KEY) || '{}') || {};
    } catch {
        return {};
    }
};

const writeCart = (cart) => {
    try {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
        // Private mode / storage blocked: the cart simply isn't remembered
    }
};

/** Razorpay's Checkout script, loaded once on first payment */
const loadCheckout = () => new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(window.Razorpay);
    const existing = document.querySelector(`script[src="${CHECKOUT_SCRIPT}"]`);
    const script = existing || document.createElement('script');
    script.addEventListener('load', () => resolve(window.Razorpay));
    script.addEventListener('error', () => reject(new Error('Could not load the payment window. Check your internet connection.')));
    if (!existing) {
        script.src = CHECKOUT_SCRIPT;
        script.async = true;
        document.body.appendChild(script);
    }
});

const VegMark = ({ isVeg }) => (
    <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border-[1.5px] bg-white ${isVeg === false ? 'border-red-700' : 'border-green-700'}`} aria-label={isVeg === false ? 'Non-veg' : 'Veg'}>
        <span className={`h-1.5 w-1.5 rounded-full ${isVeg === false ? 'bg-red-700' : 'bg-green-700'}`} />
    </span>
);

VegMark.propTypes = { isVeg: PropTypes.bool };

/**
 * Order & pay online - from the website, a table QR, or a self-order kiosk (?kiosk=1).
 * The total shown here is a preview; the server prices the order from the menu.
 */
export default function OrderPage() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const kiosk = params.get('kiosk') === '1';
    const [info, setInfo] = useState(null);
    const [cart, setCart] = useState(() => (kiosk ? {} : readCart()));
    const [category, setCategory] = useState('All');
    const [sheet, setSheet] = useState(false);
    const [customer, setCustomer] = useState({ name: '', phone: '' });
    const [paying, setPaying] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        document.title = `Order online · ${RESTAURANT.name}`;
        if (!publicPaths) {
            setInfo({ closed: true });
            return;
        }
        posApi.get(publicPaths.info).then((res) => setInfo(res.data)).catch(() => setInfo({ failed: true }));
    }, []);

    useEffect(() => {
        if (!kiosk) writeCart(cart);
    }, [cart, kiosk]);

    const menu = useMemo(() => info?.menu || [], [info]);
    const categories = useMemo(() => ['All', ...new Set(menu.map((item) => item.category || 'Menu'))], [menu]);
    const visible = category === 'All' ? menu : menu.filter((item) => (item.category || 'Menu') === category);
    const lines = menu.filter((item) => cart[item._id] > 0).map((item) => ({ ...item, quantity: cart[item._id] }));
    const count = lines.reduce((sum, line) => sum + line.quantity, 0);
    const total = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
    const restaurant = info?.restaurant;
    const open = Boolean(restaurant?.onlineOrdering);

    const change = (id, delta) => setCart((current) => {
        const next = { ...current, [id]: Math.max(0, Math.min(20, (current[id] || 0) + delta)) };
        if (!next[id]) delete next[id];
        return next;
    });

    const pay = async (event) => {
        event.preventDefault();
        setError('');
        if (customer.name.trim().length < 2) return setError('Please enter your name');
        if (!isValidIndianMobile(customer.phone)) return setError('Enter a valid 10-digit mobile number - your token comes on WhatsApp');
        setPaying(true);
        try {
            const [Razorpay, res] = await Promise.all([
                loadCheckout(),
                posApi.post(`/public/${encodeURIComponent(restaurant.slug)}/orders`, {
                    items: lines.map((line) => ({ itemId: line._id, quantity: line.quantity })),
                    customer,
                    source: kiosk ? 'kiosk' : 'qr',
                }),
            ]);
            const { order, checkout } = res.data;
            const statusPath = `/order/${order.publicId}${kiosk ? '?kiosk=1' : ''}`;
            const razorpay = new Razorpay({
                key: checkout.key,
                order_id: checkout.orderId,
                amount: checkout.amount,
                currency: checkout.currency,
                name: checkout.name,
                description: checkout.description,
                prefill: checkout.prefill,
                theme: { color: '#e6a83c' },
                // UPI and cards only
                method: { upi: true, card: true, netbanking: false, wallet: false, emi: false, paylater: false },
                handler: async (response) => {
                    setCart({});
                    try {
                        await posApi.post(`/public/orders/${order.publicId}/verify`, response);
                    } catch {
                        // The webhook confirms it anyway - the status page keeps checking
                    }
                    navigate(statusPath);
                },
                modal: {
                    ondismiss: () => setPaying(false),
                },
            });
            razorpay.on('payment.failed', (failure) => setError(failure?.error?.description || 'The payment failed. Please try again.'));
            razorpay.open();
        } catch (err) {
            setPaying(false);
            setError(err.response?.data?.message || err.message || 'Could not start the payment. Please try again.');
        }
    };

    if (!info) {
        return <div className="qb-site flex min-h-[100dvh] items-center justify-center bg-ink"><span className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" /></div>;
    }

    if (!open) {
        return (
            <div className="qb-site relative flex min-h-[100dvh] flex-col justify-end overflow-hidden bg-ink px-5 pb-14 text-paper sm:px-10">
                <img src="/site/kaapi.webp" alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-transparent" />
                <div className="relative">
                    <p className="font-kn text-xl text-gold">{RESTAURANT.wordKn}</p>
                    <h1 className="mt-2 font-accent text-[clamp(3rem,10vw,7rem)] leading-[0.9]">Online orders <em className="text-gold">open soon.</em></h1>
                    <p className="mt-4 max-w-md text-paper/70">Until then, come in - we&apos;re at {RESTAURANT.area}, {RESTAURANT.city}.</p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <a href={RESTAURANT.mapsUrl} target="_blank" rel="noreferrer" className="site-button bg-gold text-ink">Directions</a>
                        <Link to="/" className="site-button border border-paper/25">Back to {RESTAURANT.word}</Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="qb-site min-h-[100dvh] bg-paper pb-32 text-ink">
            {/* Header over a strip of the feast */}
            <header className="relative overflow-hidden bg-ink text-paper">
                <img src="/site/feast-d.webp" alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-ink/30" />
                <div className="relative mx-auto max-w-6xl px-5 pb-8 pt-6 sm:px-10 sm:pb-12">
                    {kiosk ? (
                        <p className="font-accent text-2xl">{RESTAURANT.word}</p>
                    ) : (
                        <Link to="/" className="inline-flex items-center gap-2 text-sm text-paper/80 hover:text-paper"><PiArrowLeft /> {RESTAURANT.word}</Link>
                    )}
                    <h1 className="mt-10 font-accent text-[clamp(3rem,9vw,6.5rem)] leading-[0.88]">Order <em className="text-gold">online.</em></h1>
                    <p className="mt-3 text-sm text-paper/70">Pick your dishes, pay by UPI or card, and collect with your token.</p>
                </div>
            </header>

            {/* Categories */}
            <nav className="sticky top-0 z-20 border-b border-ink/10 bg-paper/90 backdrop-blur-lg" aria-label="Categories">
                <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-5 py-3 [scrollbar-width:none] sm:px-10">
                    {categories.map((name) => (
                        <button
                            key={name}
                            type="button"
                            onClick={() => setCategory(name)}
                            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${category === name ? 'bg-ink text-paper' : 'bg-white text-ink/70 ring-1 ring-ink/10 hover:text-ink'}`}
                            aria-pressed={category === name}
                        >
                            {name}
                        </button>
                    ))}
                </div>
            </nav>

            {/* Dishes */}
            <main className="mx-auto grid max-w-6xl gap-4 px-5 py-6 sm:grid-cols-2 sm:px-10 lg:grid-cols-3">
                {visible.map((item) => {
                    const quantity = cart[item._id] || 0;
                    const photo = dishPhoto(item);
                    return (
                        <article key={item._id} className={`flex gap-4 rounded-2xl bg-white p-3 ring-1 transition-shadow ${quantity ? 'ring-gold shadow-[0_10px_30px_-18px_rgba(15,14,12,0.6)]' : 'ring-ink/5'}`}>
                            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-paper-deep">
                                {photo && <img src={photo} alt="" loading="lazy" className="h-full w-full object-cover" />}
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col justify-between">
                                <div>
                                    <p className="flex items-center gap-2"><VegMark isVeg={item.isVeg} /><span className="truncate font-semibold">{item.name}</span></p>
                                    <p className="mt-1 font-code text-sm text-ink/60">{formatPrice(item.price)}</p>
                                </div>
                                <div className="flex justify-end">
                                    {quantity === 0 ? (
                                        <button type="button" onClick={() => change(item._id, 1)} className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-paper transition-transform active:scale-95" aria-label={`Add ${item.name}`}>
                                            Add
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-1 rounded-full bg-ink p-1 text-paper">
                                            <button type="button" onClick={() => change(item._id, -1)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10" aria-label={`One less ${item.name}`}><PiMinusBold /></button>
                                            <span className="w-6 text-center font-semibold tabular-nums" aria-live="polite">{quantity}</span>
                                            <button type="button" onClick={() => change(item._id, 1)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10" aria-label={`One more ${item.name}`}><PiPlusBold /></button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </article>
                    );
                })}
                {menu.length === 0 && <p className="py-16 text-center text-ink/50 sm:col-span-2 lg:col-span-3">The menu will appear here once the kitchen opens.</p>}
            </main>

            {/* Cart bar */}
            {count > 0 && !sheet && (
                <div className="fixed inset-x-0 bottom-0 z-30 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                    <button type="button" onClick={() => setSheet(true)} className="qb-pop mx-auto flex w-full max-w-xl items-center justify-between gap-4 rounded-full bg-ink py-3 pl-6 pr-3 text-paper shadow-[0_20px_50px_-15px_rgba(15,14,12,0.7)]">
                        <span className="flex items-center gap-3"><PiShoppingBagOpenDuotone className="text-xl text-gold" /> {count} item{count === 1 ? '' : 's'} · <b className="tabular-nums">{formatPrice(total)}</b></span>
                        <span className="rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-ink">View order</span>
                    </button>
                </div>
            )}

            {/* Checkout sheet */}
            {sheet && (
                <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/60 backdrop-blur-sm sm:items-center" onClick={() => !paying && setSheet(false)} role="presentation">
                    <form onSubmit={pay} onClick={(event) => event.stopPropagation()} className="qb-sheet max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-paper p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:rounded-[28px]" role="dialog" aria-modal="true" aria-labelledby="order-title">
                        <div className="flex items-center justify-between">
                            <h2 id="order-title" className="font-accent text-4xl">Your order</h2>
                            <button type="button" onClick={() => setSheet(false)} disabled={paying} className="flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-ink/15" aria-label="Close"><PiX /></button>
                        </div>
                        <ul className="mt-5 divide-y divide-ink/10">
                            {lines.map((line) => (
                                <li key={line._id} className="flex items-center gap-3 py-3">
                                    <span className="min-w-0 flex-1 truncate font-medium">{line.name}</span>
                                    <div className="flex items-center gap-1 rounded-full ring-1 ring-ink/15">
                                        <button type="button" onClick={() => change(line._id, -1)} className="flex h-8 w-8 items-center justify-center" aria-label={`One less ${line.name}`}><PiMinusBold /></button>
                                        <span className="w-5 text-center text-sm font-semibold tabular-nums">{line.quantity}</span>
                                        <button type="button" onClick={() => change(line._id, 1)} className="flex h-8 w-8 items-center justify-center" aria-label={`One more ${line.name}`}><PiPlusBold /></button>
                                    </div>
                                    <span className="w-16 text-right font-code text-sm tabular-nums">{formatPrice(line.price * line.quantity)}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="mt-2 flex items-baseline justify-between border-t border-ink/15 pt-4">
                            <span className="text-sm text-ink/60">{restaurant?.pricesIncludeGst ? 'Total · taxes included' : 'Total before GST'}</span>
                            <span className="font-accent text-4xl tabular-nums">{formatPrice(total)}</span>
                        </p>

                        <div className="mt-6 grid gap-3">
                            <label className="block">
                                <span className="mb-1.5 block text-sm font-semibold">Your name</span>
                                <input value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} autoComplete="name" maxLength={60} className="w-full rounded-2xl border border-ink/15 bg-white px-4 py-3.5 outline-none focus:border-ink focus:ring-4 focus:ring-ink/5" />
                            </label>
                            <label className="block">
                                <span className="mb-1.5 block text-sm font-semibold">Mobile number</span>
                                <span className="flex rounded-2xl border border-ink/15 bg-white focus-within:border-ink focus-within:ring-4 focus-within:ring-ink/5">
                                    <span className="flex items-center pl-4 text-ink/50">+91</span>
                                    <input value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} inputMode="numeric" autoComplete="tel-national" maxLength={14} className="w-full rounded-2xl bg-transparent px-3 py-3.5 outline-none" />
                                </span>
                                <span className="mt-1.5 block text-xs text-ink/50">Your token and bill come on WhatsApp.</span>
                            </label>
                        </div>

                        {error && <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200">{error}</p>}

                        <button type="submit" disabled={paying || count === 0} className="mt-6 w-full rounded-full bg-ink py-4 font-semibold text-paper transition-transform active:scale-[0.99] disabled:opacity-60">
                            {paying ? 'Opening payment…' : `Pay ${formatPrice(total)}${restaurant?.pricesIncludeGst ? '' : ' + GST'}`}
                        </button>
                        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink/50"><PiShieldCheckDuotone className="text-base text-leaf" /> UPI or card · secured by Razorpay</p>
                    </form>
                </div>
            )}
        </div>
    );
}
