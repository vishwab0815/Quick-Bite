import { useCallback, useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import { PiArrowUpRight } from 'react-icons/pi';
import Preloader from '../components/site/Preloader';
import Cursor from '../components/site/Cursor';
import { Hero, Statement } from '../components/site/Hero';
import { Marquee, MorningWindow, StackedDishes } from '../components/site/Chapters';
import MenuSection from '../components/site/MenuSection';
import Visit from '../components/site/Visit';
import { prefersReducedMotion } from '../components/site/motion';
import { RESTAURANT, publicPaths } from '../site/restaurant';
import { posApi } from '../utils/pos';

const LIVE_REFRESH_MS = 15000;
const CHAPTERS = ['Offering', 'Morning', 'The table', 'Menu', 'Visit'];
const heroSrc = () => (window.matchMedia('(max-aspect-ratio: 4/5)').matches ? '/site/feast-m.webp' : '/site/feast-d.webp');

/**
 * Udupi Sri Krishna Naivedya - the restaurant's own website, told in five chapters with
 * photographs: the offering, morning, the table, today's menu (live from the counter)
 * and how to visit. Customers can order and pay online when it is switched on.
 */
export default function Landing() {
    const [info, setInfo] = useState(null);
    const [board, setBoard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [revealed, setRevealed] = useState(false);
    const [chapter, setChapter] = useState(0);
    const [hero] = useState(heroSrc);
    const lenisRef = useRef(null);
    const progressRef = useRef(null);
    const pageRef = useRef(null);

    // Live details from the restaurant's counter: menu, address, hours, tokens being served
    useEffect(() => {
        document.title = `${RESTAURANT.name} · ${RESTAURANT.area}`;
        if (!publicPaths) return undefined;
        posApi.get(publicPaths.info).then((res) => setInfo(res.data)).catch(() => setInfo({ failed: true }));
        const loadBoard = () => posApi.get(publicPaths.display).then((res) => setBoard(res.data)).catch(() => {});
        loadBoard();
        const timer = setInterval(() => {
            if (document.visibilityState === 'visible') loadBoard();
        }, LIVE_REFRESH_MS);
        return () => clearInterval(timer);
    }, []);

    // Smooth, weighted scrolling (skipped for people who prefer less motion)
    useEffect(() => {
        if (prefersReducedMotion()) return undefined;
        const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
        lenisRef.current = lenis;
        let frame = requestAnimationFrame(function loop(time) {
            lenis.raf(time);
            frame = requestAnimationFrame(loop);
        });
        return () => {
            cancelAnimationFrame(frame);
            lenis.destroy();
            lenisRef.current = null;
        };
    }, []);

    // Hold the page still during the opening
    useEffect(() => {
        if (!loading) {
            lenisRef.current?.start();
            document.documentElement.style.overflow = '';
            return undefined;
        }
        window.scrollTo(0, 0);
        lenisRef.current?.stop();
        document.documentElement.style.overflow = 'hidden';
        return () => {
            document.documentElement.style.overflow = '';
        };
    }, [loading]);

    // Reading progress line, and which chapter is on screen
    useEffect(() => {
        let frame = 0;
        const update = () => {
            frame = 0;
            const max = document.documentElement.scrollHeight - window.innerHeight;
            if (progressRef.current) progressRef.current.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
            const middle = window.innerHeight / 2;
            const sections = [...(pageRef.current?.querySelectorAll('[data-chapter]') || [])];
            const current = sections.findLast((section) => section.getBoundingClientRect().top <= middle);
            if (current) setChapter(CHAPTERS.indexOf(current.dataset.chapter));
        };
        const onScroll = () => {
            if (!frame) frame = requestAnimationFrame(update);
        };
        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('scroll', onScroll);
        };
    }, [info]);

    const reveal = useCallback(() => setRevealed(true), []);
    const finishLoading = useCallback(() => setLoading(false), []);

    const goTo = (id) => (event) => {
        event.preventDefault();
        const target = document.getElementById(id);
        if (!target) return;
        if (lenisRef.current) lenisRef.current.scrollTo(target, { duration: 1.6 });
        else target.scrollIntoView({ block: 'start' });
    };

    const menu = info?.menu || [];
    const restaurant = info?.restaurant;
    const onlineOrdering = Boolean(restaurant?.onlineOrdering);

    return (
        <div ref={pageRef} className="qb-site min-h-screen bg-ink text-paper">
            {loading && <Preloader heroSrc={hero} onReveal={reveal} onDone={finishLoading} />}
            <Cursor />
            <div ref={progressRef} className="fixed inset-x-0 top-0 z-[60] h-px origin-left bg-gold" style={{ transform: 'scaleX(0)' }} aria-hidden="true" />

            {/* ---------- Navigation: light text that inverts over any photo ---------- */}
            <header className="pointer-events-none fixed inset-x-0 top-0 z-50 mix-blend-difference">
                <div className="flex items-center justify-between px-5 py-5 text-white sm:px-10 sm:py-7">
                    <a href="#top" onClick={goTo('top')} className="pointer-events-auto leading-none" aria-label={`${RESTAURANT.name} - back to top`}>
                        <span className="font-accent text-[26px] sm:text-[30px]">{RESTAURANT.word}</span>
                    </a>
                    <nav className={`pointer-events-auto flex items-center gap-5 text-[13px] sm:gap-8 ${onlineOrdering ? 'mr-[124px] sm:mr-[148px]' : ''}`} aria-label="Sections">
                        {menu.length > 0 && <a href="#menu" onClick={goTo('menu')} className="site-link hidden sm:inline">Menu</a>}
                        <a href="#visit" onClick={goTo('visit')} className="site-link">Visit</a>
                        {!onlineOrdering && (
                            <a href={RESTAURANT.mapsUrl} target="_blank" rel="noreferrer" className="site-link hidden items-center gap-1 sm:inline-flex">
                                Directions <PiArrowUpRight />
                            </a>
                        )}
                    </nav>
                </div>
            </header>
            {onlineOrdering && (
                <a href="/order" className="fixed right-5 top-[14px] z-50 rounded-full bg-gold px-4 py-2 text-[13px] font-semibold text-ink transition-transform hover:-translate-y-0.5 sm:right-10 sm:top-[22px]" data-cursor="Order">
                    Order online
                </a>
            )}

            {/* Chapter marker */}
            <p className="pointer-events-none fixed bottom-6 left-5 z-50 hidden items-center gap-3 font-code text-[10px] uppercase tracking-[0.35em] text-white mix-blend-difference sm:left-10 md:flex" aria-hidden="true">
                <span className="tabular-nums">{String(chapter + 1).padStart(2, '0')}</span>
                <span className="h-px w-10 bg-white/60" />
                <span key={chapter} className="qb-fade">{CHAPTERS[chapter]}</span>
            </p>

            <main>
                <Hero revealed={revealed} onlineOrdering={onlineOrdering} />
                <Statement text="Every plate here begins as an *offering.*" />
                <MorningWindow />
                <StackedDishes />
                {onlineOrdering
                    ? <Marquee words={['Order ahead', 'Pay by UPI', 'Skip the queue']} href="/order" cursor="Order" label="Order online" />
                    : <Marquee words={[RESTAURANT.word, RESTAURANT.area]} />}
                {menu.length > 0 && <MenuSection menu={menu} pricesIncludeGst={Boolean(restaurant?.pricesIncludeGst)} onlineOrdering={onlineOrdering} />}
                <Visit restaurant={restaurant} board={board} onlineOrdering={onlineOrdering} />
            </main>
        </div>
    );
}
