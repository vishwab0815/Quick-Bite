import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { PiArrowUpRight, PiListLight, PiNavigationArrowFill, PiPhoneDuotone, PiXLight } from 'react-icons/pi';
import { RESTAURANT, mapLinks } from '../../site/restaurant';

const LINKS = [
    { id: 'morning', label: 'Morning', chapter: 'Morning' },
    { id: 'table', label: 'Dishes', chapter: 'The table' },
    { id: 'menu', label: 'Menu', chapter: 'Menu', needsMenu: true },
    { id: 'visit', label: 'Visit', chapter: 'Visit' },
];

/**
 * The site's navigation: clear over the opening screen, then a frosted dark bar that reads on
 * any photo. It slips away while scrolling down and returns on the way up; the current chapter
 * is marked. On phones a full-screen menu opens from the button on the right.
 */
const Nav = ({ chapter, hasMenu, onlineOrdering, restaurant, goTo }) => {
    const [scrolled, setScrolled] = useState(false);
    const [hidden, setHidden] = useState(false);
    const [open, setOpen] = useState(false);
    const lastY = useRef(0);
    const links = LINKS.filter((link) => !link.needsMenu || hasMenu);
    const maps = mapLinks(restaurant?.address);
    const phone = restaurant?.phone;

    useEffect(() => {
        let frame = 0;
        const onScroll = () => {
            if (frame) return;
            frame = requestAnimationFrame(() => {
                frame = 0;
                const y = window.scrollY;
                setScrolled(y > window.innerHeight * 0.6);
                // Hide only on a clear downward move, well below the top
                setHidden(y > lastY.current + 6 && y > window.innerHeight);
                if (y < lastY.current - 6 || y <= 0) setHidden(false);
                lastY.current = y;
            });
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('scroll', onScroll);
        };
    }, []);

    // The open menu locks the page and closes on Escape
    useEffect(() => {
        if (!open) return undefined;
        const previous = document.documentElement.style.overflow;
        document.documentElement.style.overflow = 'hidden';
        const onKey = (event) => event.key === 'Escape' && setOpen(false);
        window.addEventListener('keydown', onKey);
        return () => {
            document.documentElement.style.overflow = previous;
            window.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const follow = (id) => (event) => {
        setOpen(false);
        goTo(id)(event);
    };

    return (
        <>
            <header className={`site-nav fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4 ${scrolled ? 'is-scrolled' : ''} ${hidden && !open ? 'is-hidden' : ''}`}>
                <div className="site-nav__bar mx-auto flex max-w-7xl items-center gap-2 rounded-full px-2 py-2 pl-5 text-paper sm:gap-4 sm:pl-6">
                    <a href="#top" onClick={follow('top')} className="mr-auto flex items-center gap-3 leading-none" aria-label={`${RESTAURANT.name} - back to top`}>
                        <span className="font-accent text-[24px] sm:text-[26px]">{RESTAURANT.word}</span>
                        <span className="hidden font-kn text-sm text-gold md:inline">{RESTAURANT.wordKn}</span>
                    </a>

                    <nav className="hidden items-center gap-1 md:flex" aria-label="Sections">
                        {links.map((link) => {
                            const current = chapter === link.chapter;
                            return (
                                <a key={link.id} href={`#${link.id}`} onClick={follow(link.id)} aria-current={current ? 'true' : undefined} className={`site-nav__link ${current ? 'is-current' : ''}`}>
                                    {link.label}
                                </a>
                            );
                        })}
                    </nav>

                    {onlineOrdering ? (
                        <Link to="/order" className="site-nav__cta" data-cursor="Order">Order online</Link>
                    ) : (
                        <a href={maps.directions} target="_blank" rel="noreferrer" className="site-nav__cta"><PiNavigationArrowFill /> Directions</a>
                    )}
                    <button type="button" onClick={() => setOpen(true)} className="flex h-11 w-11 items-center justify-center rounded-full text-2xl md:hidden" aria-label="Open menu" aria-expanded={open}>
                        <PiListLight />
                    </button>
                </div>
            </header>

            {/* Full-screen menu on phones */}
            <div className={`site-menu fixed inset-0 z-[70] flex flex-col bg-ink text-paper ${open ? 'is-open' : ''}`} aria-hidden={!open} role="dialog" aria-modal="true" aria-label="Menu">
                <div className="flex items-center justify-between px-5 pt-5">
                    <span className="font-kn text-xl text-gold">{RESTAURANT.wordKn}</span>
                    <button type="button" onClick={() => setOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-full text-2xl ring-1 ring-white/15" aria-label="Close menu" tabIndex={open ? 0 : -1}>
                        <PiXLight />
                    </button>
                </div>
                <nav className="flex flex-1 flex-col justify-center px-6" aria-label="Sections">
                    {[{ id: 'top', label: 'Welcome', chapter: 'Welcome' }, ...links].map((link, index) => (
                        <a
                            key={link.id}
                            href={`#${link.id}`}
                            onClick={follow(link.id)}
                            tabIndex={open ? 0 : -1}
                            className={`site-menu__link flex items-baseline gap-4 border-b border-white/10 py-4 font-accent text-[clamp(2.6rem,11vw,4rem)] leading-none ${chapter === link.chapter ? 'text-gold' : ''}`}
                            style={{ transitionDelay: `${120 + index * 60}ms` }}
                        >
                            <span className="font-code text-[10px] tracking-[0.3em] text-paper/40">0{index + 1}</span>
                            {link.label}
                        </a>
                    ))}
                </nav>
                <div className="site-menu__foot px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
                    <p className="text-sm text-paper/60">{restaurant?.address || `${RESTAURANT.area}, ${RESTAURANT.city}`}{restaurant?.hours ? ` · ${restaurant.hours}` : ''}</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                        {onlineOrdering && <Link to="/order" tabIndex={open ? 0 : -1} className="site-button bg-gold text-ink">Order online <PiArrowUpRight /></Link>}
                        <a href={maps.directions} target="_blank" rel="noreferrer" tabIndex={open ? 0 : -1} className="site-button border border-paper/25"><PiNavigationArrowFill /> Directions</a>
                        {phone && <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} tabIndex={open ? 0 : -1} className="site-button border border-paper/25"><PiPhoneDuotone /> Call</a>}
                    </div>
                </div>
            </div>
        </>
    );
};

Nav.propTypes = {
    chapter: PropTypes.string,
    hasMenu: PropTypes.bool,
    onlineOrdering: PropTypes.bool,
    restaurant: PropTypes.shape({ address: PropTypes.string, phone: PropTypes.string, hours: PropTypes.string }),
    goTo: PropTypes.func.isRequired,
};

export default Nav;
