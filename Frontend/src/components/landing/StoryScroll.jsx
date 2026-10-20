import { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { prefersReducedMotion, useMediaQuery, useScrollProgress } from './hooks';
import Reveal from './Reveal';
import { BillScene, PrintScene, KitchenScene, CallScene, WhatsAppScene, DashboardScene } from './StoryVisuals';

const TOTAL_SECONDS = 90;

const STEPS = [
    { at: 0, label: 'Bill', title: 'Two keys. One bill.', text: 'The cashier types “masala d”, presses Enter, then Ctrl+Enter. Popular dishes are a single tap.', Scene: BillScene },
    { at: 6, label: 'Print', title: 'The token prints itself.', text: 'A GST bill and a slip for every food counter roll out of the thermal printer the moment the order is confirmed.', Scene: PrintScene },
    { at: 9, label: 'Kitchen', title: 'Each counter sees its own ticket.', text: 'The dosa counter only sees dosas. Timers turn amber, then red, when an order waits too long.', Scene: KitchenScene },
    { at: 68, label: 'Call', title: 'The TV calls the number.', text: 'The cook taps Ready and token 42 lights up on the screen in the dining hall. Nobody has to shout.', Scene: CallScene },
    { at: 70, label: 'WhatsApp', title: 'The bill is already in their pocket.', text: 'Customers who share their number get the bill on WhatsApp, and are recognised on their next visit.', Scene: WhatsAppScene },
    { at: 75, label: 'Owner', title: 'The owner sees every rupee.', text: 'Sales against last week, cash against UPI, the busiest hour and the slowest counter. Live, on their phone.', Scene: DashboardScene },
];

const formatClock = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

const StoryHeading = () => (
    <>
        <p className="font-code text-xs uppercase tracking-[0.3em] text-saffron">One order · ninety seconds</p>
        <h2 className="mt-4 max-w-xl font-display text-4xl font-bold leading-[1.02] tracking-[-0.03em] sm:text-5xl">
            From the counter to the plate, <span className="font-accent font-normal italic text-saffron">without the shouting.</span>
        </h2>
    </>
);

/**
 * Pinned scroll story on large screens: scrolling runs a clock and plays each scene in turn.
 * On phones (and with reduced motion) the same scenes are shown one after another.
 */
const StoryScroll = ({ hotelName }) => {
    const sectionRef = useRef(null);
    const clockRef = useRef(null);
    const barRef = useRef(null);
    const [active, setActive] = useState(0);
    const large = useMediaQuery('(min-width: 1024px)');
    const pinned = large && !prefersReducedMotion();
    const name = hotelName || 'Sri Ganesh Restaurant';

    useScrollProgress(sectionRef, (progress) => {
        const position = Math.min(progress * STEPS.length, STEPS.length - 0.0001);
        const index = Math.floor(position);
        const from = STEPS[index].at;
        const to = STEPS[index + 1]?.at ?? TOTAL_SECONDS;
        if (clockRef.current) clockRef.current.textContent = formatClock(Math.round(from + (to - from) * (position - index)));
        if (barRef.current) barRef.current.style.transform = `scaleY(${progress})`;
        setActive(index);
    }, 'pin', pinned);

    const jumpTo = (index) => {
        const section = sectionRef.current;
        if (!section) return;
        const travel = section.offsetHeight - window.innerHeight;
        window.scrollTo({ top: section.offsetTop + ((index + 0.5) / STEPS.length) * travel });
    };

    if (!pinned) {
        return (
            <section id="how" className="grain relative scroll-mt-16 overflow-hidden bg-ink py-24 text-paper sm:py-32">
                <div className="relative mx-auto max-w-3xl px-5 sm:px-8">
                    <Reveal><StoryHeading /></Reveal>
                    <ol className="mt-14 space-y-16">
                        {STEPS.map((step) => (
                            <Reveal as="li" key={step.label}>
                                <p className="font-code text-sm tabular-nums text-saffron">{formatClock(step.at)}</p>
                                <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight">{step.title}</h3>
                                <p className="mt-2 leading-relaxed text-stone-400">{step.text}</p>
                                <div className="is-active mt-6 h-[400px] overflow-hidden rounded-[28px] bg-white/[0.03] ring-1 ring-white/10">
                                    <step.Scene hotelName={name} />
                                </div>
                            </Reveal>
                        ))}
                    </ol>
                </div>
            </section>
        );
    }

    return (
        <section
            id="how"
            ref={sectionRef}
            className="grain relative bg-ink text-paper"
            style={{ height: `${STEPS.length * 85 + 100}vh` }}
        >
            <div className="sticky top-0 flex h-screen items-center overflow-hidden">
                <div className="absolute inset-y-0 left-0 w-1 bg-white/5" aria-hidden="true">
                    <div ref={barRef} className="h-full origin-top bg-saffron" style={{ transform: 'scaleY(0)' }} />
                </div>

                <div className="relative mx-auto grid w-full max-w-7xl grid-cols-[0.95fr_1.05fr] items-center gap-16 px-10">
                    <div>
                        <StoryHeading />

                        <p ref={clockRef} className="mt-10 font-code text-[6.5rem] font-bold leading-none tracking-[-0.04em] tabular-nums text-paper xl:text-[8rem]" aria-hidden="true">
                            00:00
                        </p>

                        <ol className="mt-8 flex flex-wrap gap-2">
                            {STEPS.map((step, index) => (
                                <li key={step.label}>
                                    <button
                                        type="button"
                                        onClick={() => jumpTo(index)}
                                        className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                                            index === active ? 'bg-paper text-ink' : 'text-stone-400 ring-1 ring-white/10 hover:text-paper'
                                        }`}
                                        aria-current={index === active ? 'step' : undefined}
                                    >
                                        {step.label}
                                    </button>
                                </li>
                            ))}
                        </ol>

                        <div className="relative mt-8 min-h-[8.5rem]">
                            {STEPS.map((step, index) => (
                                <div key={step.label} className={`story-copy absolute inset-0 ${index === active ? 'is-active' : ''}`} aria-hidden={index !== active}>
                                    <h3 className="font-display text-3xl font-semibold tracking-tight">{step.title}</h3>
                                    <p className="mt-3 max-w-md text-lg leading-relaxed text-stone-400">{step.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="relative aspect-[1/0.92] overflow-hidden rounded-[32px] bg-white/[0.03] ring-1 ring-white/10" aria-hidden="true">
                        {STEPS.map((step, index) => (
                            <div key={step.label} className={`story-layer absolute inset-0 ${index === active ? 'is-active' : ''}`}>
                                <step.Scene hotelName={name} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

StoryScroll.propTypes = {
    hotelName: PropTypes.string,
};

export default StoryScroll;
