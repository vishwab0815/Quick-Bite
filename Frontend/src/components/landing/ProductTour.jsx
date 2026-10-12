import { useRef, useState } from 'react';
import {
    PiStorefrontDuotone, PiCookingPotDuotone, PiTelevisionSimpleDuotone, PiChartLineUpDuotone, PiBowlFoodDuotone, PiCheckCircleFill,
} from 'react-icons/pi';
import BrowserFrame from './BrowserFrame';
import Reveal from './Reveal';

const TABS = [
    {
        id: 'counter',
        label: 'Counter',
        icon: PiStorefrontDuotone,
        title: 'A bill in two keys.',
        text: 'Type a few letters or tap the photo. Ctrl+Enter charges it, and the token prints with the bill.',
        points: ['Regulars found from five digits of their number', 'Cash with change worked out, an exact-amount UPI QR, or card', 'The bill goes to WhatsApp in one tap'],
        src: '/screens/token.webp',
        url: 'quickbite.app/pos',
        alt: 'The counter after payment: token 57 with a button to send the bill on WhatsApp',
    },
    {
        id: 'kitchen',
        label: 'Kitchen',
        icon: PiCookingPotDuotone,
        title: 'Every counter sees its own tickets.',
        text: 'The dosa counter only sees dosas. Timers turn amber at five minutes and red at ten.',
        points: ['Tap Ready and the token TV calls the number', 'Scan the token slip to mark it served', 'A chime for every new ticket'],
        src: '/screens/kitchen.webp',
        url: 'quickbite.app/pos/kitchen',
        alt: 'Kitchen screen with tickets being prepared and tokens ready for pickup',
    },
    {
        id: 'tv',
        label: 'Token TV',
        icon: PiTelevisionSimpleDuotone,
        title: 'The TV calls the number.',
        text: 'Any TV with a browser becomes a “Now serving” board for the dining hall. Nobody has to shout.',
        points: ['Big numbers you can read across the hall', 'Spoken announcements when a token is ready', 'Token numbers only - no names, no prices'],
        src: '/screens/tv.webp',
        url: 'quickbite.app/tv/your-restaurant',
        alt: 'Token TV showing tokens being prepared and tokens ready to collect',
    },
    {
        id: 'dashboard',
        label: 'Dashboard',
        icon: PiChartLineUpDuotone,
        title: 'Every rupee, live on your phone.',
        text: 'Sales against the same time last week, cash against UPI, the busiest hour and the slowest counter.',
        points: ['A cash drawer check at closing', 'Top dishes and plates sold', 'Only the owner can cancel a bill, with a reason'],
        src: '/screens/dashboard.webp',
        phone: '/screens/dashboard-phone.webp',
        url: 'quickbite.app/pos/bills',
        alt: 'Owner dashboard with sales, bills, average bill and sales by hour',
    },
    {
        id: 'menu',
        label: 'Menu',
        icon: PiBowlFoodDuotone,
        title: 'Your menu, with photos.',
        text: 'Add dishes one by one or paste your whole menu. Each dish gets a photo from our library of South Indian food.',
        points: ['Mark a dish sold out in one tap', 'Veg and non-veg marks on every dish', 'Each dish goes to its own kitchen counter'],
        src: '/screens/menu.webp',
        url: 'quickbite.app/pos/menu',
        alt: 'Menu screen with dish photos, prices and availability switches',
    },
];

/**
 * "Inside QuickBite": one tab per screen, with the real screenshot in a browser window
 */
const ProductTour = () => {
    const [active, setActive] = useState(0);
    const tabRefs = useRef([]);
    const tab = TABS[active];

    // Arrow keys move between tabs (WAI-ARIA tabs pattern)
    const onKeyDown = (event) => {
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
        if (!step && event.key !== 'Home' && event.key !== 'End') return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? TABS.length - 1 : (active + step + TABS.length) % TABS.length;
        setActive(next);
        tabRefs.current[next]?.focus();
    };

    return (
        <section id="product" className="scroll-mt-16 overflow-hidden">
            <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-32">
                <Reveal className="mx-auto max-w-3xl text-center">
                    <p className="font-code text-xs uppercase tracking-[0.3em] text-saffron-deep">Inside QuickBite</p>
                    <h2 className="mt-4 font-display text-4xl font-bold leading-[1.02] tracking-[-0.03em] sm:text-6xl">
                        One system for the counter, the kitchen <span className="font-accent font-normal italic">and the hall.</span>
                    </h2>
                </Reveal>

                <Reveal delay={100}>
                    <div
                        role="tablist"
                        aria-label="QuickBite screens"
                        onKeyDown={onKeyDown}
                        className="-mx-5 mt-10 flex gap-2 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:mx-0 sm:justify-center sm:px-0"
                    >
                        {TABS.map((item, index) => {
                            const Icon = item.icon;
                            const selected = index === active;
                            return (
                                <button
                                    key={item.id}
                                    ref={(node) => { tabRefs.current[index] = node; }}
                                    type="button"
                                    role="tab"
                                    id={`tour-tab-${item.id}`}
                                    aria-selected={selected}
                                    aria-controls="tour-panel"
                                    tabIndex={selected ? 0 : -1}
                                    onClick={() => setActive(index)}
                                    className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-300 sm:px-5 ${
                                        selected ? 'bg-ink text-paper shadow-[0_10px_24px_-12px_rgba(15,14,12,0.7)]' : 'bg-white text-ink/65 ring-1 ring-ink/10 hover:text-ink hover:ring-ink/25'
                                    }`}
                                >
                                    <Icon className={`text-lg ${selected ? 'text-saffron' : ''}`} /> {item.label}
                                </button>
                            );
                        })}
                    </div>
                </Reveal>

                <div id="tour-panel" role="tabpanel" aria-labelledby={`tour-tab-${tab.id}`} className="mt-10 grid items-center gap-10 lg:mt-14 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:gap-14">
                    <div key={tab.id} className="qb-fade order-2 lg:order-1">
                        <h3 className="font-display text-3xl font-bold leading-tight tracking-[-0.02em] sm:text-4xl">{tab.title}</h3>
                        <p className="mt-4 text-lg leading-relaxed text-ink/65">{tab.text}</p>
                        <ul className="mt-7 space-y-3.5">
                            {tab.points.map((point) => (
                                <li key={point} className="flex items-start gap-3 text-[15px] leading-snug text-ink/80">
                                    <PiCheckCircleFill className="mt-0.5 shrink-0 text-xl text-leaf" /> {point}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="relative order-1 lg:order-2">
                        <div className="pointer-events-none absolute -inset-10 -z-10 rounded-full bg-saffron/15 blur-[90px]" aria-hidden="true" />
                        <BrowserFrame url={tab.url}>
                            {TABS.map((item, index) => (
                                <img
                                    key={item.id}
                                    src={item.src}
                                    alt={index === active ? item.alt : ''}
                                    aria-hidden={index !== active}
                                    width={1600}
                                    height={1000}
                                    loading="lazy"
                                    decoding="async"
                                    className={`absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-500 ${index === active ? 'opacity-100' : 'opacity-0'}`}
                                />
                            ))}
                        </BrowserFrame>
                        {/* The dashboard also lives on the owner's phone */}
                        <img
                            src="/screens/dashboard-phone.webp"
                            alt=""
                            aria-hidden="true"
                            width={780}
                            height={1688}
                            loading="lazy"
                            decoding="async"
                            className={`absolute -bottom-8 -right-2 hidden w-[23%] rounded-[22px] border-[5px] border-ink bg-ink shadow-[0_30px_60px_-20px_rgba(15,14,12,0.6)] transition-all duration-500 sm:block lg:-right-6 ${
                                tab.phone ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'
                            }`}
                        />
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ProductTour;
