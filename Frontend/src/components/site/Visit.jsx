import { useRef } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { PiArrowUpRight, PiPhone } from 'react-icons/pi';
import { RESTAURANT } from '../../site/restaurant';
import { smoothstep, useScrollProgress } from './motion';
import { RevealFade, RevealWords } from './Reveal';

const Detail = ({ label, children }) => (
    <div>
        <p className="font-code text-[10px] uppercase tracking-[0.4em] text-paper/45">{label}</p>
        <div className="mt-3 text-lg leading-snug text-paper/90">{children}</div>
    </div>
);

Detail.propTypes = { label: PropTypes.string.isRequired, children: PropTypes.node };

/**
 * Where and when: details come from the restaurant's own settings - anything not filled in is left out
 */
const Visit = ({ restaurant, board, onlineOrdering }) => {
    const sectionRef = useRef(null);
    const photoRef = useRef(null);
    const phone = restaurant?.phone;
    const ready = board?.ready?.map((entry) => entry.tokenNumber).slice(0, 4) || [];

    // The photo opens as a growing circle, settling from slightly zoomed in
    useScrollProgress(sectionRef, (progress) => {
        const open = smoothstep(0.05, 0.45, progress);
        if (photoRef.current) {
            photoRef.current.style.clipPath = `circle(${(14 + open * 76).toFixed(2)}% at 50% 55%)`;
            photoRef.current.style.transform = `scale(${(1.2 - open * 0.2).toFixed(3)})`;
        }
    }, 'pass');

    return (
        <section ref={sectionRef} id="visit" data-chapter="Visit" className="relative isolate overflow-hidden bg-ink text-paper">
            <picture>
                <source media="(max-aspect-ratio: 4/5)" srcSet="/site/visit-m.webp" />
                <img ref={photoRef} src="/site/visit.webp" alt="" loading="lazy" decoding="async" className="absolute inset-0 -z-20 h-full w-full object-cover will-change-transform" style={{ clipPath: 'circle(14% at 50% 55%)' }} />
            </picture>
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/80 to-ink/40" aria-hidden="true" />

            <div className="mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-5 pb-16 pt-40 sm:px-10">
                <RevealFade className="flex items-center gap-3 font-code text-[10px] uppercase tracking-[0.4em] text-gold sm:text-[11px]">
                    <span className="h-px w-8 bg-current opacity-70" /> Visit
                </RevealFade>
                <RevealWords as="h2" delay={150} text="ಬನ್ನಿ" className="mt-6 font-kn text-[clamp(4.5rem,16vw,13rem)] leading-[1.05] text-paper" />
                <RevealWords delay={450} text="Come, sit, *eat.*" className="mt-1 font-accent text-3xl text-paper/80 sm:text-5xl" />

                <RevealFade delay={600} className="mt-16 grid gap-10 border-t border-paper/15 pt-10 sm:grid-cols-3">
                    <Detail label="Where">{restaurant?.address || `${RESTAURANT.area}, ${RESTAURANT.city}`}</Detail>
                    {restaurant?.hours && <Detail label="Open">{restaurant.hours}</Detail>}
                    {phone && (
                        <Detail label="Call">
                            <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className="site-link">{phone}</a>
                        </Detail>
                    )}
                </RevealFade>

                <RevealFade delay={750} className="mt-12 flex flex-wrap items-center gap-3">
                    {onlineOrdering && (
                        <a href="/order" className="site-button bg-paper text-ink" data-cursor="Order">Order online <PiArrowUpRight /></a>
                    )}
                    <a href={RESTAURANT.mapsUrl} target="_blank" rel="noreferrer" className="site-button bg-gold text-ink" data-cursor="Map">
                        Directions <PiArrowUpRight />
                    </a>
                    {phone && (
                        <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className="site-button border border-paper/25 text-paper">
                            <PiPhone /> Call
                        </a>
                    )}
                    {ready.length > 0 && (
                        <p className="ml-auto flex items-center gap-3 font-code text-[11px] uppercase tracking-[0.3em] text-paper/60">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-leaf" /> Now serving
                            <span className="font-accent text-2xl normal-case tracking-normal text-paper">{ready.join(' · ')}</span>
                        </p>
                    )}
                </RevealFade>
            </div>

            <footer className="relative border-t border-paper/10">
                <p className="pointer-events-none -mb-[0.18em] select-none overflow-hidden whitespace-nowrap text-center font-kn text-[clamp(5rem,24vw,22rem)] leading-[1.15] text-paper/[0.07]" aria-hidden="true">
                    {RESTAURANT.wordKn}
                </p>
                <div className="absolute inset-x-0 bottom-0 mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 pb-6 text-xs text-paper/45 sm:px-10">
                    <p>© {new Date().getFullYear()} {RESTAURANT.name} · {RESTAURANT.area}</p>
                    <Link to="/signin" className="hover:text-paper">Staff</Link>
                </div>
            </footer>
        </section>
    );
};

Visit.propTypes = {
    restaurant: PropTypes.shape({ address: PropTypes.string, phone: PropTypes.string, hours: PropTypes.string }),
    board: PropTypes.shape({ ready: PropTypes.array }),
    onlineOrdering: PropTypes.bool,
};

export default Visit;
