import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
    FiArrowUpRight, FiArrowRight, FiMessageCircle, FiPrinter, FiZap, FiMonitor, FiUsers, FiBarChart2,
    FiRepeat, FiPlus, FiMinus, FiClock, FiMapPin,
} from 'react-icons/fi';
import Reveal from '../components/landing/Reveal';
import HeroDemo from '../components/landing/HeroDemo';
import VegDot from '../components/pos/VegDot';
import { posApi, formatINR } from '../utils/pos';

const LIVE_REFRESH_MS = 15000;

const NAV_LINKS = [
    { id: 'features', label: 'Product' },
    { id: 'how', label: 'How it works' },
    { id: 'live', label: 'Live' },
    { id: 'faq', label: 'FAQ' },
];

const TICKER = [
    'Bills in seconds', 'Token system', 'Kitchen screens', 'Token TV', 'WhatsApp bills',
    'Zero-fee UPI', 'Thermal printing', 'Live dashboard', 'Remembers regulars', 'GST invoices',
];

const STEPS = [
    { title: 'Load your menu', text: 'Paste it from Excel in one go - dishes, prices, counters, veg or non-veg.' },
    { title: 'Bill at the counter', text: 'Tap or type, Ctrl+Enter to confirm. Token slips print on their own.' },
    { title: 'Kitchen marks ready', text: 'Each counter sees only its own items, with timers that flag delays.' },
    { title: 'Customer collects', text: 'The token TV calls their number. The bill is already on their WhatsApp.' },
];

const FAQS = [
    {
        q: 'What do I need to run it?',
        a: 'Any computer, tablet or phone with Chrome, plus an 80mm or 58mm thermal receipt printer for token slips. Kitchen screens and the token TV run on any spare screen with a browser.',
    },
    {
        q: 'Do I pay a fee on UPI payments?',
        a: 'No gateway fee. The counter shows a UPI QR with the exact amount that pays straight into your own business UPI account. The cashier confirms when the soundbox announces the payment.',
    },
    {
        q: 'How do customers get their bill on WhatsApp?',
        a: 'Type the customer\'s number while billing - QuickBite remembers it next time. The bill is sent with one tap, or fully automatically once your WhatsApp Business account is connected.',
    },
    {
        q: 'Are the bills GST compliant?',
        a: 'Yes. Bills are numbered per financial year with GSTIN, SAC code and the CGST / SGST split. Composition-scheme restaurants get a Bill of Supply instead.',
    },
    {
        q: 'Can I see sales when I am not at the restaurant?',
        a: 'The owner dashboard is live on your phone: sales against last week, cash vs UPI, the busiest hours, the slowest counter, top dishes and a cash drawer check.',
    },
];

const scrollTo = (id) => (event) => {
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView({ block: 'start' });
};

const Eyebrow = ({ children, dark = false }) => (
    <p className={`text-xs font-semibold uppercase tracking-[0.25em] ${dark ? 'text-orange-400' : 'text-orange-600'}`}>{children}</p>
);

/* ---------- Mini product illustrations for the feature grid ---------- */

const MiniKeys = () => (
    <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
        <kbd className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 font-sans font-semibold text-stone-700 shadow-[0_2px_0_#d6d3d1]">masala d</kbd>
        <span>Enter</span>
        <FiArrowRight />
        <kbd className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 font-sans font-semibold text-stone-700 shadow-[0_2px_0_#d6d3d1]">Ctrl + Enter</kbd>
        <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-800">Token 42</span>
    </div>
);

const MiniTokens = () => (
    <div className="grid grid-cols-3 gap-2">
        {[38, 39, 41].map((token, index) => (
            <div key={token} className={`rounded-xl py-3 text-center text-xl font-extrabold ${index === 2 ? 'bg-emerald-500 text-stone-950' : 'bg-white/10 text-stone-300'}`}>
                {token}
            </div>
        ))}
    </div>
);

const MiniTicket = () => (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold">#57</span>
            <span className="rounded-md bg-amber-400 px-2 py-0.5 font-mono text-xs font-bold">6:42</span>
        </div>
        <p className="mt-2 flex justify-between text-sm"><span>Ghee Podi Dosa</span><span className="font-semibold text-orange-600">× 2</span></p>
        <div className="mt-3 rounded-lg bg-stone-900 py-2 text-center text-xs font-semibold text-white">Ready</div>
    </div>
);

const MiniWhatsapp = () => (
    <div className="space-y-2">
        <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-[#d9fdd3] px-3.5 py-2.5 text-sm text-stone-800">
            🧾 Token <b>#42</b> · ₹190.00<br />
            <span className="text-xs text-stone-500">Show this at the counter</span>
        </div>
        <p className="text-right text-[11px] text-stone-400">Delivered ✓✓</p>
    </div>
);

const MiniDashboard = () => (
    <div className="flex h-24 items-end gap-1.5">
        {[22, 38, 64, 100, 58, 30, 26, 44, 72, 50, 34, 18].map((height, index) => (
            <span
                key={index}
                className={`flex-1 rounded-t-[4px] ${index === 3 ? 'bg-orange-500' : 'bg-stone-300'}`}
                style={{ height: `${height}%` }}
            />
        ))}
    </div>
);

const MiniRegular = () => (
    <div className="rounded-2xl bg-orange-50 p-3.5 text-sm ring-1 ring-orange-200">
        <p className="font-mono text-stone-500">98765 ▍</p>
        <div className="mt-2 flex items-center justify-between gap-2">
            <span><b className="text-orange-900">Ravi</b> <span className="text-orange-700/80">· 23 visits</span></span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-orange-700 ring-1 ring-orange-200"><FiRepeat /> Repeat</span>
        </div>
    </div>
);

const MiniReceipt = () => (
    <div className="mx-auto w-40 rotate-[-3deg] rounded-sm bg-white px-4 py-3 font-mono text-[10px] leading-relaxed text-stone-800 shadow-lg ring-1 ring-stone-200">
        <p className="text-center font-bold">TAX INVOICE</p>
        <p className="mt-1 border-t border-dashed border-stone-400 pt-1 text-center text-[9px] tracking-widest">TOKEN</p>
        <p className="text-center text-2xl font-black">#42</p>
        <p className="flex justify-between border-t border-dashed border-stone-400 pt-1"><span>TOTAL</span><span>₹190</span></p>
    </div>
);

const FEATURES = [
    { title: 'Bills in seconds', text: 'Type a few letters, press Enter, Ctrl+Enter to confirm. Popular dishes are one tap away.', icon: FiZap, visual: <MiniKeys />, span: 'lg:col-span-4' },
    { title: 'Tokens, not chaos', text: 'A live token TV tells customers exactly when and where to collect.', icon: FiMonitor, visual: <MiniTokens />, span: 'lg:col-span-2', dark: true },
    { title: 'Kitchen screens', text: 'Every counter sees its own tickets, with timers that turn red when an order waits too long.', icon: FiClock, visual: <MiniTicket />, span: 'lg:col-span-2' },
    { title: 'Bills on WhatsApp', text: 'Paperless bills for customers who share their number - less paper, more repeat visits.', icon: FiMessageCircle, visual: <MiniWhatsapp />, span: 'lg:col-span-2' },
    { title: 'Zero-fee UPI', text: 'An exact-amount QR that pays straight into your own account. No gateway, no 2% cut.', icon: FiArrowUpRight, visual: (
        <div className="flex justify-center"><div className="rounded-2xl bg-white p-3 ring-1 ring-stone-200"><QRCodeSVG value="upi://pay?pa=yourhotel@upi&am=190" size={96} /></div></div>
    ), span: 'lg:col-span-2' },
    { title: 'Live owner dashboard', text: 'Sales vs last week, payment mix, busiest hours and the slowest counter - on your phone.', icon: FiBarChart2, visual: <MiniDashboard />, span: 'lg:col-span-3' },
    { title: 'Remembers regulars', text: 'Five digits find a regular. One tap repeats their usual order.', icon: FiUsers, visual: <MiniRegular />, span: 'lg:col-span-3' },
    { title: 'Thermal printing', text: 'GST bills and per-counter token slips on 80mm or 58mm rolls - printed the moment you confirm.', icon: FiPrinter, visual: <MiniReceipt />, span: 'lg:col-span-6 lg:grid lg:grid-cols-2 lg:items-center' },
];

export default function Landing() {
    const [info, setInfo] = useState(null);
    const [board, setBoard] = useState(null);
    const [scrolled, setScrolled] = useState(false);
    const [openFaq, setOpenFaq] = useState(0);

    useEffect(() => {
        document.title = 'QuickBite - Billing & token system for busy restaurants';
        posApi.get('/public/info').then((res) => setInfo(res.data)).catch(() => setInfo({ failed: true }));

        const loadBoard = () => posApi.get('/display').then((res) => setBoard(res.data)).catch(() => {});
        loadBoard();
        const timer = setInterval(() => {
            if (document.visibilityState === 'visible') loadBoard();
        }, LIVE_REFRESH_MS);

        const onScroll = () => setScrolled(window.scrollY > 24);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            clearInterval(timer);
            window.removeEventListener('scroll', onScroll);
        };
    }, []);

    const restaurant = info?.restaurant;
    const menu = info?.menu || [];

    return (
        <div className="pos-app min-h-screen overflow-x-clip bg-[#f6f3ee] text-stone-900">
            {/* ---------- Navigation ---------- */}
            <header
                className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
                    scrolled ? 'border-b border-stone-200/60 bg-[#f6f3ee]/80 py-2.5 text-stone-900 backdrop-blur-xl' : 'py-4 text-white'
                }`}
            >
                <div className="mx-auto flex max-w-7xl items-center gap-6 px-5 sm:px-8">
                    <a href="#top" onClick={scrollTo('top')} className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 text-sm font-extrabold text-white">Q</span>
                        <span className="text-lg font-bold tracking-tight">QuickBite</span>
                    </a>
                    <nav className="ml-auto hidden items-center gap-1 text-sm font-medium md:flex">
                        {NAV_LINKS.map((link) => (
                            <a
                                key={link.id}
                                href={`#${link.id}`}
                                onClick={scrollTo(link.id)}
                                className={`rounded-full px-4 py-2 transition-colors ${scrolled ? 'text-stone-600 hover:bg-stone-900/5 hover:text-stone-900' : 'text-white/70 hover:text-white'}`}
                            >
                                {link.label}
                            </a>
                        ))}
                    </nav>
                    <div className="ml-auto flex items-center gap-2 md:ml-4">
                        <Link
                            to="/signin"
                            className={`hidden rounded-full px-4 py-2 text-sm font-semibold transition-colors sm:block ${scrolled ? 'text-stone-700 hover:text-stone-900' : 'text-white/80 hover:text-white'}`}
                        >
                            Sign in
                        </Link>
                        <Link
                            to="/contact"
                            className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${scrolled ? 'bg-stone-900 text-white hover:bg-stone-700' : 'bg-white text-stone-900 hover:bg-orange-50'}`}
                        >
                            Book a demo
                        </Link>
                    </div>
                </div>
            </header>

            <main id="top">
                {/* ---------- Hero ---------- */}
                <section className="grain relative overflow-hidden bg-stone-950 text-white">
                    <div className="pointer-events-none absolute -left-40 top-0 h-[520px] w-[520px] rounded-full bg-orange-600/25 blur-[120px]" />
                    <div className="pointer-events-none absolute -right-32 bottom-0 h-[460px] w-[460px] rounded-full bg-rose-600/20 blur-[120px]" />

                    <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-5 pb-24 pt-36 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:pb-32 lg:pt-44">
                        <div>
                            <Reveal>
                                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-stone-300 backdrop-blur">
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                                    {restaurant?.name ? `Live at ${restaurant.name}` : 'Billing & tokens for busy restaurants'}
                                </span>
                            </Reveal>
                            <Reveal delay={80}>
                                <h1 className="mt-7 text-[3.4rem] font-extrabold leading-[0.95] tracking-[-0.04em] sm:text-7xl lg:text-[5.6rem]">
                                    Rush hour,
                                    <br />
                                    <span className="font-accent text-[1.12em] font-normal italic tracking-[-0.02em] text-orange-400">handled.</span>
                                </h1>
                            </Reveal>
                            <Reveal delay={160}>
                                <p className="mt-7 max-w-xl text-lg leading-relaxed text-stone-400">
                                    QuickBite is the counter billing and token system for busy restaurants - bills in seconds,
                                    tokens on screen, receipts on WhatsApp and every rupee on one live dashboard.
                                </p>
                            </Reveal>
                            <Reveal delay={240} className="mt-10 flex flex-wrap items-center gap-3">
                                <Link to="/contact" className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-4 text-sm font-semibold text-stone-950 transition hover:bg-orange-100">
                                    Book a demo <FiArrowUpRight className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                                </Link>
                                <a href="#live" onClick={scrollTo('live')} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-7 py-4 text-sm font-semibold text-white transition hover:border-white/40">
                                    See it live <FiArrowRight />
                                </a>
                            </Reveal>
                            <Reveal delay={320}>
                                <p className="mt-10 text-sm text-stone-500">
                                    No gateway fees on UPI · Any PC, tablet or phone · 80 / 58mm thermal printers
                                </p>
                            </Reveal>
                        </div>

                        <Reveal delay={200} className="px-4 sm:px-10 lg:px-0">
                            <HeroDemo dishes={menu} />
                        </Reveal>
                    </div>
                </section>

                {/* ---------- Ticker ---------- */}
                <div className="overflow-hidden border-y border-stone-900/10 bg-[#f6f3ee] py-5" aria-hidden="true">
                    <div className="marquee-track flex w-max gap-10 whitespace-nowrap text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">
                        {[...TICKER, ...TICKER].map((item, index) => (
                            <span key={index} className="flex items-center gap-10">
                                {item}
                                <span className="font-accent text-2xl italic text-orange-500">✦</span>
                            </span>
                        ))}
                    </div>
                </div>

                {/* ---------- Statement ---------- */}
                <section className="mx-auto max-w-6xl px-5 py-28 sm:px-8 lg:py-36">
                    <Reveal>
                        <p className="text-3xl font-semibold leading-[1.2] tracking-tight text-stone-400 sm:text-5xl">
                            Every second at the counter is a customer waiting.{' '}
                            <span className="text-stone-900">QuickBite gives those seconds back</span>{' '}
                            - to your cashier, your kitchen and the{' '}
                            <span className="font-accent font-normal italic text-orange-600">hungry person in line.</span>
                        </p>
                    </Reveal>
                </section>

                {/* ---------- Features ---------- */}
                <section id="features" className="scroll-mt-20 mx-auto max-w-7xl px-5 pb-28 sm:px-8">
                    <Reveal className="mb-12 flex flex-wrap items-end justify-between gap-6">
                        <div>
                            <Eyebrow>The product</Eyebrow>
                            <h2 className="mt-4 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
                                Everything the counter needs. <span className="font-accent font-normal italic">Nothing it doesn&apos;t.</span>
                            </h2>
                        </div>
                        <p className="max-w-sm text-stone-500">Built with tiffin hotels and quick-service restaurants, for the 8 AM rush and the 1 PM crowd.</p>
                    </Reveal>

                    <div className="grid gap-4 lg:grid-cols-6">
                        {FEATURES.map((feature, index) => {
                            const Icon = feature.icon;
                            return (
                                <Reveal
                                    key={feature.title}
                                    delay={(index % 3) * 90}
                                    className={`group rounded-[28px] p-7 transition-transform duration-500 hover:-translate-y-1 ${feature.span} ${
                                        feature.dark ? 'bg-stone-950 text-white' : 'bg-white ring-1 ring-stone-900/5'
                                    }`}
                                >
                                    <div>
                                        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${feature.dark ? 'bg-white/10 text-orange-400' : 'bg-orange-50 text-orange-600'}`}>
                                            <Icon />
                                        </span>
                                        <h3 className="mt-5 text-xl font-semibold tracking-tight">{feature.title}</h3>
                                        <p className={`mt-2 max-w-md text-[15px] leading-relaxed ${feature.dark ? 'text-stone-400' : 'text-stone-500'}`}>{feature.text}</p>
                                    </div>
                                    <div className="mt-7">{feature.visual}</div>
                                </Reveal>
                            );
                        })}
                    </div>
                </section>

                {/* ---------- How it works ---------- */}
                <section id="how" className="grain relative scroll-mt-20 overflow-hidden bg-stone-950 text-white">
                    <div className="relative mx-auto max-w-7xl px-5 py-28 sm:px-8 lg:py-36">
                        <Reveal>
                            <Eyebrow dark>How it works</Eyebrow>
                            <h2 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
                                From order to plate, <span className="font-accent font-normal italic text-orange-400">without the shouting.</span>
                            </h2>
                        </Reveal>
                        <ol className="mt-16 grid gap-px overflow-hidden rounded-[28px] bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
                            {STEPS.map((step, index) => (
                                <Reveal as="li" key={step.title} delay={index * 110} className="bg-stone-950 p-8">
                                    <span className="font-accent text-6xl italic text-orange-400">0{index + 1}</span>
                                    <h3 className="mt-8 text-lg font-semibold">{step.title}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-stone-400">{step.text}</p>
                                </Reveal>
                            ))}
                        </ol>
                    </div>
                </section>

                {/* ---------- Live from the counter ---------- */}
                <section id="live" className="scroll-mt-20 mx-auto max-w-7xl px-5 py-28 sm:px-8 lg:py-36">
                    <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
                        <Reveal>
                            <Eyebrow>Live from the counter</Eyebrow>
                            <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
                                This page is talking to a <span className="font-accent font-normal italic text-orange-600">real counter</span> right now.
                            </h2>
                            {restaurant?.name && (
                                <div className="mt-8 space-y-2 text-stone-600">
                                    <p className="text-lg font-semibold text-stone-900">{restaurant.name}</p>
                                    {restaurant.hours && <p className="flex items-center gap-2 text-sm"><FiClock className="text-orange-600" /> {restaurant.hours}</p>}
                                    {restaurant.address && <p className="flex items-center gap-2 text-sm"><FiMapPin className="text-orange-600" /> {restaurant.address}</p>}
                                </div>
                            )}
                            {board && (
                                <div className="mt-8 grid max-w-sm grid-cols-2 gap-3">
                                    <div className="rounded-2xl bg-white p-5 ring-1 ring-stone-900/5">
                                        <p className="text-4xl font-bold tracking-tight">{board.preparing.length}</p>
                                        <p className="mt-1 text-sm text-stone-500">tokens being prepared</p>
                                    </div>
                                    <div className="rounded-2xl bg-white p-5 ring-1 ring-stone-900/5">
                                        <p className="text-4xl font-bold tracking-tight text-emerald-600">{board.ready.length}</p>
                                        <p className="mt-1 text-sm text-stone-500">ready to collect</p>
                                    </div>
                                </div>
                            )}
                            <a
                                href="/pos/display"
                                target="_blank"
                                rel="noreferrer"
                                className="mt-8 inline-flex items-center gap-2 rounded-full bg-stone-900 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-stone-700"
                            >
                                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> Open the live token board <FiArrowUpRight />
                            </a>
                        </Reveal>

                        <Reveal delay={120} className="rounded-[28px] bg-white p-6 ring-1 ring-stone-900/5 sm:p-8">
                            <div className="flex items-center justify-between">
                                <p className="font-semibold">Today&apos;s menu</p>
                                {restaurant?.pricesIncludeGst && <p className="text-xs text-stone-400">Prices include GST</p>}
                            </div>
                            {menu.length > 0 ? (
                                <ul className="mt-5 grid gap-x-8 sm:grid-cols-2">
                                    {menu.slice(0, 14).map((item) => (
                                        <li key={item.name} className="flex items-center justify-between gap-3 border-b border-stone-100 py-3 text-sm">
                                            <span className="flex min-w-0 items-center gap-2.5">
                                                <VegDot isVeg={item.isVeg !== false} />
                                                <span className="truncate">{item.name}</span>
                                            </span>
                                            <span className="shrink-0 font-semibold tabular-nums">{formatINR(item.price)}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="mt-6 rounded-2xl bg-stone-50 px-5 py-10 text-center text-sm text-stone-500">
                                    {info ? 'The live menu will appear here once the counter is online.' : 'Loading the live menu…'}
                                </p>
                            )}
                        </Reveal>
                    </div>
                </section>

                {/* ---------- FAQ ---------- */}
                <section id="faq" className="scroll-mt-20 border-t border-stone-900/10">
                    <div className="mx-auto grid max-w-7xl gap-12 px-5 py-28 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
                        <Reveal>
                            <Eyebrow>Questions</Eyebrow>
                            <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">Good to know</h2>
                        </Reveal>
                        <Reveal delay={100}>
                            <ul className="divide-y divide-stone-900/10 border-y border-stone-900/10">
                                {FAQS.map((faq, index) => {
                                    const open = openFaq === index;
                                    return (
                                        <li key={faq.q}>
                                            <button
                                                onClick={() => setOpenFaq(open ? -1 : index)}
                                                className="flex w-full items-center justify-between gap-6 py-6 text-left text-lg font-semibold tracking-tight"
                                                aria-expanded={open}
                                            >
                                                {faq.q}
                                                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${open ? 'bg-stone-900 text-white' : 'bg-white ring-1 ring-stone-900/10'}`}>
                                                    {open ? <FiMinus /> : <FiPlus />}
                                                </span>
                                            </button>
                                            <div className={`grid transition-all duration-500 ease-out ${open ? 'grid-rows-[1fr] pb-6 opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                                <p className="overflow-hidden pr-14 leading-relaxed text-stone-600">{faq.a}</p>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </Reveal>
                    </div>
                </section>

                {/* ---------- Final call to action ---------- */}
                <section className="px-3 pb-3 sm:px-5 sm:pb-5">
                    <div className="grain relative overflow-hidden rounded-[32px] bg-stone-950 px-6 py-24 text-center text-white sm:py-32">
                        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-600/25 blur-[120px]" />
                        <Reveal className="relative">
                            <h2 className="mx-auto max-w-4xl text-5xl font-extrabold leading-[0.95] tracking-[-0.04em] sm:text-7xl">
                                Ready for your <span className="font-accent font-normal italic text-orange-400">next rush hour?</span>
                            </h2>
                            <p className="mx-auto mt-6 max-w-lg text-stone-400">See QuickBite running on your own menu - set up in an afternoon, no new hardware beyond a receipt printer.</p>
                            <div className="mt-10 flex flex-wrap justify-center gap-3">
                                <Link to="/contact" className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-semibold text-stone-950 transition hover:bg-orange-100">
                                    Book a demo <FiArrowUpRight />
                                </Link>
                                <Link to="/signin" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-8 py-4 text-sm font-semibold text-white transition hover:border-white/40">
                                    Staff sign in
                                </Link>
                            </div>
                        </Reveal>
                    </div>
                </section>
            </main>

            <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-10 text-sm text-stone-500 sm:px-8">
                <p className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-rose-500 text-xs font-extrabold text-white">Q</span>
                    © {new Date().getFullYear()} QuickBite
                </p>
                <div className="flex items-center gap-6">
                    {NAV_LINKS.map((link) => (
                        <a key={link.id} href={`#${link.id}`} onClick={scrollTo(link.id)} className="hover:text-stone-900">{link.label}</a>
                    ))}
                    <Link to="/signin" className="hover:text-stone-900">Sign in</Link>
                </div>
            </footer>
        </div>
    );
}
