import { Fragment, useRef } from 'react';
import PropTypes from 'prop-types';
import { RESTAURANT } from '../../site/restaurant';
import { useScrollProgress } from './motion';

/** Letters that rise one after another once `in` is set */
export const SplitText = ({ text, className = '', delay = 0, step = 45, in: shown }) => (
    <span className={`site-split ${shown ? 'is-in' : ''} ${className}`} aria-label={text}>
        {[...text].map((char, index) => (
            <span key={index} className="site-split__mask" aria-hidden="true">
                <span className="site-split__char" style={{ transitionDelay: `${delay + index * step}ms` }}>
                    {char === ' ' ? ' ' : char}
                </span>
            </span>
        ))}
    </span>
);

SplitText.propTypes = {
    text: PropTypes.string.isRequired,
    className: PropTypes.string,
    delay: PropTypes.number,
    step: PropTypes.number,
    in: PropTypes.bool,
};

/**
 * Opening screen: the banana-leaf feast, the name rising letter by letter.
 * Scrolling away, the photo sinks and deepens while the name lifts off faster.
 */
export const Hero = ({ revealed, onlineOrdering }) => {
    const sectionRef = useRef(null);
    const imageRef = useRef(null);
    const textRef = useRef(null);
    const shadeRef = useRef(null);

    useScrollProgress(sectionRef, (progress) => {
        // 'pass' progress is 0.5 when the hero fills the screen at the top of the page
        const away = Math.max(0, (progress - 0.5) * 2);
        if (imageRef.current) imageRef.current.style.transform = `translate3d(0, ${(away * 22).toFixed(2)}%, 0) scale(${(1 + away * 0.12).toFixed(3)})`;
        if (textRef.current) textRef.current.style.transform = `translate3d(0, ${(-away * 40).toFixed(2)}vh, 0)`;
        if (shadeRef.current) shadeRef.current.style.opacity = (away * 0.85).toFixed(3);
    }, 'pass');

    return (
        <section ref={sectionRef} id="top" data-chapter="Offering" className="relative h-[100svh] overflow-hidden bg-ink">
            <picture>
                <source media="(max-aspect-ratio: 4/5)" srcSet="/site/feast-m.webp" />
                <img
                    ref={imageRef}
                    src="/site/feast-d.webp"
                    alt="A banana-leaf feast with flowers, served at Udupi Sri Krishna Naivedya"
                    fetchPriority="high"
                    className={`site-hero-img absolute inset-0 h-full w-full object-cover will-change-transform ${revealed ? 'is-in' : ''}`}
                />
            </picture>
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,14,12,0.55)_0%,rgba(15,14,12,0.05)_32%,rgba(15,14,12,0.1)_55%,rgba(15,14,12,0.85)_100%)]" />
            <div ref={shadeRef} className="absolute inset-0 bg-ink opacity-0" />

            <div ref={textRef} className="absolute inset-x-0 bottom-0 px-5 pb-10 will-change-transform sm:px-10 md:pb-20">
                <h1 className="sr-only">{RESTAURANT.name}, {RESTAURANT.area}</h1>
                <p className={`site-fade font-kn text-lg text-gold sm:text-2xl ${revealed ? 'is-in' : ''}`} style={{ transitionDelay: '250ms' }} aria-hidden="true">
                    {RESTAURANT.leadKn}
                </p>
                <p className="font-accent text-[clamp(5.5rem,19vw,19rem)] leading-[0.82] tracking-[-0.03em] text-paper" aria-hidden="true">
                    <SplitText text={RESTAURANT.word} in={revealed} delay={150} step={55} />
                </p>
                <div className={`site-fade mt-8 flex items-end justify-between gap-6 whitespace-nowrap font-code text-[10px] uppercase tracking-[0.25em] text-paper/75 sm:text-[11px] sm:tracking-[0.35em] ${revealed ? 'is-in' : ''}`} style={{ transitionDelay: '700ms' }}>
                    <span>{RESTAURANT.area} · {RESTAURANT.city}</span>
                    {onlineOrdering
                        ? <a href="/order" className="site-link pointer-events-auto text-gold" data-cursor="Order">Order online →</a>
                        : <span className="flex items-center gap-3">Scroll <span className="site-scroll-line" /></span>}
                </div>
            </div>
        </section>
    );
};

Hero.propTypes = { revealed: PropTypes.bool, onlineOrdering: PropTypes.bool };

/** One sentence; its words light up as it passes the middle of the screen */
export const Statement = ({ text }) => {
    const ref = useRef(null);
    const words = text.split(' ');

    useScrollProgress(ref, (progress) => {
        const reading = Math.min(1, Math.max(0, (progress - 0.2) / 0.45));
        ref.current?.style.setProperty('--p', reading.toFixed(3));
    }, 'pass');

    return (
        <section className="bg-ink px-5 py-32 sm:px-10 sm:py-48">
            <p ref={ref} className="mx-auto max-w-6xl font-accent text-[clamp(2.6rem,7vw,6.5rem)] leading-[1.02] text-paper" style={{ '--n': words.length }}>
                {words.map((word, index) => {
                    const accent = word.startsWith('*');
                    return (
                        <Fragment key={index}>
                            <span className={`site-word ${accent ? 'italic text-gold' : ''}`} style={{ '--i': index }}>{word.replace(/\*/g, '')}</span>{' '}
                        </Fragment>
                    );
                })}
            </p>
        </section>
    );
};

Statement.propTypes = { text: PropTypes.string.isRequired };
