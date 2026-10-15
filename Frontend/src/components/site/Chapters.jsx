import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { PiArrowUpRight } from 'react-icons/pi';
import { clamp01, prefersReducedMotion, useInView, useScrollProgress } from './motion';
import { RevealFade, RevealImage, RevealWords } from './Reveal';

const Label = ({ children, className = '' }) => (
    <span className={`flex items-center gap-3 font-code text-[10px] uppercase tracking-[0.4em] sm:text-[11px] ${className}`}>
        <span className="h-px w-8 bg-current opacity-70" /> {children}
    </span>
);

Label.propTypes = { children: PropTypes.node, className: PropTypes.string };

/**
 * Lunch: the banana-leaf feast, uncovered across the whole screen.
 */
export const OotaChapter = () => {
    const sectionRef = useRef(null);
    const imageRef = useRef(null);

    useScrollProgress(sectionRef, (progress) => {
        if (imageRef.current) imageRef.current.style.transform = `translate3d(0, ${((progress - 0.5) * -10).toFixed(2)}%, 0)`;
    }, 'pass');

    return (
        <section ref={sectionRef} id="oota" data-chapter="Oota" className="relative h-[100svh] min-h-[600px] overflow-hidden bg-ink">
            <div ref={imageRef} className="absolute -inset-y-[6%] inset-x-0 will-change-transform">
                <RevealImage
                    sources={[{ media: '(max-aspect-ratio: 4/5)', srcSet: '/site/feast-m.webp' }]}
                    src="/site/feast-d.webp"
                    alt="A full meal on a banana leaf with rice, curries, sweets and flowers"
                    className="ri--slow absolute inset-0"
                    imgClassName="h-full w-full object-cover"
                />
            </div>
            <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(15,14,12,0.92)_0%,rgba(15,14,12,0.35)_45%,rgba(15,14,12,0.2)_100%)]" />
            <div className="relative flex h-full flex-col justify-end px-5 pb-14 sm:px-12 sm:pb-20">
                <RevealFade><Label className="text-gold">Lunch</Label></RevealFade>
                <RevealFade delay={120} className="mt-5 font-kn text-2xl text-gold sm:text-3xl" aria-hidden="true">ಊಟ</RevealFade>
                <RevealWords as="h2" delay={200} text="Oota." className="font-accent text-[clamp(5rem,17vw,16rem)] leading-[0.82] text-paper" />
                <RevealWords delay={500} step={50} text="Served the old way - on a *banana* *leaf.*" className="mt-6 font-accent text-[clamp(1.6rem,3vw,2.6rem)] text-paper/85" />
            </div>
        </section>
    );
};

const DISHES = [
    { src: '/site/masala-dosa.webp', name: 'Masala Dose', kn: 'ಮಸಾಲೆ ದೋಸೆ', line: 'Crisp outside, soft inside, potato palya folded in.', tone: '#1c130c' },
    { src: '/site/ghee-roast.webp', name: 'Ghee Roast', line: 'Paper-thin and golden, roasted in ghee.', tone: '#15120f' },
    { src: '/site/upma.webp', name: 'Uppittu', kn: 'ಉಪ್ಪಿಟ್ಟು', line: 'Soft rava with curry leaves and a little ghee.', tone: '#18150f' },
    { src: '/site/vada-kaapi.webp', name: 'Vade & Kaapi', kn: 'ವಡೆ · ಕಾಫಿ', line: 'The pair that starts every Bengaluru morning.', tone: '#21150b' },
];

const DishCard = ({ dish, index, count }) => {
    const ref = useRef(null);
    const inView = useInView(ref, { threshold: 0.45 });
    return (
        <div ref={ref} className="relative flex h-full origin-top flex-col overflow-hidden will-change-transform md:flex-row md:items-center" style={{ background: dish.tone }}>
            <div className={`dish-photo relative h-[56%] overflow-hidden md:order-2 md:h-[80vh] md:w-[42%] md:max-w-[640px] md:rounded-[4px] lg:mr-[7vw] ${inView ? 'is-in' : ''}`}>
                <img data-photo src={dish.src} alt={dish.name} width={960} height={1200} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" style={{ transform: 'scale(1.15)' }} />
            </div>
            <div className={`flex flex-1 flex-col justify-center px-5 py-8 sm:px-12 md:order-1 ${inView ? 'is-in' : ''}`}>
                <p className="font-code text-[11px] tracking-[0.35em] text-paper/45">{String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}</p>
                <RevealWords controlled as="h3" text={dish.name} step={90} className="mt-5 font-accent text-[clamp(3.6rem,8.5vw,9rem)] leading-[0.86] text-paper" />
                {dish.kn && <p className="dish-fade mt-4 font-kn text-xl text-gold sm:text-2xl" style={{ transitionDelay: '250ms' }}>{dish.kn}</p>}
                <RevealWords controlled delay={350} step={30} text={dish.line} className="mt-6 max-w-sm text-paper/65 sm:text-lg" />
            </div>
            <div data-shade className="pointer-events-none absolute inset-0 bg-ink opacity-0" />
        </div>
    );
};

DishCard.propTypes = { dish: PropTypes.object.isRequired, index: PropTypes.number.isRequired, count: PropTypes.number.isRequired };

/**
 * The dishes as full-screen cards that pile up: each new card slides over the last,
 * which sinks back and darkens.
 */
export const StackedDishes = () => {
    const listRef = useRef(null);

    useEffect(() => {
        if (prefersReducedMotion()) return undefined;
        let frame = 0;
        const update = () => {
            frame = 0;
            const cards = [...(listRef.current?.children || [])];
            cards.forEach((card, index) => {
                const next = cards[index + 1];
                const inner = card.firstElementChild;
                const covered = next ? clamp01(1 - next.getBoundingClientRect().top / window.innerHeight) : 0;
                if (inner) {
                    inner.style.transform = `scale(${(1 - covered * 0.1).toFixed(4)})`;
                    inner.style.borderRadius = `${(covered * 28).toFixed(1)}px`;
                    const shade = inner.querySelector('[data-shade]');
                    if (shade) shade.style.opacity = (covered * 0.75).toFixed(3);
                    const photo = inner.querySelector('[data-photo]');
                    const rect = card.getBoundingClientRect();
                    const drift = clamp01((window.innerHeight - rect.top) / (window.innerHeight * 2));
                    if (photo) photo.style.transform = `translate3d(0, ${((0.5 - drift) * 10).toFixed(2)}%, 0) scale(1.15)`;
                }
            });
        };
        const onScroll = () => {
            if (!frame) frame = requestAnimationFrame(update);
        };
        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
        };
    }, []);

    return (
        <section id="table" data-chapter="The table" className="relative bg-ink">
            <div className="flex min-h-[100svh] flex-col justify-center px-5 py-28 sm:px-12">
                <RevealFade><Label className="text-gold">The table</Label></RevealFade>
                <RevealWords as="h2" delay={150} text={'From the tawa,\nto your *table.*'} className="mt-8 font-accent text-[clamp(3.6rem,10vw,10rem)] leading-[0.88] text-paper" />
                <RevealWords delay={600} step={35} text="A few of the dishes we are known for. Scroll on." className="mt-8 max-w-md text-paper/60 sm:text-lg" />
            </div>
            <ol ref={listRef}>
                {DISHES.map((dish, index) => (
                    <li key={dish.name} className="sticky top-0 h-[100svh] overflow-hidden">
                        <DishCard dish={dish} index={index} count={DISHES.length} />
                    </li>
                ))}
            </ol>
        </section>
    );
};

const STEPS = [
    ['Pick your dishes', 'From today’s menu, with photos.'],
    ['Pay by UPI or card', 'Secure checkout by Razorpay.'],
    ['Collect with your token', 'We message you on WhatsApp when it’s ready.'],
];

/**
 * Order online, in three steps - only shown when online ordering is switched on
 */
export const OrderChapter = () => (
    <section id="order" data-chapter="Order" className="relative flex min-h-[100svh] flex-col overflow-hidden bg-paper text-ink">
        <div className="grid flex-1 items-center gap-12 px-5 py-28 sm:px-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
                <RevealFade><Label className="text-saffron-deep">Order online</Label></RevealFade>
                <RevealWords as="h2" delay={150} text={'Order ahead.\nCollect with your *token.*'} className="mt-8 font-accent text-[clamp(3.4rem,8vw,8rem)] leading-[0.9]" />
                <ol className="mt-12 max-w-lg border-t border-ink/15">
                    {STEPS.map(([title, text], index) => (
                        <RevealFade as="li" key={title} delay={400 + index * 140} className="flex gap-6 border-b border-ink/15 py-5">
                            <span className="font-code text-sm text-ink/40">0{index + 1}</span>
                            <span>
                                <span className="block font-accent text-3xl leading-tight">{title}</span>
                                <span className="mt-1 block text-sm text-ink/60">{text}</span>
                            </span>
                        </RevealFade>
                    ))}
                </ol>
                <RevealFade delay={850} className="mt-10">
                    <a href="/order" className="site-button bg-ink text-paper" data-cursor="Order">Start your order <PiArrowUpRight /></a>
                </RevealFade>
            </div>
            <RevealImage src="/site/masala-dosa.webp" alt="Masala dose on a banana leaf" className="mx-auto aspect-[4/5] w-full max-w-[520px] rounded-[4px]" imgClassName="h-full w-full object-cover" />
        </div>
        <Marquee words={['Order ahead', 'Pay by UPI', 'Skip the queue']} href="/order" cursor="Order" label="Order online" />
    </section>
);

/** A band of large words gliding sideways */
export const Marquee = ({ words, href, cursor, label }) => {
    const Tag = href ? 'a' : 'div';
    const row = [...words, ...words];
    return (
        <Tag {...(href && { href, 'data-cursor': cursor })} aria-label={label} className="site-marquee group block overflow-hidden border-y border-paper/10 bg-ink py-7 text-paper sm:py-10">
            <span aria-hidden="true" className="site-marquee__track flex w-max items-center gap-10 whitespace-nowrap font-accent text-[clamp(2.8rem,7vw,6.5rem)] leading-none sm:gap-16">
                {[...row, ...row].map((word, index) => (
                    <span key={index} className="flex items-center gap-10 sm:gap-16">
                        <span className={index % 2 ? 'italic text-gold' : ''}>{word}</span>
                        <span className="h-3 w-3 rotate-45 bg-gold/70 sm:h-4 sm:w-4" />
                    </span>
                ))}
            </span>
        </Tag>
    );
};

Marquee.propTypes = { words: PropTypes.arrayOf(PropTypes.string).isRequired, href: PropTypes.string, cursor: PropTypes.string, label: PropTypes.string };
