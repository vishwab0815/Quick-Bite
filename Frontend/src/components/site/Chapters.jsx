import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { applyBeats, clamp01, prefersReducedMotion, smoothstep, useScrollProgress } from './motion';

/**
 * Morning: a small window onto idli, vade and sambar opens up to fill the screen as you
 * scroll, then the filter kaapi rises through it.
 */
export const MorningWindow = () => {
    const sectionRef = useRef(null);
    const stageRef = useRef(null);
    const windowRef = useRef(null);
    const morningRef = useRef(null);
    const kaapiRef = useRef(null);
    const beatsRef = useRef([]);

    useEffect(() => {
        beatsRef.current = [...(stageRef.current?.querySelectorAll('[data-beat]') || [])];
    }, []);

    useScrollProgress(sectionRef, (progress) => {
        const open = smoothstep(0.05, 0.55, progress);
        const kaapi = smoothstep(0.6, 0.85, progress);
        // The window grows from a small rounded frame to the whole screen
        const insetY = (1 - open) * 30;
        const insetX = (1 - open) * 34;
        if (windowRef.current) windowRef.current.style.clipPath = `inset(${insetY.toFixed(2)}% ${insetX.toFixed(2)}% round ${(1 - open) * 12}px)`;
        if (morningRef.current) morningRef.current.style.transform = `scale(${(1.35 - open * 0.35 + kaapi * 0.15).toFixed(3)})`;
        if (kaapiRef.current) {
            kaapiRef.current.style.opacity = kaapi.toFixed(3);
            kaapiRef.current.style.transform = `scale(${(1.25 - kaapi * 0.25 + smoothstep(0.85, 1, progress) * 0.08).toFixed(3)})`;
        }
        applyBeats(beatsRef.current, progress);
    });

    return (
        <section ref={sectionRef} id="morning" data-chapter="Morning" className="relative bg-ink" style={{ height: '320svh' }}>
            <div ref={stageRef} className="sticky top-0 h-[100svh] overflow-hidden">
                <div ref={windowRef} className="absolute inset-0 overflow-hidden" style={{ clipPath: 'inset(30% 34% round 12px)' }}>
                    <picture>
                        <source media="(max-aspect-ratio: 4/5)" srcSet="/site/morning-m.webp" />
                        <img ref={morningRef} src="/site/morning-d.webp" alt="Idli, vade, sambar and filter coffee on a banana leaf" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover will-change-transform" />
                    </picture>
                    <img ref={kaapiRef} src="/site/kaapi.webp" alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-0 will-change-transform" />
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,14,12,0.55)_0%,rgba(15,14,12,0)_60%)]" />
                </div>

                <div data-beat="0,0.3" className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                    <p className="font-code text-[11px] uppercase tracking-[0.4em] text-gold">02</p>
                    <p className="mt-3 font-kn text-xl text-paper/80" aria-hidden="true">ಬೆಳಗ್ಗೆ</p>
                    <h2 className="font-accent text-[clamp(4.5rem,15vw,14rem)] leading-[0.85] text-paper mix-blend-difference">Morning.</h2>
                </div>
                <div data-beat="0.36,0.6" className="absolute inset-0 flex items-center px-5 sm:px-10">
                    <p className="font-accent text-[clamp(3rem,9vw,8rem)] leading-[0.9] text-paper drop-shadow-[0_4px_40px_rgba(0,0,0,0.6)]">
                        Idli. Vade.<br /><em className="text-gold">Sambar.</em>
                    </p>
                </div>
                <div data-beat="0.68,1" className="absolute inset-0 flex items-end justify-end px-5 pb-14 text-right sm:px-10">
                    <p className="font-accent text-[clamp(3rem,9vw,8rem)] leading-[0.9] text-paper drop-shadow-[0_4px_40px_rgba(0,0,0,0.7)]">
                        Then,<br /><em className="text-gold">kaapi.</em>
                    </p>
                </div>
            </div>
        </section>
    );
};

const DISHES = [
    { src: '/site/masala-dosa.webp', name: 'Masala Dose', kn: 'ಮಸಾಲೆ ದೋಸೆ', tone: '#1c130c' },
    { src: '/site/ghee-roast.webp', name: 'Ghee Roast', tone: '#15120f' },
    { src: '/site/upma.webp', name: 'Uppittu', kn: 'ಉಪ್ಪಿಟ್ಟು', tone: '#18150f' },
    { src: '/site/vada-kaapi.webp', name: 'Vade & Kaapi', kn: 'ವಡೆ · ಕಾಫಿ', tone: '#21150b' },
    { src: '/site/oota.webp', name: 'Oota', kn: 'ಊಟ', tone: '#101a10' },
];

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
                const shade = inner?.querySelector('[data-shade]');
                const photo = inner?.querySelector('[data-photo]');
                const covered = next ? clamp01(1 - next.getBoundingClientRect().top / window.innerHeight) : 0;
                if (inner) {
                    inner.style.transform = `scale(${(1 - covered * 0.1).toFixed(4)})`;
                    inner.style.borderRadius = `${(covered * 28).toFixed(1)}px`;
                }
                if (shade) shade.style.opacity = (covered * 0.75).toFixed(3);
                // The photo drifts inside its frame while the card is on screen
                const rect = card.getBoundingClientRect();
                const drift = clamp01((window.innerHeight - rect.top) / (window.innerHeight * 2));
                if (photo) photo.style.transform = `translate3d(0, ${((0.5 - drift) * 10).toFixed(2)}%, 0) scale(1.15)`;
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
            <div className="px-5 pb-16 pt-28 sm:px-10 sm:pt-40">
                <p className="font-code text-[11px] uppercase tracking-[0.4em] text-gold">03</p>
                <h2 className="mt-6 font-accent text-[clamp(3.5rem,10vw,10rem)] leading-[0.85] text-paper">The <em>table.</em></h2>
            </div>
            <ol ref={listRef}>
                {DISHES.map((dish, index) => (
                    <li key={dish.name} className="sticky top-0 h-[100svh] overflow-hidden">
                        <div className="relative flex h-full origin-top flex-col overflow-hidden will-change-transform md:flex-row md:items-center" style={{ background: dish.tone }}>
                            <div className="relative h-[58%] overflow-hidden md:order-2 md:h-[82vh] md:w-[46%] md:max-w-[680px] md:rounded-[4px] lg:mr-[6vw]">
                                <img data-photo src={dish.src} alt={dish.name} width={960} height={1200} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" style={{ transform: 'scale(1.15)' }} />
                            </div>
                            <div className="flex flex-1 flex-col justify-center px-5 py-8 sm:px-10 md:order-1">
                                <p className="font-code text-[11px] tracking-[0.35em] text-paper/45">{String(index + 1).padStart(2, '0')} / {String(DISHES.length).padStart(2, '0')}</p>
                                <h3 className="mt-4 font-accent text-[clamp(3.5rem,9vw,9.5rem)] leading-[0.85] text-paper">{dish.name}</h3>
                                {dish.kn && <p className="mt-4 font-kn text-xl text-gold sm:text-2xl">{dish.kn}</p>}
                            </div>
                            <div data-shade className="pointer-events-none absolute inset-0 bg-ink opacity-0" />
                        </div>
                    </li>
                ))}
            </ol>
        </section>
    );
};

/** A band of large words gliding sideways - to order online, or just the name */
export const Marquee = ({ words, href, cursor, label }) => {
    const Tag = href ? 'a' : 'div';
    const row = [...words, ...words];
    return (
        <Tag {...(href && { href, 'data-cursor': cursor })} aria-label={label} className="site-marquee group block overflow-hidden border-y border-paper/10 bg-ink py-8 text-paper sm:py-12">
            <span aria-hidden="true" className="site-marquee__track flex w-max items-center gap-10 whitespace-nowrap font-accent text-[clamp(3rem,8vw,7.5rem)] leading-none sm:gap-16">
                {[...row, ...row].map((word, index) => (
                    <span key={index} className="flex items-center gap-10 sm:gap-16">
                        <span className={index % 2 ? 'italic text-gold' : ''}>{word}</span>
                        <span className="h-3 w-3 rotate-45 bg-gold/70 sm:h-4 sm:w-4" aria-hidden="true" />
                    </span>
                ))}
            </span>
        </Tag>
    );
};

Marquee.propTypes = { words: PropTypes.arrayOf(PropTypes.string).isRequired, href: PropTypes.string, cursor: PropTypes.string, label: PropTypes.string };
