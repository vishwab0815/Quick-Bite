import { useCallback, useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import { PiArrowUpRight } from 'react-icons/pi';
import FrameScroller from '../components/site/FrameScroller';
import Preloader from '../components/site/Preloader';
import Gallery from '../components/site/Gallery';
import MenuSection from '../components/site/MenuSection';
import Visit from '../components/site/Visit';
import { prefersReducedMotion } from '../components/site/motion';
import { RESTAURANT, publicPaths } from '../site/restaurant';
import { posApi } from '../utils/pos';

const LIVE_REFRESH_MS = 15000;

const CHAPTERS = ['Offering', 'Morning', 'The table', 'Menu', 'Visit'];

/**
 * Udupi Sri Krishna Naivedya - the restaurant's own website.
 * A story told in five chapters: two scroll-driven films rendered frame by frame from food
 * photographs, the dishes, today's live menu from the counter, and how to visit.
 */
export default function Landing() {
    const [info, setInfo] = useState(null);
    const [board, setBoard] = useState(null);
    const [heroLoaded, setHeroLoaded] = useState(0);
    const [loading, setLoading] = useState(true);
    const [chapter, setChapter] = useState(0);
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

    // Hold the page still behind the opening curtain
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
            const current = sections.findIndex((section) => {
                const rect = section.getBoundingClientRect();
                return rect.top <= middle && rect.bottom > middle;
            });
            if (current >= 0) setChapter(CHAPTERS.indexOf(sections[current].dataset.chapter));
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

    const onHeroProgress = useCallback((value) => setHeroLoaded(value), []);
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

    return (
        <div ref={pageRef} className="qb-site min-h-screen bg-ink text-paper">
            {loading && <Preloader progress={heroLoaded} onDone={finishLoading} />}
            <div ref={progressRef} className="fixed inset-x-0 top-0 z-[60] h-px origin-left bg-gold" style={{ transform: 'scaleX(0)' }} aria-hidden="true" />

            {/* ---------- Navigation: light text that inverts over any photo ---------- */}
            <header className="pointer-events-none fixed inset-x-0 top-0 z-50 mix-blend-difference">
                <div className="flex items-center justify-between px-5 py-5 text-white sm:px-10 sm:py-7">
                    <a href="#offering" onClick={goTo('offering')} className="pointer-events-auto leading-none" aria-label={`${RESTAURANT.name} - back to top`}>
                        <span className="font-accent text-[26px] sm:text-[30px]">{RESTAURANT.word}</span>
                    </a>
                    <nav className="pointer-events-auto flex items-center gap-6 text-[13px] sm:gap-9" aria-label="Sections">
                        {menu.length > 0 && <a href="#menu" onClick={goTo('menu')} className="site-link hidden sm:inline">Menu</a>}
                        <a href="#visit" onClick={goTo('visit')} className="site-link">Visit</a>
                        <a href={RESTAURANT.mapsUrl} target="_blank" rel="noreferrer" className="site-link hidden items-center gap-1 sm:inline-flex">
                            Directions <PiArrowUpRight />
                        </a>
                    </nav>
                </div>
            </header>

            {/* Chapter marker */}
            <p className="pointer-events-none fixed bottom-6 left-5 z-50 hidden items-center gap-3 font-code text-[10px] uppercase tracking-[0.35em] text-white mix-blend-difference sm:left-10 md:flex" aria-hidden="true">
                <span className="tabular-nums">{String(chapter + 1).padStart(2, '0')}</span>
                <span className="h-px w-10 bg-white/60" />
                <span key={chapter} className="qb-fade">{CHAPTERS[chapter]}</span>
            </p>

            <main>
                {/* ---------- 01 · The offering: a banana-leaf feast revealed from its flowers ---------- */}
                <FrameScroller
                    id="offering"
                    chapter="Offering"
                    name="feast"
                    count={48}
                    screens={3.4}
                    eager
                    onLoadProgress={onHeroProgress}
                    label={RESTAURANT.name}
                >
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(15,14,12,0.55)_0%,rgba(15,14,12,0)_30%,rgba(15,14,12,0)_55%,rgba(15,14,12,0.75)_100%)]" />
                    <div className="site-scene-fade pointer-events-none absolute inset-0 bg-ink" />

                    <div data-beat="0,0.2" className="absolute inset-0 flex flex-col justify-end px-5 pb-10 sm:px-10 md:pb-20">
                        <h1 className="sr-only">{RESTAURANT.name}, {RESTAURANT.area}</h1>
                        <p className="font-kn text-lg text-gold sm:text-2xl" aria-hidden="true">{RESTAURANT.leadKn}</p>
                        <p className={`site-title font-accent text-[clamp(5.5rem,19vw,19rem)] leading-[0.8] tracking-[-0.03em] ${loading ? '' : 'is-in'}`} aria-hidden="true">
                            {RESTAURANT.word}
                        </p>
                        <div className="mt-8 flex items-end justify-between gap-6 whitespace-nowrap font-code text-[10px] uppercase tracking-[0.25em] text-paper/70 sm:text-[11px] sm:tracking-[0.35em]">
                            <span>{RESTAURANT.area} · {RESTAURANT.city}</span>
                            <span className="site-scroll-cue flex items-center gap-3">Scroll <span className="site-scroll-line" /></span>
                        </div>
                    </div>

                    <div data-beat="0.32,0.6" className="absolute inset-0 flex items-center justify-center px-6 text-center">
                        <p className="font-accent text-[clamp(3rem,9vw,8.5rem)] leading-[0.9] drop-shadow-[0_4px_40px_rgba(0,0,0,0.6)]">
                            First, an <em className="text-gold">offering.</em>
                        </p>
                    </div>

                    <div data-beat="0.72,0.97" className="absolute inset-x-0 bottom-0 px-5 pb-12 sm:px-10">
                        <p className="font-accent text-[clamp(3rem,9vw,8.5rem)] leading-[0.9] drop-shadow-[0_4px_40px_rgba(0,0,0,0.6)]">
                            Then, the <em className="text-gold">feast.</em>
                        </p>
                    </div>
                </FrameScroller>

                {/* ---------- 02 · Morning: idli, vade, sambar - then a dive into the kaapi ---------- */}
                <FrameScroller id="morning" chapter="Morning" name="morning" count={44} screens={3.2} label="Morning">
                    <div className="site-scene-rise pointer-events-none absolute inset-0 bg-ink" />
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(15,14,12,0.6)_0%,rgba(15,14,12,0)_55%)]" />

                    <div data-beat="0.04,0.3" className="absolute inset-0 flex flex-col justify-center px-5 sm:px-10">
                        <p className="font-code text-[11px] uppercase tracking-[0.4em] text-gold">02</p>
                        <p className="mt-5 font-kn text-xl text-paper/80 sm:text-2xl" aria-hidden="true">ಬೆಳಗ್ಗೆ</p>
                        <h2 className="font-accent text-[clamp(4rem,13vw,12rem)] leading-[0.85]">Morning.</h2>
                    </div>

                    <div data-beat="0.34,0.58" className="absolute inset-0 flex flex-col justify-center px-5 sm:px-10">
                        <p className="font-accent text-[clamp(3rem,9vw,8rem)] leading-[0.9] drop-shadow-[0_4px_40px_rgba(0,0,0,0.6)]">
                            Idli. Vade.<br /><em className="text-gold">Sambar.</em>
                        </p>
                    </div>

                    <div data-beat="0.64,0.9" className="absolute inset-0 flex items-end justify-end px-5 pb-14 text-right sm:px-10">
                        <p className="font-accent text-[clamp(3rem,9vw,8rem)] leading-[0.9] drop-shadow-[0_4px_40px_rgba(0,0,0,0.7)]">
                            Then,<br /><em className="text-gold">kaapi.</em>
                        </p>
                    </div>
                </FrameScroller>

                {/* ---------- 03 · The table ---------- */}
                <Gallery />

                {/* ---------- 04 · Today's menu, live from the counter ---------- */}
                {menu.length > 0 && <MenuSection menu={menu} pricesIncludeGst={Boolean(restaurant?.pricesIncludeGst)} />}

                {/* ---------- 05 · Visit ---------- */}
                <Visit restaurant={restaurant} board={board} />
            </main>
        </div>
    );
}
