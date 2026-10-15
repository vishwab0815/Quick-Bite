import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PiArrowLeft, PiCheckBold, PiMinusBold, PiPencilSimpleLine, PiPlusBold, PiShieldCheckDuotone, PiShoppingBagOpenDuotone, PiX } from 'react-icons/pi';
import { RESTAURANT, publicPaths } from '../../site/restaurant';
import { dishPhoto } from '../../utils/foodPhotos';
import { formatPrice, isValidIndianMobile, posApi } from '../../utils/pos';

const CART_KEY = 'naivedya-cart';
const CUSTOMER_KEY = 'naivedya-customer';
const CHECKOUT_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';
const MAX_EACH = 20;

const storage = {
    read: (key, fallback) => {
        try {
            return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback;
        } catch {
            return fallback;
        }
    },
    write: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch {
            // Private mode / storage blocked: simply not remembered
        }
    },
};

/** "9876543210" -> "98765 43210", as it is typed */
const formatMobile = (value) => {
    const digits = String(value || '').replace(/\D/g, '').replace(/^91(?=\d{10})/, '').slice(0, 10);
    return digits.length > 5 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits;
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

const Stepper = ({ name, quantity, onChange, size = 'md' }) => {
    const button = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
    if (quantity === 0) {
        return (
            <button type="button" onClick={() => onChange(1)} className={`rounded-full bg-ink px-5 font-semibold text-paper transition-transform active:scale-95 ${size === 'sm' ? 'h-8 text-sm' : 'h-10'}`} aria-label={`Add ${name}`}>
                Add
            </button>
        );
    }
    return (
        <div className={`flex items-center rounded-full bg-ink text-paper ${size === 'sm' ? '' : 'p-0.5'}`}>
            <button type="button" onClick={() => onChange(-1)} className={`flex items-center justify-center rounded-full hover:bg-white/10 ${button}`} aria-label={`One less ${name}`}><PiMinusBold /></button>
            <span className="w-7 text-center font-semibold tabular-nums" aria-live="polite">{quantity}</span>
            <button type="button" onClick={() => onChange(1)} className={`flex items-center justify-center rounded-full hover:bg-white/10 ${button}`} aria-label={`One more ${name}`}><PiPlusBold /></button>
        </div>
    );
};

Stepper.propTypes = { name: PropTypes.string.isRequired, quantity: PropTypes.number.isRequired, onChange: PropTypes.func.isRequired, size: PropTypes.oneOf(['sm', 'md']) };

const DishCard = ({ item, quantity, onChange }) => {
    const photo = dishPhoto(item);
    return (
        <article
            className={`flex cursor-pointer gap-4 rounded-2xl bg-white p-3 ring-1 transition-shadow ${quantity ? 'ring-gold shadow-[0_12px_30px_-18px_rgba(15,14,12,0.6)]' : 'ring-ink/5 hover:ring-ink/15'}`}
            onClick={() => quantity === 0 && onChange(1)}
        >
            <div className="h-[88px] w-[88px] shrink-0 overflow-hidden rounded-xl bg-paper-deep sm:h-24 sm:w-24">
                {photo && <img src={photo} alt="" loading="lazy" className="h-full w-full object-cover" />}
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                <div>
                    <p className="flex items-center gap-2 font-semibold leading-tight"><VegMark isVeg={item.isVeg} /><span className="truncate">{item.name}</span></p>
                    <p className="mt-1 font-code text-sm text-ink/60">{formatPrice(item.price)}</p>
                </div>
                <div className="flex justify-end" onClick={(event) => event.stopPropagation()} role="presentation">
                    <Stepper name={item.name} quantity={quantity} onChange={onChange} />
                </div>
            </div>
        </article>
    );
};

DishCard.propTypes = { item: PropTypes.object.isRequired, quantity: PropTypes.number.isRequired, onChange: PropTypes.func.isRequired };

/**
 * Who the order is for. Only the mobile number is needed (the token arrives on WhatsApp);
 * the name is optional. Both are remembered, so next time it is one tap to pay.
 */
const CustomerFields = ({ customer, onChange, remembered, editing, onEdit }) => {
    if (remembered && !editing) {
        return (
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-ink/10">
                <p className="min-w-0 text-sm">
                    <span className="block font-code text-[10px] uppercase tracking-[0.3em] text-ink/50">Token to</span>
                    <span className="mt-1 block truncate font-semibold">{customer.name ? `${customer.name} · ` : ''}+91 {formatMobile(customer.phone)}</span>
                </p>
                <button type="button" onClick={onEdit} className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-ink/70 ring-1 ring-ink/15 hover:text-ink"><PiPencilSimpleLine /> Change</button>
            </div>
        );
    }
    return (
        <div className="grid gap-5">
            <label className="site-field">
                <span className="site-field__label">Mobile number</span>
                <span className="site-field__box">
                    <span className="site-field__prefix">+91</span>
                    <input
                        value={formatMobile(customer.phone)}
                        onChange={(event) => onChange({ ...customer, phone: event.target.value.replace(/\D/g, '').slice(0, 10) })}
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        placeholder="98765 43210"
                        autoFocus={!customer.phone}
                    />
                </span>
                <span className="site-field__hint">We&apos;ll send your token and bill here on WhatsApp.</span>
            </label>
            <label className="site-field">
                <span className="site-field__label">Name <span className="normal-case tracking-normal text-ink/40">(optional)</span></span>
                <span className="site-field__box">
                    <input value={customer.name} onChange={(event) => onChange({ ...customer, name: event.target.value })} autoComplete="name" maxLength={60} placeholder="So we can call you by name" />
                </span>
            </label>
        </div>
    );
};

CustomerFields.propTypes = {
    customer: PropTypes.shape({ name: PropTypes.string, phone: PropTypes.string }).isRequired,
    onChange: PropTypes.func.isRequired,
    remembered: PropTypes.bool,
    editing: PropTypes.bool,
    onEdit: PropTypes.func,
};

/**
 * Order & pay online - from the website, a table QR, or a self-order kiosk (?kiosk=1).
 * The total shown here is a preview; the server prices the order from the menu.
 */
export default function OrderPage() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const kiosk = params.get('kiosk') === '1';
    const [info, setInfo] = useState(null);
    const [cart, setCart] = useState(() => (kiosk ? {} : storage.read(CART_KEY, {})));
    const [customer, setCustomer] = useState(() => (kiosk ? { name: '', phone: '' } : { name: '', phone: '', ...storage.read(CUSTOMER_KEY, {}) }));
    const [remembered] = useState(() => !kiosk && isValidIndianMobile(storage.read(CUSTOMER_KEY, {}).phone));
    const [editing, setEditing] = useState(false);
    const [sheet, setSheet] = useState(false);
    const [active, setActive] = useState('');
    const [paying, setPaying] = useState(false);
    const [error, setError] = useState('');
    const sectionRefs = useRef({});

    useEffect(() => {
        document.title = `Order online · ${RESTAURANT.name}`;
        if (!publicPaths) {
            setInfo({ closed: true });
            return;
        }
        posApi.get(publicPaths.info).then((res) => setInfo(res.data)).catch(() => setInfo({ failed: true }));
    }, []);

    useEffect(() => {
        if (!kiosk) storage.write(CART_KEY, cart);
    }, [cart, kiosk]);

    const menu = useMemo(() => info?.menu || [], [info]);
    const groups = useMemo(() => {
        const byCategory = new Map();
        for (const item of menu) {
            const key = item.category || 'Menu';
            if (!byCategory.has(key)) byCategory.set(key, []);
            byCategory.get(key).push(item);
        }
        return [...byCategory.entries()];
    }, [menu]);

    // The highlighted chip follows the category on screen
    useEffect(() => {
        const nodes = Object.values(sectionRefs.current).filter(Boolean);
        if (nodes.length === 0 || typeof IntersectionObserver === 'undefined') return undefined;
        const observer = new IntersectionObserver((entries) => {
            const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
            if (visible[0]) setActive(visible[0].target.dataset.category);
        }, { rootMargin: '-120px 0px -60% 0px' });
        nodes.forEach((node) => observer.observe(node));
        return () => observer.disconnect();
    }, [groups]);

    const lines = menu.filter((item) => cart[item._id] > 0).map((item) => ({ ...item, quantity: cart[item._id] }));
    const count = lines.reduce((sum, line) => sum + line.quantity, 0);
    const total = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
    const restaurant = info?.restaurant;
    const open = Boolean(restaurant?.onlineOrdering);
    const phoneOk = isValidIndianMobile(customer.phone);

    const change = (id, delta) => setCart((current) => {
        const next = { ...current, [id]: Math.max(0, Math.min(MAX_EACH, (current[id] || 0) + delta)) };
        if (!next[id]) delete next[id];
        return next;
    });

    const jumpTo = (category) => {
        const node = sectionRefs.current[category];
        if (!node) return;
        window.scrollTo({ top: node.getBoundingClientRect().top + window.scrollY - 92, behavior: 'smooth' });
    };

    const pay = async (event) => {
        event.preventDefault();
        setError('');
        if (!phoneOk) {
            setEditing(true);
            return setError('Enter your 10-digit mobile number - your token comes on WhatsApp.');
        }
        setPaying(true);
        try {
            const details = { name: customer.name.trim(), phone: customer.phone };
            if (!kiosk) storage.write(CUSTOMER_KEY, details);
            const [Razorpay, res] = await Promise.all([
                loadCheckout(),
                posApi.post(`/public/${encodeURIComponent(restaurant.slug)}/orders`, {
                    items: lines.map((line) => ({ itemId: line._id, quantity: line.quantity })),
                    customer: details,
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
                modal: { ondismiss: () => setPaying(false) },
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
                <img src="/site/hero-m.webp" alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
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

    const orderPanel = (
        <form onSubmit={pay} className="flex flex-col">
            {lines.length === 0 ? (
                <div className="py-10 text-center text-ink/50">
                    <PiShoppingBagOpenDuotone className="mx-auto text-4xl text-gold" />
                    <p className="mt-3 text-sm">Nothing yet - tap a dish to add it.</p>
                </div>
            ) : (
                <ul className="divide-y divide-ink/10">
                    {lines.map((line) => (
                        <li key={line._id} className="flex items-center gap-3 py-3">
                            <span className="min-w-0 flex-1">
                                <span className="block truncate font-medium">{line.name}</span>
                                <span className="font-code text-xs text-ink/50">{formatPrice(line.price)} each</span>
                            </span>
                            <Stepper name={line.name} quantity={line.quantity} onChange={(delta) => change(line._id, delta)} size="sm" />
                            <span className="w-14 text-right font-code text-sm tabular-nums">{formatPrice(line.price * line.quantity)}</span>
                        </li>
                    ))}
                </ul>
            )}

            {lines.length > 0 && (
                <>
                    <p className="mt-2 flex items-baseline justify-between border-t border-ink/15 pt-4">
                        <span className="text-sm text-ink/60">{restaurant?.pricesIncludeGst ? 'Total · taxes included' : 'Total before GST'}</span>
                        <span className="font-accent text-4xl tabular-nums">{formatPrice(total)}</span>
                    </p>
                    <div className="mt-7">
                        <CustomerFields customer={customer} onChange={(next) => { setCustomer(next); if (error) setError(''); }} remembered={remembered} editing={editing} onEdit={() => setEditing(true)} />
                    </div>
                    {error && <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200">{error}</p>}
                    <button type="submit" disabled={paying} className="mt-7 flex w-full items-center justify-between rounded-full bg-ink py-4 pl-7 pr-5 font-semibold text-paper transition-transform active:scale-[0.99] disabled:opacity-60">
                        <span>{paying ? 'Opening payment…' : 'Pay now'}</span>
                        <span className="rounded-full bg-gold px-4 py-1.5 font-code text-sm text-ink">{formatPrice(total)}{restaurant?.pricesIncludeGst ? '' : ' + GST'}</span>
                    </button>
                    <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink/50"><PiShieldCheckDuotone className="text-base text-leaf" /> UPI or card · secured by Razorpay</p>
                </>
            )}
        </form>
    );

    return (
        <div className="qb-site min-h-[100dvh] bg-paper pb-28 text-ink lg:pb-10">
            {/* Slim header */}
            <header className="sticky top-0 z-30 border-b border-ink/10 bg-paper/90 backdrop-blur-lg">
                <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
                    {kiosk ? (
                        <span className="font-accent text-2xl">{RESTAURANT.word}</span>
                    ) : (
                        <Link to="/" className="flex items-center gap-2 font-accent text-2xl" aria-label={`Back to ${RESTAURANT.name}`}><PiArrowLeft className="text-base text-ink/50" /> {RESTAURANT.word}</Link>
                    )}
                    <span className="hidden text-sm text-ink/55 sm:block">Order online · pay by UPI or card · collect with your token{restaurant?.hours ? ` · ${restaurant.hours}` : ''}</span>
                    {count > 0 && (
                        <span className="ml-auto rounded-full bg-ink px-3 py-1 font-code text-xs text-paper lg:hidden">{count} · {formatPrice(total)}</span>
                    )}
                </div>
                {/* Category chips */}
                <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:px-6" aria-label="Categories">
                    {groups.map(([category]) => (
                        <button
                            key={category}
                            type="button"
                            onClick={() => jumpTo(category)}
                            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${active === category ? 'bg-ink text-paper' : 'bg-white text-ink/70 ring-1 ring-ink/10 hover:text-ink'}`}
                            aria-current={active === category ? 'true' : undefined}
                        >
                            {category}
                        </button>
                    ))}
                </nav>
            </header>

            <div className="mx-auto grid max-w-7xl gap-8 px-4 pt-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-10">
                {/* The menu, category by category */}
                <main>
                    {groups.map(([category, items]) => (
                        <section key={category} ref={(node) => { sectionRefs.current[category] = node; }} data-category={category} className="mb-10 scroll-mt-28">
                            <h2 className="mb-4 flex items-baseline gap-3 font-accent text-3xl">{category} <span className="font-code text-xs tracking-[0.2em] text-ink/40">{items.length}</span></h2>
                            <div className="grid gap-3 md:grid-cols-2">
                                {items.map((item) => (
                                    <DishCard key={item._id} item={item} quantity={cart[item._id] || 0} onChange={(delta) => change(item._id, delta)} />
                                ))}
                            </div>
                        </section>
                    ))}
                    {menu.length === 0 && <p className="py-16 text-center text-ink/50">The menu will appear here once the kitchen opens.</p>}
                </main>

                {/* Order panel: always there on wide screens */}
                <aside className="hidden lg:block">
                    <div className="sticky top-28 rounded-[28px] bg-white p-6 shadow-[0_30px_60px_-40px_rgba(15,14,12,0.5)] ring-1 ring-ink/5">
                        <h2 className="font-accent text-3xl">Your order</h2>
                        <div className="mt-2">{orderPanel}</div>
                    </div>
                </aside>
            </div>

            {/* Phones: cart bar, then the order as a sheet */}
            {count > 0 && !sheet && (
                <div className="fixed inset-x-0 bottom-0 z-30 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:hidden">
                    <button type="button" onClick={() => setSheet(true)} className="qb-pop mx-auto flex w-full max-w-xl items-center justify-between gap-4 rounded-full bg-ink py-3 pl-6 pr-3 text-paper shadow-[0_20px_50px_-15px_rgba(15,14,12,0.7)]">
                        <span className="flex items-center gap-3"><PiShoppingBagOpenDuotone className="text-xl text-gold" /> {count} item{count === 1 ? '' : 's'} · <b className="tabular-nums">{formatPrice(total)}</b></span>
                        <span className="flex items-center gap-1.5 rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-ink"><PiCheckBold /> Checkout</span>
                    </button>
                </div>
            )}
            {sheet && (
                <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/60 backdrop-blur-sm lg:hidden" onClick={() => !paying && setSheet(false)} role="presentation">
                    <div onClick={(event) => event.stopPropagation()} className="qb-sheet max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-paper p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]" role="dialog" aria-modal="true" aria-labelledby="order-title">
                        <div className="flex items-center justify-between">
                            <h2 id="order-title" className="font-accent text-4xl">Your order</h2>
                            <button type="button" onClick={() => setSheet(false)} disabled={paying} className="flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-ink/15" aria-label="Close"><PiX /></button>
                        </div>
                        <div className="mt-3">{orderPanel}</div>
                    </div>
                </div>
            )}
        </div>
    );
}
