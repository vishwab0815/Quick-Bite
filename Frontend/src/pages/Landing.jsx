import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { FiArrowUpRight, FiArrowDown, FiPlus, FiMinus, FiClock, FiMapPin } from 'react-icons/fi';
import Reveal from '../components/landing/Reveal';
import TokenBoard from '../components/landing/TokenBoard';
import StoryScroll from '../components/landing/StoryScroll';
import FeatureRail from '../components/landing/FeatureRail';
import LiveReceipt from '../components/landing/LiveReceipt';
import Magnetic from '../components/landing/Magnetic';
import { MaskReveal, ScrollWords } from '../components/landing/TextEffects';
import { posApi } from '../utils/pos';
import { demoHref, demoIsExternal } from '../utils/sales';

const demoLinkProps = { href: demoHref, ...(demoIsExternal && { target: '_blank', rel: 'noreferrer' }) };

const LIVE_REFRESH_MS = 15000;

const NAV_LINKS = [
    { id: 'how', label: 'How it works' },
    { id: 'features', label: 'Product' },
    { id: 'live', label: 'Live' },
    { id: 'faq', label: 'FAQ' },
];

const TICKER = [
    'Bills in seconds', 'Token system', 'Kitchen screens', 'Token TV', 'WhatsApp bills',
    'Zero-fee UPI', 'Thermal printing', 'Live dashboard', 'Remembers regulars', 'GST invoices',
];

const MANIFESTO = 'Every second at the counter is a customer waiting. QuickBite gives those seconds back to the cashier, the kitchen and the *hungry* *person* *in* *line.*';

const FACTS = [
    { value: '₹0', label: 'gateway fee on UPI', note: 'The QR pays straight into the owner’s own account.' },
    { value: '2', label: 'keys to bill an order', note: 'Enter adds the dish. Ctrl+Enter confirms it.' },
    { value: '1', label: 'tap to send the bill', note: 'On WhatsApp, to any number the customer shares.' },
    { value: 'Any', label: 'screen will do', note: 'Kitchen and token TV run in a browser. No new hardware.' },
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
        a: 'Type the customer’s number while billing - QuickBite remembers it next time. The bill is sent with one tap, or fully automatically once your WhatsApp Business account is connected.',
    },
    {
        q: 'Are the bills GST compliant?',
        a: 'Yes. Bills are numbered per financial year with GSTIN, SAC code and the CGST / SGST split. Composition-scheme restaurants get a Bill of Supply instead.',
    },
    {
        q: 'Can I see sales when I am not at the restaurant?',
        a: 'The owner dashboard is live on your phone: sales against last week, cash against UPI, the busiest hours, the slowest counter, top dishes and a cash drawer check.',
    },
];

const scrollTo = (id) => (event) => {
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView({ block: 'start' });
};

const Logo = ({ size = 'h-9 w-9 text-sm' }) => (
    <span className={`flex items-center justify-center rounded-xl bg-saffron font-display font-extrabold text-ink ${size}`}>Q</span>
);

Logo.propTypes = { size: PropTypes.string };

export default function Landing() {
    const [info, setInfo] = useState(null);
    const [board, setBoard] = useState(null);
    const [scrolled, setScrolled] = useState(false);
    const [openFaq, setOpenFaq] = useState(0);
    const progressRef = useRef(null);
    const heroRef = useRef(null);

    useEffect(() => {
        document.title = 'QuickBite - Billing & token system for busy restaurants';
        posApi.get('/public/info').then((res) => setInfo(res.data)).catch(() => setInfo({ failed: true }));

        const loadBoard = () => posApi.get('/display').then((res) => setBoard(res.data)).catch(() => {});
        loadBoard();
        const timer = setInterval(() => {
            if (document.visibilityState === 'visible') loadBoard();
        }, LIVE_REFRESH_MS);

        let frame = 0;
        const onScroll = () => {
            if (frame) return;
            frame = requestAnimationFrame(() => {
                frame = 0;
                setScrolled(window.scrollY > 24);
                const max = document.documentElement.scrollHeight - window.innerHeight;
                if (progressRef.current) progressRef.current.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
            });
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            clearInterval(timer);
            cancelAnimationFrame(frame);
            window.removeEventListener('scroll', onScroll);
        };
    }, []);

    // Soft glow that follows the mouse across the hero
    const moveGlow = (event) => {
        if (event.pointerType !== 'mouse' || !heroRef.current) return;
        const rect = heroRef.current.getBoundingClientRect();
        heroRef.current.style.setProperty('--mx', `${event.clientX - rect.left}px`);
        heroRef.current.style.setProperty('--my', `${event.clientY - rect.top}px`);
    };

    const restaurant = info?.restaurant;

    return (
        <div className="qb-landing min-h-screen overflow-x-clip bg-paper text-ink">
            <div ref={progressRef} className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-saffron" style={{ transform: 'scaleX(0)' }} aria-hidden="true" />

            {/* ---------- Navigation ---------- */}
            {/* Transparent over the hero, then a floating pill that reads on light and dark sections */}
            <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5">
                <div
                    className={`mx-auto flex items-center gap-6 rounded-full transition-all duration-500 ${
                        scrolled
                            ? 'max-w-5xl bg-paper/85 py-2 pl-3 pr-2 text-ink shadow-[0_12px_40px_-14px_rgba(15,14,12,0.4)] ring-1 ring-ink/10 backdrop-blur-xl'
                            : 'max-w-7xl px-2 py-3 text-paper sm:px-3'
                    }`}
                >
                    <a href="#top" onClick={scrollTo('top')} className="flex items-center gap-2.5" aria-label="QuickBite home">
                        <Logo />
                        <span className="font-display text-lg font-bold tracking-tight">QuickBite</span>
                    </a>
                    <nav className="ml-auto hidden items-center gap-1 text-sm font-medium md:flex" aria-label="Sections">
                        {NAV_LINKS.map((link) => (
                            <a
                                key={link.id}
                                href={`#${link.id}`}
                                onClick={scrollTo(link.id)}
                                className={`rounded-full px-4 py-2 transition-colors ${scrolled ? 'text-ink/60 hover:bg-ink/5 hover:text-ink' : 'text-paper/65 hover:text-paper'}`}
                            >
                                {link.label}
                            </a>
                        ))}
                    </nav>
                    <div className="ml-auto flex items-center gap-2 md:ml-4">
                        <Link
                            to="/signin"
                            className={`hidden rounded-full px-4 py-2 text-sm font-semibold transition-colors sm:block ${scrolled ? 'text-ink/70 hover:text-ink' : 'text-paper/75 hover:text-paper'}`}
                        >
                            Sign in
                        </Link>
                        <a
                            {...demoLinkProps}
                            className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${scrolled ? 'bg-ink text-paper hover:bg-ink/80' : 'bg-paper text-ink hover:bg-white'}`}
                        >
                            Book a demo
                        </a>
                    </div>
                </div>
            </header>

            <main id="top">
                {/* ---------- Hero ---------- */}
                <section ref={heroRef} onPointerMove={moveGlow} className="hero-glow grain relative flex min-h-[100svh] flex-col overflow-hidden bg-ink text-paper">
                    <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-5 pb-16 pt-32 sm:px-8 lg:pt-36">
                        <Reveal>
                            <span className="inline-flex items-center gap-2 rounded-full border border-paper/10 bg-paper/5 px-3.5 py-1.5 font-code text-[11px] uppercase tracking-[0.18em] text-stone-300">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-leaf" />
                                {restaurant?.name ? `Live at ${restaurant.name}` : 'Counter billing & tokens'}
                            </span>
                        </Reveal>

                        <MaskReveal
                            as="h1"
                            delay={120}
                            className="mt-8 font-display text-[clamp(3.4rem,12.5vw,11rem)] font-extrabold leading-[0.84] tracking-[-0.055em]"
                            lines={[
                                'Rush hour,',
                                <span key="accent" className="font-accent text-[1.08em] font-normal italic tracking-[-0.03em] text-saffron">handled.</span>,
                            ]}
                        />

                        <div className="mt-12 grid items-end gap-12 lg:mt-16 lg:grid-cols-[0.8fr_1.2fr]">
                            <Reveal delay={350}>
                                <p className="max-w-md text-lg leading-relaxed text-stone-400">
                                    The counter billing and token system for busy restaurants. Bills in seconds, tokens on screen,
                                    receipts on WhatsApp and every rupee on one live dashboard.
                                </p>
                                <div className="mt-9 flex flex-wrap items-center gap-3">
                                    <Magnetic>
                                        <a {...demoLinkProps} className="group inline-flex items-center gap-2 rounded-full bg-saffron px-7 py-4 text-sm font-bold text-ink transition-colors hover:bg-paper">
                                            Book a demo <FiArrowUpRight className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                                        </a>
                                    </Magnetic>
                                    <a href="#how" onClick={scrollTo('how')} className="inline-flex items-center gap-2 rounded-full border border-paper/15 px-7 py-4 text-sm font-semibold transition-colors hover:border-paper/40">
                                        See an order play out <FiArrowDown />
                                    </a>
                                </div>
                            </Reveal>
                            <Reveal delay={500}>
                                <TokenBoard board={board} restaurantName={restaurant?.name} />
                            </Reveal>
                        </div>
                    </div>
                </section>

                {/* ---------- Ticker ---------- */}
                <div className="overflow-hidden border-b border-ink/10 bg-paper py-5" aria-hidden="true">
                    <div className="marquee-track flex w-max gap-10 whitespace-nowrap font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                        {[...TICKER, ...TICKER].map((item, index) => (
                            <span key={index} className="flex items-center gap-10">
                                {item}
                                <span className="text-saffron">✦</span>
                            </span>
                        ))}
                    </div>
                </div>

                {/* ---------- Manifesto ---------- */}
                <section className="mx-auto max-w-6xl px-5 py-32 sm:px-8 lg:py-44">
                    <ScrollWords
                        text={MANIFESTO}
                        className="font-display text-[clamp(2rem,5.2vw,4.4rem)] font-semibold leading-[1.08] tracking-[-0.035em]"
                    />
                </section>

                {/* ---------- One order, ninety seconds ---------- */}
                <StoryScroll hotelName={restaurant?.name} />

                {/* ---------- Facts ---------- */}
                <section className="border-b border-ink/10">
                    <dl className="mx-auto grid max-w-7xl sm:grid-cols-2 lg:grid-cols-4">
                        {FACTS.map((fact, index) => (
                            <Reveal
                                key={fact.label}
                                delay={index * 90}
                                className={`border-ink/10 px-5 py-14 sm:px-8 ${index > 0 ? 'border-t sm:border-t-0' : ''} ${index % 2 === 1 ? 'sm:border-l' : ''} ${index > 1 ? 'sm:border-t lg:border-t-0' : ''} ${index > 0 ? 'lg:border-l' : ''}`}
                            >
                                <dt className="sr-only">{fact.label}</dt>
                                <dd>
                                    <p className="font-display text-7xl font-extrabold tracking-[-0.05em]">{fact.value}</p>
                                    <p className="mt-3 font-semibold">{fact.label}</p>
                                    <p className="mt-1 text-sm leading-relaxed text-ink/55">{fact.note}</p>
                                </dd>
                            </Reveal>
                        ))}
                    </dl>
                </section>

                {/* ---------- Product ---------- */}
                <FeatureRail />

                {/* ---------- Live from the counter ---------- */}
                <section id="live" className="scroll-mt-16 bg-paper-deep">
                    <div className="mx-auto grid max-w-7xl items-center gap-16 px-5 py-28 sm:px-8 lg:grid-cols-[1fr_0.9fr] lg:py-36">
                        <Reveal>
                            <p className="font-code text-xs uppercase tracking-[0.3em] text-saffron-deep">Live from the counter</p>
                            <h2 className="mt-4 font-display text-4xl font-bold leading-[1.02] tracking-[-0.03em] sm:text-6xl">
                                This receipt just printed from a <span className="font-accent font-normal italic">real counter.</span>
                            </h2>
                            <p className="mt-6 max-w-md text-lg leading-relaxed text-ink/60">
                                The menu, prices and tokens on this page come straight from {restaurant?.name || 'the restaurant'}&apos;s counter,
                                refreshed every few seconds.
                            </p>
                            {restaurant && (
                                <div className="mt-8 space-y-2 text-ink/70">
                                    {restaurant.hours && <p className="flex items-center gap-2"><FiClock className="text-saffron-deep" /> {restaurant.hours}</p>}
                                    {restaurant.address && <p className="flex items-center gap-2"><FiMapPin className="text-saffron-deep" /> {restaurant.address}</p>}
                                </div>
                            )}
                            <Magnetic className="mt-10">
                                <a
                                    href={restaurant?.slug ? `/tv/${restaurant.slug}` : '#live'}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2.5 rounded-full bg-ink px-7 py-4 text-sm font-semibold text-paper transition-colors hover:bg-ink/85"
                                >
                                    <span className="h-2 w-2 animate-pulse rounded-full bg-leaf" /> Open the live token board <FiArrowUpRight />
                                </a>
                            </Magnetic>
                        </Reveal>
                        <LiveReceipt info={info} board={board} />
                    </div>
                </section>

                {/* ---------- FAQ ---------- */}
                <section id="faq" className="scroll-mt-16">
                    <div className="mx-auto grid max-w-7xl gap-12 px-5 py-28 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
                        <Reveal>
                            <p className="font-code text-xs uppercase tracking-[0.3em] text-saffron-deep">Questions</p>
                            <h2 className="mt-4 font-display text-4xl font-bold tracking-[-0.03em] sm:text-6xl">Good to know</h2>
                        </Reveal>
                        <Reveal delay={100}>
                            <ul className="border-t border-ink/15">
                                {FAQS.map((faq, index) => {
                                    const open = openFaq === index;
                                    return (
                                        <li key={faq.q} className="border-b border-ink/15">
                                            <button
                                                type="button"
                                                onClick={() => setOpenFaq(open ? -1 : index)}
                                                className="group flex w-full items-center justify-between gap-6 py-6 text-left font-display text-xl font-semibold tracking-tight"
                                                aria-expanded={open}
                                            >
                                                {faq.q}
                                                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${open ? 'bg-ink text-paper' : 'ring-1 ring-ink/15 group-hover:bg-ink/5'}`}>
                                                    {open ? <FiMinus /> : <FiPlus />}
                                                </span>
                                            </button>
                                            <div className={`grid transition-all duration-500 ease-out ${open ? 'grid-rows-[1fr] pb-6 opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                                <p className="overflow-hidden pr-14 leading-relaxed text-ink/65">{faq.a}</p>
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
                    <div className="grain relative overflow-hidden rounded-[36px] bg-ink px-6 py-28 text-center text-paper sm:py-36">
                        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[460px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-saffron/25 blur-[130px]" />
                        <MaskReveal
                            className="relative mx-auto max-w-5xl font-display text-[clamp(3rem,9vw,7.5rem)] font-extrabold leading-[0.88] tracking-[-0.05em]"
                            lines={[
                                'Ready for the',
                                <span key="accent" className="font-accent font-normal italic text-saffron">next rush hour?</span>,
                            ]}
                        />
                        <Reveal delay={250} className="relative">
                            <p className="mx-auto mt-8 max-w-lg text-stone-400">
                                See QuickBite running on your own menu. Set up in an afternoon, with no new hardware beyond a receipt printer.
                            </p>
                            <div className="mt-11 flex flex-wrap justify-center gap-3">
                                <Magnetic>
                                    <a {...demoLinkProps} className="inline-flex items-center gap-2 rounded-full bg-saffron px-9 py-5 font-bold text-ink transition-colors hover:bg-paper">
                                        Book a demo <FiArrowUpRight />
                                    </a>
                                </Magnetic>
                                <Link to="/signin" className="inline-flex items-center gap-2 rounded-full border border-paper/15 px-9 py-5 font-semibold transition-colors hover:border-paper/40">
                                    Staff sign in
                                </Link>
                            </div>
                        </Reveal>
                    </div>
                </section>
            </main>

            {/* ---------- Footer ---------- */}
            <footer className="overflow-hidden">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-5 pt-16 text-sm text-ink/55 sm:px-8">
                    <p className="flex items-center gap-2.5">
                        <Logo size="h-7 w-7 text-xs" /> © {new Date().getFullYear()} QuickBite
                    </p>
                    <div className="flex flex-wrap items-center gap-6">
                        {NAV_LINKS.map((link) => (
                            <a key={link.id} href={`#${link.id}`} onClick={scrollTo(link.id)} className="hover:text-ink">{link.label}</a>
                        ))}
                        <Link to="/signin" className="hover:text-ink">Sign in</Link>
                    </div>
                </div>
                {/* Giant wordmark, cropped by the bottom edge of the page */}
                <p className="-mb-[0.05em] mt-10 select-none whitespace-nowrap text-center font-display text-[clamp(4rem,20vw,18rem)] font-extrabold leading-[0.8] tracking-[-0.05em] text-ink" aria-hidden="true">
                    QuickBite
                </p>
            </footer>
        </div>
    );
}
