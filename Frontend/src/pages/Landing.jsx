import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import {
    PiArrowUpRightBold, PiPlayFill, PiPlusBold, PiMinusBold, PiClockDuotone, PiMapPinDuotone, PiCheckCircleFill,
    PiStorefrontDuotone, PiCookingPotDuotone, PiTelevisionSimpleDuotone, PiPrinterDuotone, PiWhatsappLogoDuotone,
    PiQrCodeDuotone, PiChartLineUpDuotone, PiUsersThreeDuotone, PiUserCircleCheckDuotone, PiBowlFoodDuotone,
    PiHandCoinsDuotone, PiPercentDuotone, PiCalendarCheckDuotone,
} from 'react-icons/pi';
import Reveal from '../components/landing/Reveal';
import TokenBoard from '../components/landing/TokenBoard';
import StoryScroll from '../components/landing/StoryScroll';
import LiveReceipt from '../components/landing/LiveReceipt';
import Magnetic from '../components/landing/Magnetic';
import HeroCards from '../components/landing/HeroCards';
import BrowserFrame from '../components/landing/BrowserFrame';
import FoodMarquee from '../components/landing/FoodMarquee';
import ProductTour from '../components/landing/ProductTour';
import { MaskReveal, ScrollWords } from '../components/landing/TextEffects';
import { prefersReducedMotion, useScrollProgress } from '../components/landing/hooks';
import { posApi } from '../utils/pos';
import { demoHref, demoIsExternal } from '../utils/sales';
import { useDemoLogin } from '../utils/useDemoLogin';

const demoLinkProps = { href: demoHref, ...(demoIsExternal && { target: '_blank', rel: 'noreferrer' }) };

const LIVE_REFRESH_MS = 15000;

const NAV_LINKS = [
    { id: 'product', label: 'Product' },
    { id: 'how', label: 'How it works' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'faq', label: 'FAQ' },
];

const HERO_POINTS = ['No commission', '₹0 fee on UPI', 'GST bills', 'Runs on any screen'];

const MANIFESTO = 'Every second at the counter is a customer waiting. QuickBite gives those seconds back to the cashier, the kitchen and the *hungry* *person* *in* *line.*';

const FACTS = [
    { value: '₹0', label: 'gateway fee on UPI', note: 'The QR pays straight into the owner’s own account.' },
    { value: '2', label: 'keys to bill an order', note: 'Enter adds the dish. Ctrl+Enter confirms it.' },
    { value: '1', label: 'tap to send the bill', note: 'On WhatsApp, to any number the customer shares.' },
    { value: 'Any', label: 'screen will do', note: 'Kitchen and token TV run in a browser. No new hardware.' },
];

const PROMISES = [
    { icon: PiHandCoinsDuotone, title: 'No commission', text: 'Your sales stay yours, however busy you get.' },
    { icon: PiPercentDuotone, title: '₹0 fee on UPI', text: 'The QR pays straight into your own account.' },
    { icon: PiCalendarCheckDuotone, title: 'Monthly or yearly', text: 'One flat fee per outlet, whichever suits you.' },
];

const INCLUDED = [
    { icon: PiStorefrontDuotone, label: 'Billing counter with dish photos' },
    { icon: PiCookingPotDuotone, label: 'A kitchen screen for every counter' },
    { icon: PiTelevisionSimpleDuotone, label: 'Token TV for the dining hall' },
    { icon: PiPrinterDuotone, label: 'GST bills and token slips on thermal printers' },
    { icon: PiWhatsappLogoDuotone, label: 'Bills on WhatsApp' },
    { icon: PiQrCodeDuotone, label: 'Exact-amount UPI QR' },
    { icon: PiChartLineUpDuotone, label: 'Live owner dashboard on your phone' },
    { icon: PiUsersThreeDuotone, label: 'Logins for every cashier' },
    { icon: PiUserCircleCheckDuotone, label: 'Remembers regular customers' },
    { icon: PiBowlFoodDuotone, label: 'Sold-out switch for any dish' },
];

const FAQS = [
    {
        q: 'What do I need to run it?',
        a: 'Any computer, tablet or phone with Chrome, plus an 80mm or 58mm thermal receipt printer for token slips. Kitchen screens and the token TV run on any spare screen with a browser.',
    },
    {
        q: 'How much does it cost?',
        a: 'One flat fee per outlet, paid monthly or yearly, quoted for your restaurant on a short call. There is no commission on orders and no fee on UPI payments. You can try the live demo right now, free.',
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
        a: 'The owner dashboard is live on your phone: sales against the same time last week, cash against UPI, the busiest hours, the slowest counter, top dishes and a cash drawer check.',
    },
];

const scrollTo = (id) => (event) => {
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView({ block: 'start' });
};

const Logo = ({ size = 'h-9 w-9 text-[17px]' }) => (
    <span className={`flex items-center justify-center rounded-xl bg-saffron font-display font-extrabold text-ink ${size}`}>Q</span>
);

Logo.propTypes = { size: PropTypes.string };

/** "Try the live demo": opens the sample restaurant as its owner, in one click */
const DemoButton = ({ demo, className }) => (
    <button type="button" onClick={() => demo.openDemo('admin')} disabled={Boolean(demo.demoRole)} className={className}>
        <PiPlayFill className="text-saffron" />
        {demo.demoRole ? (demo.waking ? 'Waking up the demo…' : 'Opening the demo…') : 'Try the live demo'}
    </button>
);

DemoButton.propTypes = {
    demo: PropTypes.shape({ openDemo: PropTypes.func, demoRole: PropTypes.string, waking: PropTypes.bool }).isRequired,
    className: PropTypes.string,
};

/** The counter screenshot, tilted back, that settles flat as it scrolls into view */
const CounterShowcase = () => {
    const sectionRef = useRef(null);
    const frameRef = useRef(null);

    useScrollProgress(sectionRef, (progress) => {
        const settled = Math.min(1, progress / 0.42);
        if (frameRef.current) {
            frameRef.current.style.transform = `perspective(1800px) rotateX(${((1 - settled) * 14).toFixed(2)}deg) scale(${(0.93 + settled * 0.07).toFixed(3)})`;
        }
    }, 'pass', !prefersReducedMotion());

    return (
        <section ref={sectionRef} className="relative pb-20 sm:pb-28" aria-labelledby="counter-heading">
            <div className="grain absolute inset-x-0 top-0 h-[62%] bg-ink sm:h-[58%]" aria-hidden="true" />
            <div className="relative mx-auto max-w-6xl px-4 pt-4 sm:px-8">
                <Reveal className="mx-auto max-w-2xl text-center text-paper">
                    <p className="font-code text-xs uppercase tracking-[0.3em] text-saffron">The counter</p>
                    <h2 id="counter-heading" className="mt-4 font-display text-4xl font-bold leading-[1.02] tracking-[-0.03em] sm:text-6xl">
                        Tap the dish. Take the money. <span className="font-accent font-normal italic text-saffron">Next.</span>
                    </h2>
                    <p className="mx-auto mt-5 max-w-lg text-lg leading-relaxed text-stone-400">
                        Big photos, two-key billing and the change worked out for you. Built for the 8 AM rush.
                    </p>
                </Reveal>
                <div ref={frameRef} className="mt-12 origin-top will-change-transform sm:mt-16">
                    <BrowserFrame
                        src="/screens/counter.webp"
                        alt="The QuickBite counter: dish photos on the left, the current order with a regular customer and UPI payment on the right"
                    />
                </div>
            </div>
        </section>
    );
};

export default function Landing() {
    const [info, setInfo] = useState(null);
    const [board, setBoard] = useState(null);
    const [scrolled, setScrolled] = useState(false);
    const [openFaq, setOpenFaq] = useState(0);
    const progressRef = useRef(null);
    const demo = useDemoLogin();

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
                                className={`rounded-full px-4 py-2 transition-colors ${scrolled ? 'text-ink/60 hover:bg-ink/5 hover:text-ink' : 'text-paper/70 hover:text-paper'}`}
                            >
                                {link.label}
                            </a>
                        ))}
                    </nav>
                    <div className="ml-auto flex items-center gap-2 md:ml-4">
                        <Link
                            to="/signin"
                            className={`hidden rounded-full px-4 py-2 text-sm font-semibold transition-colors sm:block ${scrolled ? 'text-ink/70 hover:text-ink' : 'text-paper/80 hover:text-paper'}`}
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
                {/* A dosa on a dark table, with the words on the dark side of the photo */}
                <section className="grain relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-ink text-paper">
                    <img
                        src="/food/hero-dosa.webp"
                        alt=""
                        width={1920}
                        height={1080}
                        fetchPriority="high"
                        className="absolute inset-0 -z-20 h-[58svh] w-full object-cover object-[72%_50%] lg:h-full lg:object-[62%_50%]"
                    />
                    <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink from-45% via-ink/70 via-60% to-ink/10 lg:bg-gradient-to-r lg:from-ink lg:from-20% lg:via-ink/75 lg:via-45% lg:to-ink/5" aria-hidden="true" />
                    <div className="absolute inset-x-0 bottom-0 -z-10 hidden h-48 bg-gradient-to-t from-ink to-transparent lg:block" aria-hidden="true" />

                    <div className="relative mx-auto grid w-full max-w-7xl flex-1 items-end gap-10 px-5 pb-16 pt-[40svh] sm:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:pb-20 lg:pt-32">
                        <div>
                            <Reveal>
                                <span className="inline-flex items-center gap-2 rounded-full border border-paper/15 bg-ink/40 px-3.5 py-1.5 font-code text-[11px] uppercase tracking-[0.18em] text-stone-200 backdrop-blur">
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-leaf" />
                                    {restaurant?.name ? `Live at ${restaurant.name}` : 'Counter billing & tokens'}
                                </span>
                            </Reveal>

                            <MaskReveal
                                as="h1"
                                delay={120}
                                className="mt-7 font-display text-[clamp(3.3rem,10.5vw,7.6rem)] font-extrabold leading-[0.86] tracking-[-0.045em]"
                                lines={[
                                    'Rush hour,',
                                    <span key="accent" className="font-accent text-[1.08em] font-normal italic tracking-[-0.03em] text-saffron">handled.</span>,
                                ]}
                            />

                            <Reveal delay={350}>
                                <p className="mt-7 max-w-lg text-lg leading-relaxed text-stone-300 sm:text-xl">
                                    The counter billing and token system for busy restaurants. Bills in seconds, tokens on the TV,
                                    receipts on WhatsApp and every rupee on one live dashboard.
                                </p>
                                <div className="mt-9 flex flex-wrap items-center gap-3">
                                    <Magnetic>
                                        <a {...demoLinkProps} className="group inline-flex items-center gap-2 rounded-full bg-saffron px-7 py-4 text-sm font-bold text-ink shadow-[0_18px_40px_-14px_rgba(255,90,31,0.8)] transition-colors hover:bg-paper">
                                            Book a demo <PiArrowUpRightBold className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                                        </a>
                                    </Magnetic>
                                    <DemoButton
                                        demo={demo}
                                        className="inline-flex items-center gap-2.5 rounded-full border border-paper/20 bg-ink/30 px-7 py-4 text-sm font-semibold backdrop-blur transition-colors hover:border-paper/50 disabled:opacity-70"
                                    />
                                </div>
                                {demo.demoError && <p role="alert" className="mt-4 max-w-md text-sm font-medium text-rose-300">{demo.demoError}</p>}
                                <ul className="mt-9 flex flex-wrap gap-x-5 gap-y-2 text-sm text-stone-300">
                                    {HERO_POINTS.map((point) => (
                                        <li key={point} className="flex items-center gap-1.5">
                                            <PiCheckCircleFill className="text-base text-leaf" /> {point}
                                        </li>
                                    ))}
                                </ul>
                            </Reveal>
                        </div>

                        <div className="hidden lg:block">
                            <HeroCards />
                        </div>
                    </div>
                </section>

                {/* ---------- The counter ---------- */}
                <CounterShowcase />

                {/* ---------- Dish photos ---------- */}
                <FoodMarquee />

                {/* ---------- Manifesto ---------- */}
                <section className="mx-auto max-w-6xl px-5 pb-32 pt-8 sm:px-8 lg:pb-44">
                    <ScrollWords
                        text={MANIFESTO}
                        className="font-display text-[clamp(2rem,5.2vw,4.4rem)] font-semibold leading-[1.08] tracking-[-0.035em]"
                    />
                </section>

                {/* ---------- Every screen ---------- */}
                <div className="bg-paper-deep">
                    <ProductTour />
                </div>

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

                {/* ---------- Live from the counter ---------- */}
                <section id="live" className="scroll-mt-16 bg-paper-deep">
                    <div className="mx-auto grid max-w-7xl items-center gap-16 px-5 py-28 sm:px-8 lg:grid-cols-[1fr_0.9fr] lg:py-36">
                        <Reveal>
                            <p className="font-code text-xs uppercase tracking-[0.3em] text-saffron-deep">Live from the counter</p>
                            <h2 className="mt-4 font-display text-4xl font-bold leading-[1.02] tracking-[-0.03em] sm:text-6xl">
                                Not a mock-up. <span className="font-accent font-normal italic">A real counter.</span>
                            </h2>
                            <p className="mt-6 max-w-md text-lg leading-relaxed text-ink/60">
                                The menu, prices and tokens here come straight from {restaurant?.name || 'the restaurant'}&apos;s counter,
                                refreshed every few seconds.
                            </p>
                            {restaurant && (restaurant.hours || restaurant.address) && (
                                <div className="mt-6 space-y-2 text-ink/70">
                                    {restaurant.hours && <p className="flex items-center gap-2"><PiClockDuotone className="text-lg text-saffron-deep" /> {restaurant.hours}</p>}
                                    {restaurant.address && <p className="flex items-center gap-2"><PiMapPinDuotone className="text-lg text-saffron-deep" /> {restaurant.address}</p>}
                                </div>
                            )}
                            <div className="mt-10">
                                <TokenBoard board={board} restaurantName={restaurant?.name} />
                            </div>
                            <a
                                href={restaurant?.slug ? `/tv/${restaurant.slug}` : '#live'}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-ink underline decoration-ink/25 underline-offset-4 transition-colors hover:decoration-ink"
                            >
                                Open the full-screen token TV <PiArrowUpRightBold />
                            </a>
                        </Reveal>
                        <LiveReceipt info={info} board={board} />
                    </div>
                </section>

                {/* ---------- Pricing ---------- */}
                <section id="pricing" className="scroll-mt-16">
                    <div className="mx-auto max-w-7xl px-5 pb-24 pt-28 sm:px-8 lg:pb-28 lg:pt-36">
                        <Reveal className="max-w-3xl">
                            <p className="font-code text-xs uppercase tracking-[0.3em] text-saffron-deep">Pricing</p>
                            <h2 className="mt-4 font-display text-4xl font-bold leading-[1.02] tracking-[-0.03em] sm:text-6xl">
                                One flat fee. <span className="font-accent font-normal italic">No cut of your sales.</span>
                            </h2>
                            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink/60">
                                Pay per outlet, monthly or yearly. No commission on orders, no fee on UPI and no new hardware beyond a receipt printer.
                            </p>
                        </Reveal>

                        <Reveal delay={120} className="mt-14 grid overflow-hidden rounded-[32px] bg-white shadow-[0_40px_90px_-50px_rgba(15,14,12,0.5)] ring-1 ring-ink/10 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
                            <div className="grain relative isolate flex flex-col overflow-hidden bg-ink p-7 text-paper sm:p-10">
                                <img src="/food/spread.webp" alt="" width={1600} height={1200} loading="lazy" decoding="async" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-30" />
                                <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink/60 via-ink/85 to-ink" aria-hidden="true" />
                                <p className="font-code text-xs uppercase tracking-[0.25em] text-saffron">QuickBite for your outlet</p>
                                <p className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-[-0.03em] sm:text-5xl">
                                    One plan.<br /><span className="font-accent font-normal italic text-saffron">Everything included.</span>
                                </p>
                                <ul className="mt-9 space-y-5">
                                    {PROMISES.map((promise) => {
                                        const Icon = promise.icon;
                                        return (
                                            <li key={promise.title} className="flex gap-4">
                                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-xl text-saffron ring-1 ring-white/10">
                                                    <Icon />
                                                </span>
                                                <span>
                                                    <span className="block font-semibold">{promise.title}</span>
                                                    <span className="block text-sm text-stone-400">{promise.text}</span>
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                                <div className="mt-10 flex flex-wrap gap-3 lg:mt-auto lg:pt-10">
                                    <a {...demoLinkProps} className="inline-flex items-center gap-2 rounded-full bg-saffron px-6 py-3.5 text-sm font-bold text-ink transition-colors hover:bg-paper">
                                        Get your price <PiArrowUpRightBold />
                                    </a>
                                    <DemoButton
                                        demo={demo}
                                        className="inline-flex items-center gap-2.5 rounded-full border border-paper/20 px-6 py-3.5 text-sm font-semibold transition-colors hover:border-paper/50 disabled:opacity-70"
                                    />
                                </div>
                            </div>

                            <div className="p-7 sm:p-10">
                                <p className="font-display text-xl font-bold tracking-tight">Everything included</p>
                                <p className="mt-1 text-sm text-ink/55">Every screen and feature, for every cashier at the outlet.</p>
                                <ul className="mt-7 grid gap-x-6 gap-y-1 sm:grid-cols-2">
                                    {INCLUDED.map((feature) => {
                                        const Icon = feature.icon;
                                        return (
                                            <li key={feature.label} className="flex items-center gap-3 border-b border-ink/[0.07] py-3.5 text-[15px] font-medium text-ink/80">
                                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-saffron/10 text-lg text-saffron-deep">
                                                    <Icon />
                                                </span>
                                                {feature.label}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </Reveal>
                    </div>
                </section>

                {/* ---------- FAQ ---------- */}
                <section id="faq" className="scroll-mt-16 border-t border-ink/10">
                    <div className="mx-auto grid max-w-7xl gap-12 px-5 py-28 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
                        <Reveal>
                            <p className="font-code text-xs uppercase tracking-[0.3em] text-saffron-deep">Questions</p>
                            <h2 className="mt-4 font-display text-4xl font-bold tracking-[-0.03em] sm:text-6xl">Good to know</h2>
                            {demoIsExternal && (
                                <p className="mt-5 max-w-sm text-ink/60">
                                    Anything else? <a {...demoLinkProps} className="font-semibold text-ink underline decoration-ink/25 underline-offset-4 hover:decoration-ink">Ask us on WhatsApp</a>.
                                </p>
                            )}
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
                                                    {open ? <PiMinusBold /> : <PiPlusBold />}
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
                    <div className="grain relative isolate overflow-hidden rounded-[36px] bg-ink px-6 py-28 text-center text-paper sm:py-36">
                        <img src="/food/hero-breakfast.webp" alt="" width={1600} height={1000} loading="lazy" decoding="async" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-70" />
                        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(15,14,12,0.5),rgba(15,14,12,0.9)_80%)]" aria-hidden="true" />
                        <MaskReveal
                            className="relative mx-auto max-w-5xl font-display text-[clamp(3rem,9vw,7.5rem)] font-extrabold leading-[0.88] tracking-[-0.05em]"
                            lines={[
                                'Ready for the',
                                <span key="accent" className="font-accent font-normal italic text-saffron">next rush hour?</span>,
                            ]}
                        />
                        <Reveal delay={250} className="relative">
                            <p className="mx-auto mt-8 max-w-lg text-lg text-stone-300">
                                See QuickBite running on your own menu. Set up in an afternoon, with no new hardware beyond a receipt printer.
                            </p>
                            <div className="mt-11 flex flex-wrap justify-center gap-3">
                                <Magnetic>
                                    <a {...demoLinkProps} className="inline-flex items-center gap-2 rounded-full bg-saffron px-9 py-5 font-bold text-ink transition-colors hover:bg-paper">
                                        Book a demo <PiArrowUpRightBold />
                                    </a>
                                </Magnetic>
                                <DemoButton
                                    demo={demo}
                                    className="inline-flex items-center gap-2.5 rounded-full border border-paper/20 bg-ink/30 px-9 py-5 font-semibold backdrop-blur transition-colors hover:border-paper/50 disabled:opacity-70"
                                />
                            </div>
                            {demo.demoError && <p role="alert" className="mx-auto mt-4 max-w-md text-sm font-medium text-rose-300">{demo.demoError}</p>}
                        </Reveal>
                    </div>
                </section>
            </main>

            {/* ---------- Footer ---------- */}
            <footer className="overflow-hidden">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-5 pt-16 text-sm text-ink/55 sm:px-8">
                    <p className="flex items-center gap-2.5">
                        <Logo size="h-7 w-7 text-sm" /> © {new Date().getFullYear()} QuickBite
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
