import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Nav from '../components/site/Nav';
import Preloader from '../components/site/Preloader';
import Cursor from '../components/site/Cursor';
import { Hero, Statement } from '../components/site/Hero';
import { OotaChapter, OrderChapter, StackedDishes } from '../components/site/Chapters';
import Morning from '../components/site/Morning';
import MenuSection from '../components/site/MenuSection';
import Visit from '../components/site/Visit';
import { documentBox, prefersReducedMotion, setChapter, subscribeScroll, useChapter } from '../components/site/motion';
import { RESTAURANT, publicPaths } from '../site/restaurant';
import { posApi } from '../utils/pos';

const LIVE_REFRESH_MS = 15000;
const heroSrc = () => (window.matchMedia('(max-width: 767px)').matches ? '/site/hero-m.webp' : '/site/hero.webp');

// Weighted smooth scrolling is for mouse wheels and trackpads. Touch screens already scroll
// smoothly on the compositor; running Lenis there only adds main-thread work and lag.
const wantsSmoothScroll = () => !prefersReducedMotion() && window.matchMedia('(pointer: fine)').matches;

// The sections never change when the live token board refreshes, so they skip those re-renders
const MemoHero = memo(Hero);
const MemoStatement = memo(Statement);
const MemoMorning = memo(Morning);
const MemoOota = memo(OotaChapter);
const MemoDishes = memo(StackedDishes);
const MemoOrder = memo(OrderChapter);
const MemoMenu = memo(MenuSection);
const MemoVisit = memo(Visit);

/** The small "03 — Morning" marker; re-renders on its own when the chapter changes */
const ChapterMarker = () => {
    const chapter = useChapter();
    return (
        <p className={`site-marker pointer-events-none fixed bottom-6 left-5 z-50 hidden items-center gap-3 font-code text-[10px] uppercase tracking-[0.35em] text-white mix-blend-difference transition-opacity duration-500 sm:left-10 md:flex ${chapter.name === 'Welcome' ? 'opacity-0' : 'opacity-100'}`} aria-hidden="true">
            <span className="tabular-nums">{String(chapter.number).padStart(2, '0')}</span>
            <span className="h-px w-10 bg-white/60" />
            <span key={chapter.name} className="qb-fade">{chapter.name}</span>
        </p>
    );
};

const ChapterNav = (props) => <Nav chapter={useChapter().name} {...props} />;

/**
 * Udupi Sri Krishna Naivedya - the restaurant's own website. Every chapter fills the screen:
 * welcome, the offering, morning, lunch, the table, ordering online (when it is switched on),
 * today's menu (live from the counter) and how to visit.
 */
export default function RestaurantSite() {
    const [info, setInfo] = useState(null);
    const [board, setBoard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [revealed, setRevealed] = useState(false);
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

    // Smooth, weighted scrolling on computers (loaded on its own, after the page is up)
    useEffect(() => {
        if (!wantsSmoothScroll()) return undefined;
        let lenis = null;
        let frame = 0;
        let cancelled = false;
        import('lenis').then(({ default: Lenis }) => {
            if (cancelled) return;
            lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
            lenisRef.current = lenis;
            if (document.documentElement.style.overflow === 'hidden') lenis.stop();
            const loop = (time) => {
                lenis.raf(time);
                frame = requestAnimationFrame(loop);
            };
            frame = requestAnimationFrame(loop);
        }).catch(() => {});
        return () => {
            cancelled = true;
            cancelAnimationFrame(frame);
            lenis?.destroy();
            lenisRef.current = null;
        };
    }, []);

    // Coming back to this page (reload, back button) shouldn't open half-way down behind the
    // loader; the rest of the app keeps the browser's normal scroll restoring
    useEffect(() => {
        if (!('scrollRestoration' in history)) return undefined;
        const previous = history.scrollRestoration;
        history.scrollRestoration = 'manual';
        return () => {
            history.scrollRestoration = previous;
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

    // Reading progress line, and which chapter is on screen - from cached section positions
    useEffect(() => {
        let sections = [];
        let max = 1;
        let lastScale = -1;
        return subscribeScroll({
            measure: (height) => {
                sections = [...(pageRef.current?.querySelectorAll('[data-chapter]') || [])]
                    .map((node) => ({ top: documentBox(node).top, name: node.dataset.chapter }));
                max = Math.max(1, document.documentElement.scrollHeight - height);
                lastScale = -1;
            },
            update: (y, height) => {
                const scale = Math.min(1, Math.max(0, y / max));
                if (Math.abs(scale - lastScale) > 0.0005) {
                    lastScale = scale;
                    if (progressRef.current) progressRef.current.style.transform = `scaleX(${scale.toFixed(4)})`;
                }
                const middle = y + height / 2;
                let index = -1;
                for (let i = 0; i < sections.length; i += 1) if (sections[i].top <= middle) index = i;
                if (index >= 0) setChapter(index + 1, sections[index].name);
            },
        });
    }, []);

    // Endless animations (marquee, map pin, pulsing dots) rest while their section is off screen
    useEffect(() => {
        if (typeof IntersectionObserver === 'undefined') return undefined;
        const watcher = new IntersectionObserver((entries) => {
            for (const entry of entries) entry.target.toggleAttribute('data-offscreen', !entry.isIntersecting);
        }, { rootMargin: '20% 0px' });
        for (const section of pageRef.current?.querySelectorAll('main > section') || []) watcher.observe(section);
        return () => watcher.disconnect();
    }, [info]);

    const reveal = useCallback(() => setRevealed(true), []);
    const finishLoading = useCallback(() => setLoading(false), []);

    const goTo = useCallback((id) => (event) => {
        event.preventDefault();
        const target = document.getElementById(id);
        if (!target) return;
        if (lenisRef.current) lenisRef.current.scrollTo(target, { duration: 1.6 });
        else target.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }, []);
    const onMenu = useMemo(() => goTo('menu'), [goTo]);

    const menu = useMemo(() => info?.menu || [], [info]);
    const restaurant = info?.restaurant;
    const onlineOrdering = Boolean(restaurant?.onlineOrdering);

    return (
        <div ref={pageRef} className="qb-site min-h-screen bg-ink text-paper">
            {loading && <Preloader heroSrc={hero} onReveal={reveal} onDone={finishLoading} />}
            <Cursor />
            <div ref={progressRef} className="fixed inset-x-0 top-0 z-[60] h-px origin-left bg-gold will-change-transform" style={{ transform: 'scaleX(0)' }} aria-hidden="true" />

            <ChapterNav hasMenu={menu.length > 0} onlineOrdering={onlineOrdering} restaurant={restaurant} goTo={goTo} />
            <ChapterMarker />

            <main>
                <MemoHero
                    revealed={revealed}
                    onlineOrdering={onlineOrdering}
                    hasMenu={menu.length > 0}
                    hours={restaurant?.hours}
                    onMenu={onMenu}
                />
                <MemoStatement warmup={revealed} />
                <MemoMorning />
                <MemoOota />
                <MemoDishes />
                {onlineOrdering && <MemoOrder />}
                {menu.length > 0 && <MemoMenu menu={menu} pricesIncludeGst={Boolean(restaurant?.pricesIncludeGst)} onlineOrdering={onlineOrdering} />}
                <MemoVisit restaurant={restaurant} board={board} onlineOrdering={onlineOrdering} />
            </main>
        </div>
    );
}
