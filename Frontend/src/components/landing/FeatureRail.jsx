import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { QRCodeSVG } from 'qrcode.react';
import { FiArrowRight, FiRepeat } from 'react-icons/fi';
import { prefersReducedMotion, useMediaQuery, useScrollProgress } from './hooks';
import Reveal from './Reveal';

/* ---------- Small product illustrations ---------- */

const keyClass = 'rounded-lg border border-ink/15 bg-white px-2.5 py-1.5 font-code text-xs font-semibold text-ink shadow-[0_2px_0_rgba(15,14,12,0.12)]';

const visuals = {
    keys: (
        <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
            <kbd className={keyClass}>masala d</kbd> Enter <FiArrowRight />
            <kbd className={keyClass}>Ctrl + Enter</kbd>
            <span className="rounded-full bg-leaf/15 px-2.5 py-1 font-semibold text-emerald-800">Token 42</span>
        </div>
    ),
    tokens: (
        <div className="grid grid-cols-3 gap-2">
            {[38, 39, 41].map((token, index) => (
                <span key={token} className={`rounded-xl py-3 text-center font-display text-2xl font-extrabold ${index === 2 ? 'bg-leaf text-ink' : 'bg-white/10 text-stone-300'}`}>
                    {token}
                </span>
            ))}
        </div>
    ),
    ticket: (
        <div className="rounded-2xl bg-white p-4 ring-1 ring-ink/10">
            <div className="flex items-center justify-between">
                <span className="font-display text-2xl font-extrabold">#57</span>
                <span className="rounded-md bg-turmeric px-2 py-0.5 font-code text-xs font-bold">6:42</span>
            </div>
            <p className="mt-2 flex justify-between text-sm"><span>Ghee Podi Dosa</span><span className="font-semibold text-saffron-deep">× 2</span></p>
        </div>
    ),
    whatsapp: (
        <div className="ml-auto max-w-[90%] rounded-2xl rounded-tr-sm bg-[#d9fdd3] px-3.5 py-2.5 text-sm text-stone-800">
            🧾 Token <b>#42</b> · ₹190.00
            <span className="block text-xs text-stone-500">Show this at the counter · ✓✓</span>
        </div>
    ),
    upi: (
        <div className="flex items-center gap-4">
            <span className="rounded-2xl bg-white p-2.5 ring-1 ring-ink/10"><QRCodeSVG value="upi://pay?pa=yourhotel@upi&am=190" size={84} /></span>
            <span className="font-code text-xs leading-relaxed text-stone-500">₹190.00<br />exact amount<br /><b className="text-ink">0% fee</b></span>
        </div>
    ),
    dashboard: (
        <div className="flex h-24 items-end gap-1.5">
            {[22, 38, 64, 100, 58, 30, 26, 44, 72, 50, 34, 18].map((height, index) => (
                <span key={index} className={`flex-1 rounded-t-[4px] ${height === 100 ? 'bg-ink' : 'bg-ink/20'}`} style={{ height: `${height}%` }} />
            ))}
        </div>
    ),
    regular: (
        <div className="rounded-2xl bg-white p-3.5 text-sm ring-1 ring-ink/10">
            <p className="font-code text-stone-500">98765▍</p>
            <div className="mt-2 flex items-center justify-between gap-2">
                <span><b>Ravi</b> <span className="text-stone-500">· 23 visits</span></span>
                <span className="inline-flex items-center gap-1 rounded-full bg-saffron/10 px-2.5 py-1 text-xs font-bold text-saffron-deep"><FiRepeat /> Repeat</span>
            </div>
        </div>
    ),
    receipt: (
        <div className="mx-auto w-40 -rotate-3 bg-white px-4 pb-1 pt-3 font-code text-[10px] leading-relaxed text-ink shadow-lg">
            <p className="text-center font-bold">TAX INVOICE</p>
            <p className="mt-1 border-t border-dashed border-ink/40 pt-1 text-center text-[9px] tracking-widest">TOKEN</p>
            <p className="text-center text-2xl font-black">#42</p>
            <p className="flex justify-between border-t border-dashed border-ink/40 pt-1"><span>TOTAL</span><span>₹190</span></p>
        </div>
    ),
};

const FEATURES = [
    { title: 'Bills in seconds', text: 'Type a few letters, press Enter, then Ctrl+Enter. Popular dishes are one tap away.', visual: 'keys' },
    { title: 'Tokens, not chaos', text: 'A token TV in the dining hall tells every customer when and where to collect.', visual: 'tokens', dark: true },
    { title: 'Kitchen screens', text: 'Each food counter sees only its own tickets, with timers that flag a delay.', visual: 'ticket' },
    { title: 'Bills on WhatsApp', text: 'Paperless bills for anyone who shares their number - less paper, more repeat visits.', visual: 'whatsapp' },
    { title: 'Zero-fee UPI', text: 'An exact-amount QR that pays straight into the owner’s account. No gateway, no 2% cut.', visual: 'upi' },
    { title: 'Live owner dashboard', text: 'Sales against last week, cash against UPI, busiest hours, slowest counter.', visual: 'dashboard', accent: true },
    { title: 'Remembers regulars', text: 'Five digits find a regular. One tap repeats their usual order.', visual: 'regular' },
    { title: 'Thermal printing', text: 'GST bills and per-counter token slips on 80mm or 58mm rolls, printed on confirm.', visual: 'receipt' },
];

const cardTone = (feature) => {
    if (feature.dark) return 'bg-ink text-paper';
    if (feature.accent) return 'bg-saffron text-ink';
    return 'bg-white text-ink ring-1 ring-ink/5';
};

const FeatureCard = ({ feature, index }) => (
    <article className={`flex h-[400px] w-[82vw] max-w-[380px] shrink-0 snap-start flex-col justify-between rounded-[30px] p-7 sm:h-[430px] ${cardTone(feature)}`}>
        <div>
            <p className={`font-code text-xs ${feature.dark ? 'text-stone-500' : 'text-ink/50'}`}>{String(index + 1).padStart(2, '0')} / {String(FEATURES.length).padStart(2, '0')}</p>
            <h3 className="mt-6 font-display text-3xl font-semibold leading-[1.05] tracking-[-0.02em]">{feature.title}</h3>
            <p className={`mt-3 leading-relaxed ${feature.dark ? 'text-stone-400' : 'text-ink/65'}`}>{feature.text}</p>
        </div>
        <div>{visuals[feature.visual]}</div>
    </article>
);

FeatureCard.propTypes = {
    feature: PropTypes.shape({
        title: PropTypes.string.isRequired,
        text: PropTypes.string.isRequired,
        visual: PropTypes.string.isRequired,
        dark: PropTypes.bool,
        accent: PropTypes.bool,
    }).isRequired,
    index: PropTypes.number.isRequired,
};

const Heading = () => (
    <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
            <p className="font-code text-xs uppercase tracking-[0.3em] text-saffron-deep">The product</p>
            <h2 className="mt-4 max-w-2xl font-display text-4xl font-bold leading-[1.02] tracking-[-0.03em] sm:text-6xl">
                Everything the counter needs. <span className="font-accent font-normal italic">Nothing it doesn’t.</span>
            </h2>
        </div>
        <p className="max-w-xs text-ink/60">Built for tiffin rooms and quick-service restaurants - the 8 AM rush and the 1 PM crowd.</p>
    </div>
);

/**
 * Feature cards that slide sideways as you scroll down (large screens),
 * or a swipeable row (phones, reduced motion).
 */
const FeatureRail = () => {
    const sectionRef = useRef(null);
    const trackRef = useRef(null);
    const [travel, setTravel] = useState(0);
    const large = useMediaQuery('(min-width: 1024px)');
    const pinned = large && !prefersReducedMotion();

    useEffect(() => {
        if (!pinned) return undefined;
        const measure = () => {
            const track = trackRef.current;
            if (track) setTravel(Math.max(0, track.scrollWidth - window.innerWidth));
        };
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, [pinned]);

    useScrollProgress(sectionRef, (progress) => {
        if (trackRef.current) trackRef.current.style.transform = `translate3d(${-progress * travel}px, 0, 0)`;
    }, 'pin', pinned);

    if (!pinned) {
        return (
            <section id="features" className="scroll-mt-16 py-24 sm:py-32">
                <Reveal className="mx-auto max-w-7xl px-5 sm:px-8"><Heading /></Reveal>
                <div className="mt-12 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-4 sm:scroll-px-8 [scrollbar-width:none] sm:px-8">
                    {FEATURES.map((feature, index) => <FeatureCard key={feature.title} feature={feature} index={index} />)}
                </div>
            </section>
        );
    }

    return (
        <section id="features" ref={sectionRef} className="relative" style={{ height: `calc(100vh + ${travel}px)` }}>
            <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
                <div className="mx-auto w-full max-w-7xl px-10"><Heading /></div>
                <div
                    ref={trackRef}
                    className="mt-14 flex w-max gap-5 pr-10 will-change-transform"
                    style={{ paddingLeft: 'max(2.5rem, calc((100vw - 80rem) / 2 + 2.5rem))' }}
                >
                    {FEATURES.map((feature, index) => <FeatureCard key={feature.title} feature={feature} index={index} />)}
                </div>
            </div>
        </section>
    );
};

export default FeatureRail;
