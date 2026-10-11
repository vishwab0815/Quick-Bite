import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    FiArrowRight, FiClock, FiMapPin, FiPhone, FiMessageCircle, FiMonitor, FiCreditCard, FiNavigation,
} from 'react-icons/fi';
import VegDot from '../components/pos/VegDot';
import Skeleton from '../components/pos/Skeleton';
import { posApi, formatINR } from '../utils/pos';

const FALLBACK_NAME = 'Sri Ganesh Restaurant';
const PREVIEW_ITEMS = 3;

const STEPS = [
    {
        title: 'Order & pay',
        text: 'Tell us your order at the counter. Pay by UPI, cash or card - whatever suits you.',
    },
    {
        title: 'Get your token',
        text: 'Your token prints instantly. Share your number and the bill arrives on WhatsApp.',
    },
    {
        title: 'Collect when called',
        text: 'Watch the token screen. When your number shows, collect from the counter named on it.',
    },
];

const HIGHLIGHTS = [
    { icon: FiCreditCard, label: 'UPI, cash or card' },
    { icon: FiMessageCircle, label: 'Bill on WhatsApp' },
    { icon: FiMonitor, label: 'Live token screen' },
];

const scrollTo = (id) => (event) => {
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView({ block: 'start' });
};

export default function Landing() {
    const [info, setInfo] = useState(null);
    const [failed, setFailed] = useState(false);
    const [category, setCategory] = useState('All');

    useEffect(() => {
        posApi.get('/public/info')
            .then((res) => setInfo(res.data))
            .catch(() => setFailed(true));
    }, []);

    const restaurant = info?.restaurant;
    const name = restaurant?.name || FALLBACK_NAME;
    const menu = info?.menu;

    useEffect(() => {
        document.title = `${name} · Fresh food, served fast`;
    }, [name]);

    const categories = useMemo(
        () => ['All', ...new Set((menu || []).map((item) => item.category).filter(Boolean))],
        [menu]
    );
    const visibleMenu = (menu || []).filter((item) => category === 'All' || item.category === category);
    const preview = (menu || []).slice(0, PREVIEW_ITEMS);
    const previewTotal = preview.reduce((sum, item) => sum + item.price, 0);
    const mapsUrl = restaurant?.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name}, ${restaurant.address}`)}`
        : null;

    return (
        <div className="pos-app min-h-screen bg-[#faf8f5] text-stone-900">
            {/* ---------- Navigation ---------- */}
            <header className="sticky top-0 z-40 border-b border-stone-200/70 bg-[#faf8f5]/85 backdrop-blur-md">
                <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3 sm:px-6">
                    <a href="#top" onClick={scrollTo('top')} className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 text-sm font-extrabold text-white shadow-sm">
                            {name.charAt(0)}
                        </span>
                        <span className="text-[15px] font-bold tracking-tight">{name}</span>
                    </a>
                    <nav className="ml-auto hidden items-center gap-1 text-sm font-medium text-stone-600 md:flex">
                        <a href="#menu" onClick={scrollTo('menu')} className="rounded-full px-3.5 py-2 transition hover:bg-stone-100 hover:text-stone-900">Menu</a>
                        <a href="#how" onClick={scrollTo('how')} className="rounded-full px-3.5 py-2 transition hover:bg-stone-100 hover:text-stone-900">How it works</a>
                        <a href="#visit" onClick={scrollTo('visit')} className="rounded-full px-3.5 py-2 transition hover:bg-stone-100 hover:text-stone-900">Visit us</a>
                    </nav>
                    <Link
                        to="/signin"
                        className="ml-auto rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-900 hover:text-stone-900 md:ml-2"
                    >
                        Staff login
                    </Link>
                </div>
            </header>

            <main id="top">
                {/* ---------- Hero ---------- */}
                <section className="relative overflow-hidden">
                    <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-orange-200/40 blur-3xl" />
                    <div className="pointer-events-none absolute -right-24 top-32 h-80 w-80 rounded-full bg-rose-200/40 blur-3xl" />

                    <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:pb-28 lg:pt-20">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-600">Fresh · Fast · Made to order</p>
                            <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                                Hot food,
                                <br />
                                <span className="bg-gradient-to-r from-orange-600 to-rose-600 bg-clip-text text-transparent">served in minutes.</span>
                            </h1>
                            <p className="mt-5 max-w-xl text-base leading-relaxed text-stone-600 sm:text-lg">
                                Order at the counter, take your token and collect your food the moment your number is called.
                                No waiting at the table, no lost bills.
                            </p>
                            <div className="mt-8 flex flex-wrap gap-3">
                                <a
                                    href="#menu"
                                    onClick={scrollTo('menu')}
                                    className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-stone-900/10 transition hover:bg-stone-800"
                                >
                                    See today&apos;s menu <FiArrowRight />
                                </a>
                                <a
                                    href="/pos/display"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-6 py-3.5 text-sm font-semibold text-stone-800 transition hover:border-stone-900"
                                >
                                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Live token board
                                </a>
                            </div>
                            <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-stone-600">
                                {HIGHLIGHTS.map((highlight) => {
                                    const Icon = highlight.icon;
                                    return (
                                        <li key={highlight.label} className="flex items-center gap-2">
                                            <Icon className="text-orange-600" /> {highlight.label}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>

                        {/* Order + token illustration built from the live menu */}
                        <div className="relative mx-auto w-full max-w-sm lg:max-w-none">
                            <div className="rounded-3xl border border-stone-200/80 bg-white p-6 pb-28 shadow-[0_20px_60px_-20px_rgba(28,25,23,0.25)]">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold">Your order</p>
                                    <p className="text-xs text-stone-400">Counter bill</p>
                                </div>
                                <ul className="mt-4 space-y-3">
                                    {(preview.length ? preview : Array.from({ length: PREVIEW_ITEMS }, () => null)).map((item, index) => (
                                        <li key={item?.name || index} className="flex items-center justify-between gap-3 text-sm">
                                            {item ? (
                                                <>
                                                    <span className="flex min-w-0 items-center gap-2">
                                                        <VegDot isVeg={item.isVeg !== false} />
                                                        <span className="truncate">{item.name}</span>
                                                    </span>
                                                    <span className="font-medium tabular-nums">{formatINR(item.price)}</span>
                                                </>
                                            ) : (
                                                <Skeleton className="h-5 w-full rounded-lg" />
                                            )}
                                        </li>
                                    ))}
                                </ul>
                                <div className="mt-4 flex items-center justify-between border-t border-dashed border-stone-200 pt-4">
                                    <span className="text-sm text-stone-500">Total</span>
                                    <span className="text-lg font-bold tabular-nums">{formatINR(previewTotal)}</span>
                                </div>
                            </div>

                            <div className="absolute -bottom-6 left-5 w-56 rounded-2xl bg-stone-900 p-4 text-white shadow-2xl sm:-left-10">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">Token</p>
                                <p className="text-4xl font-extrabold tracking-tight">42</p>
                                <p className="mt-1 flex items-center gap-2 text-sm text-emerald-300">
                                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> Ready at the counter
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ---------- Quick info ---------- */}
                {(restaurant?.hours || restaurant?.address || restaurant?.phone) && (
                    <section className="border-y border-stone-200/70 bg-white">
                        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 text-sm sm:grid-cols-3 sm:px-6">
                            {restaurant.hours && (
                                <p className="flex items-center gap-3"><FiClock className="shrink-0 text-orange-600" /> <span><span className="text-stone-500">Open </span>{restaurant.hours}</span></p>
                            )}
                            {restaurant.address && (
                                <p className="flex items-center gap-3"><FiMapPin className="shrink-0 text-orange-600" /> {restaurant.address}</p>
                            )}
                            {restaurant.phone && (
                                <a href={`tel:${restaurant.phone}`} className="flex items-center gap-3 hover:text-orange-700"><FiPhone className="shrink-0 text-orange-600" /> {restaurant.phone}</a>
                            )}
                        </div>
                    </section>
                )}

                {/* ---------- Menu ---------- */}
                <section id="menu" className="scroll-mt-16">
                    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
                        <div className="flex flex-wrap items-end justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-600">Today&apos;s menu</p>
                                <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Made fresh, all day</h2>
                            </div>
                            {restaurant?.pricesIncludeGst && <p className="text-sm text-stone-500">All prices include GST</p>}
                        </div>

                        {categories.length > 2 && (
                            <div className="-mx-4 mt-8 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
                                {categories.map((option) => (
                                    <button
                                        key={option}
                                        onClick={() => setCategory(option)}
                                        className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                                            category === option ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 ring-1 ring-stone-200 hover:text-stone-900'
                                        }`}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {!menu && !failed && Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-20" />)}
                            {visibleMenu.map((item) => (
                                <div
                                    key={item.name}
                                    className="flex items-center justify-between gap-4 rounded-2xl border border-stone-200/80 bg-white px-5 py-4 transition hover:border-orange-300 hover:shadow-sm"
                                >
                                    <div className="flex min-w-0 items-start gap-3">
                                        <span className="mt-1"><VegDot isVeg={item.isVeg !== false} /></span>
                                        <div className="min-w-0">
                                            <p className="truncate font-semibold">{item.name}</p>
                                            {item.category && <p className="text-xs text-stone-400">{item.category}</p>}
                                        </div>
                                    </div>
                                    <p className="shrink-0 font-semibold tabular-nums">{formatINR(item.price)}</p>
                                </div>
                            ))}
                        </div>
                        {menu && menu.length === 0 && (
                            <p className="mt-6 rounded-2xl bg-white px-5 py-10 text-center text-stone-500">Our menu is being updated - please ask at the counter.</p>
                        )}
                        {failed && (
                            <p className="mt-6 rounded-2xl bg-white px-5 py-10 text-center text-stone-500">The menu couldn&apos;t load right now - please ask at the counter.</p>
                        )}
                    </div>
                </section>

                {/* ---------- How it works ---------- */}
                <section id="how" className="scroll-mt-16 bg-stone-900 text-white">
                    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400">How it works</p>
                        <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">From counter to plate in three easy steps</h2>
                        <ol className="mt-12 grid gap-6 md:grid-cols-3">
                            {STEPS.map((step, index) => (
                                <li key={step.title} className="rounded-3xl bg-white/[0.06] p-6 ring-1 ring-white/10">
                                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-rose-500 text-sm font-bold">
                                        {index + 1}
                                    </span>
                                    <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-stone-300">{step.text}</p>
                                </li>
                            ))}
                        </ol>
                    </div>
                </section>

                {/* ---------- Visit ---------- */}
                <section id="visit" className="scroll-mt-16">
                    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
                        <div className="rounded-3xl border border-stone-200/80 bg-white p-8 shadow-sm sm:p-12">
                            <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-600">Visit us</p>
                                    <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Come hungry. We&apos;ll be quick.</h2>
                                    <p className="mt-4 max-w-lg text-stone-600">
                                        Walk in, order at the counter and watch for your token. Takeaway is just as fast.
                                    </p>
                                </div>
                                <div className="space-y-4 text-sm">
                                    {restaurant?.hours && (
                                        <p className="flex items-start gap-3"><FiClock className="mt-0.5 shrink-0 text-orange-600" /><span><span className="block font-semibold">Hours</span>{restaurant.hours}</span></p>
                                    )}
                                    {restaurant?.address && (
                                        <p className="flex items-start gap-3"><FiMapPin className="mt-0.5 shrink-0 text-orange-600" /><span><span className="block font-semibold">Address</span>{restaurant.address}</span></p>
                                    )}
                                    <div className="flex flex-wrap gap-3 pt-2">
                                        {mapsUrl && (
                                            <a href={mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-5 py-3 font-semibold text-white transition hover:bg-stone-800">
                                                <FiNavigation /> Get directions
                                            </a>
                                        )}
                                        {restaurant?.phone && (
                                            <a href={`tel:${restaurant.phone}`} className="inline-flex items-center gap-2 rounded-full border border-stone-300 px-5 py-3 font-semibold text-stone-800 transition hover:border-stone-900">
                                                <FiPhone /> Call us
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="border-t border-stone-200/70">
                <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-8 text-sm text-stone-500 sm:px-6">
                    <p>© {new Date().getFullYear()} {name}</p>
                    <div className="flex items-center gap-5">
                        <Link to="/signin" className="hover:text-stone-900">Staff login</Link>
                        <span className="text-stone-400">Billing by QuickBite</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
