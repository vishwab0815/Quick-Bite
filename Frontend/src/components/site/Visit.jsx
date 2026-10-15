import { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { PiArrowUpRight, PiClockDuotone, PiMapPinFill, PiNavigationArrowFill, PiPhoneDuotone, PiWhatsappLogoDuotone } from 'react-icons/pi';
import { RESTAURANT, mapLinks } from '../../site/restaurant';
import { prefersReducedMotion, useInView, useMediaQuery, useScrollProgress } from './motion';
import { RevealFade, RevealWords } from './Reveal';

const MAX_TILT = 7;

const Detail = ({ icon, label, children, delay = 0 }) => {
    const Icon = icon;
    return (
    <RevealFade delay={delay} className="flex gap-4 border-t border-paper/10 py-5">
        <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/40 text-lg text-gold"><Icon /></span>
        <span className="min-w-0">
            <span className="block font-code text-[10px] uppercase tracking-[0.35em] text-paper/45">{label}</span>
            <span className="mt-1.5 block text-lg leading-snug text-paper/90">{children}</span>
        </span>
    </RevealFade>
    );
};

Detail.propTypes = { icon: PropTypes.elementType.isRequired, label: PropTypes.string.isRequired, children: PropTypes.node, delay: PropTypes.number };

/**
 * A gold-framed map card that tilts in 3D with the pointer. The Google map inside is
 * restyled dark and warm; a floating pin and a small place card sit above it in depth.
 * The map itself is not interactive on the page (so scrolling stays smooth) - the buttons
 * open it in Google Maps.
 */
const MapCard = ({ links, address, hours }) => {
    const cardRef = useRef(null);
    const near = useInView(cardRef, { threshold: 0, rootMargin: '400px 0px' });
    const [loaded, setLoaded] = useState(false);
    const fine = useMediaQuery('(hover: hover) and (pointer: fine)');
    const tilt = fine && !prefersReducedMotion();

    const onMove = (event) => {
        if (!tilt || !cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        cardRef.current.style.transform = `rotateX(${(-y * MAX_TILT).toFixed(2)}deg) rotateY(${(x * MAX_TILT).toFixed(2)}deg)`;
        cardRef.current.style.setProperty('--glare-x', `${((x + 0.5) * 100).toFixed(1)}%`);
        cardRef.current.style.setProperty('--glare-y', `${((y + 0.5) * 100).toFixed(1)}%`);
    };
    const onLeave = () => {
        if (cardRef.current) cardRef.current.style.transform = '';
    };

    return (
        <div className="map-stage" onPointerMove={onMove} onPointerLeave={onLeave}>
            <div ref={cardRef} className={`map-card ${tilt ? 'can-tilt' : ''}`}>
                <div className="map-card__frame" aria-hidden="true" />
                <div className="map-card__corner map-card__corner--tl" aria-hidden="true" />
                <div className="map-card__corner map-card__corner--br" aria-hidden="true" />

                <div className="map-card__map">
                    {near && (
                        <iframe
                            title={`Map of ${RESTAURANT.name}`}
                            src={links.embed}
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            onLoad={() => setLoaded(true)}
                            className={`map-card__iframe ${loaded ? 'is-loaded' : ''}`}
                        />
                    )}
                    <div className="map-card__tint" aria-hidden="true" />
                    <div className="map-card__glare" aria-hidden="true" />
                </div>

                {/* Floating pin, above the map in depth */}
                <div className="map-pin" aria-hidden="true">
                    <span className="map-pin__ring" />
                    <span className="map-pin__ring map-pin__ring--late" />
                    <span className="map-pin__head"><PiMapPinFill /></span>
                    <span className="map-pin__shadow" />
                </div>

                {/* Place card, floating at the foot of the map */}
                <div className="map-place">
                    <p className="font-code text-[10px] uppercase tracking-[0.35em] text-gold">Find us</p>
                    <p className="mt-2 font-accent text-2xl leading-tight text-paper">{RESTAURANT.name}</p>
                    <p className="mt-1 text-sm text-paper/70">{address || `${RESTAURANT.area}, ${RESTAURANT.city}`}{hours ? ` · ${hours}` : ''}</p>
                    <a href={links.directions} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-semibold text-ink" data-cursor="Go">
                        <PiNavigationArrowFill /> Directions
                    </a>
                </div>
            </div>

            {/* Small floating shapes, drifting at different depths */}
            <span className="map-float map-float--1" aria-hidden="true" />
            <span className="map-float map-float--2" aria-hidden="true" />
            <span className="map-float map-float--3" aria-hidden="true" />
        </div>
    );
};

MapCard.propTypes = {
    links: PropTypes.shape({ embed: PropTypes.string, directions: PropTypes.string }).isRequired,
    address: PropTypes.string,
    hours: PropTypes.string,
};

/**
 * Where and when, on one full screen: the address, hours and phone beside a 3D map card.
 * Details come from the restaurant's own settings - anything not filled in is left out.
 */
const Visit = ({ restaurant, board, onlineOrdering }) => {
    const sectionRef = useRef(null);
    const floatsRef = useRef(null);
    const phone = restaurant?.phone;
    const address = restaurant?.address;
    const hours = restaurant?.hours;
    const links = mapLinks(address);
    const ready = board?.ready?.map((entry) => entry.tokenNumber).slice(0, 4) || [];
    const tel = phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : null;
    const whatsapp = phone ? `https://wa.me/${phone.replace(/\D/g, '').replace(/^0/, '').replace(/^(\d{10})$/, '91$1')}` : null;

    // The floating shapes drift at different speeds as the section scrolls
    useScrollProgress(sectionRef, (progress) => {
        floatsRef.current?.style.setProperty('--drift', ((progress - 0.5) * 2).toFixed(3));
    }, 'pass');

    return (
        <section ref={sectionRef} id="visit" data-chapter="Visit" className="relative overflow-hidden bg-ink text-paper">
            <div className="pointer-events-none absolute inset-0 opacity-30" aria-hidden="true">
                <img src="/site/hero.webp" alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-ink/60" />
            </div>

            <div ref={floatsRef} className="relative mx-auto grid min-h-[100svh] max-w-7xl items-center gap-12 px-5 pb-20 pt-28 sm:px-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16 lg:py-24">
                <div className="max-w-xl">
                    <RevealFade className="flex items-center gap-3 font-code text-[10px] uppercase tracking-[0.4em] text-gold sm:text-[11px]">
                        <span className="h-px w-8 bg-current opacity-70" /> Visit
                    </RevealFade>
                    <RevealWords as="h2" delay={150} text="ಬನ್ನಿ" className="mt-6 font-kn text-[clamp(4rem,12vw,9.5rem)] leading-[1.05] text-paper" />
                    <RevealWords delay={450} by="chars" step={110} text="Come, sit, *eat.*" className="font-accent text-3xl text-paper/85 sm:text-5xl" />

                    <div className="mt-10 border-b border-paper/10">
                        <Detail icon={PiMapPinFill} label="Where" delay={550}>
                            {address || `${RESTAURANT.area}, ${RESTAURANT.city}`}
                            <a href={links.open} target="_blank" rel="noreferrer" className="site-link ml-2 inline-flex items-center gap-1 text-sm text-gold">Open in Maps <PiArrowUpRight /></a>
                        </Detail>
                        {hours && <Detail icon={PiClockDuotone} label="Open" delay={650}>{hours}</Detail>}
                        {phone && (
                            <Detail icon={PiPhoneDuotone} label="Call" delay={750}>
                                <a href={tel} className="site-link">{phone}</a>
                                <a href={whatsapp} target="_blank" rel="noreferrer" className="site-link ml-3 inline-flex items-center gap-1 text-sm text-[#5fd38d]"><PiWhatsappLogoDuotone /> WhatsApp</a>
                            </Detail>
                        )}
                    </div>

                    <RevealFade delay={850} className="mt-8 flex flex-wrap items-center gap-3">
                        <a href={links.directions} target="_blank" rel="noreferrer" className="site-button bg-gold text-ink" data-cursor="Go">
                            <PiNavigationArrowFill /> Get directions
                        </a>
                        {onlineOrdering && <a href="/order" className="site-button border border-paper/25 text-paper" data-cursor="Order">Order online <PiArrowUpRight /></a>}
                        {ready.length > 0 && (
                            <p className="flex items-center gap-3 font-code text-[11px] uppercase tracking-[0.3em] text-paper/60">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-leaf" /> Now serving
                                <span className="font-accent text-2xl normal-case tracking-normal text-paper">{ready.join(' · ')}</span>
                            </p>
                        )}
                    </RevealFade>
                </div>

                <RevealFade delay={300} className="relative">
                    <MapCard links={links} address={address} hours={hours} />
                </RevealFade>
            </div>

            <footer className="relative border-t border-paper/10">
                <p className="pointer-events-none -mb-[0.18em] select-none overflow-hidden whitespace-nowrap text-center font-kn text-[clamp(5rem,24vw,22rem)] leading-[1.15] text-paper/[0.07]" aria-hidden="true">
                    {RESTAURANT.wordKn}
                </p>
                <div className="absolute inset-x-0 bottom-0 mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 pb-6 text-xs text-paper/45 sm:px-10">
                    <p>© {new Date().getFullYear()} {RESTAURANT.name} · {RESTAURANT.area}, {RESTAURANT.city}</p>
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
