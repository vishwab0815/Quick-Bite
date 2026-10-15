import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { RESTAURANT } from '../../site/restaurant';
import { prefersReducedMotion } from './motion';

// Dishes that pass through the arch while the page gets ready
const DISHES = ['/site/course-vade.webp', '/site/masala-dosa.webp', '/site/course-idli.webp', '/site/vada-kaapi.webp', '/site/upma.webp'];
const MIN_MS = 2200;
const MAX_MS = 4800;
const PART_MS = 1300;
const DISH_MS = 900;

/**
 * Opening: an arch of dishes slowly crossfading, the name shimmering in gold, a counter and a
 * thin progress line. When ready, the two halves of the curtain part and the page plays in.
 */
const Preloader = ({ heroSrc, onReveal, onDone }) => {
    const [loaded, setLoaded] = useState(0);
    const [shown, setShown] = useState(0);
    const [dish, setDish] = useState(0);
    const [phase, setPhase] = useState('loading');
    const startedAt = useRef(Date.now());
    const total = DISHES.length + 1;

    useEffect(() => {
        let alive = true;
        [...DISHES, heroSrc].forEach((src) => {
            const image = new Image();
            image.onload = image.onerror = () => alive && setLoaded((count) => count + 1);
            image.src = src;
        });
        return () => {
            alive = false;
        };
    }, [heroSrc]);

    // The counter eases towards the real progress; a dish crossfades in every second or so
    useEffect(() => {
        if (phase !== 'loading') return undefined;
        const counter = setInterval(() => {
            const elapsed = Date.now() - startedAt.current;
            const target = Math.min(loaded / total, elapsed / MIN_MS, 1);
            setShown((value) => Math.max(Math.min(1, elapsed / MAX_MS), value + (target - value) * 0.18));
        }, 50);
        const slides = setInterval(() => setDish((value) => value + 1), DISH_MS);
        return () => {
            clearInterval(counter);
            clearInterval(slides);
        };
    }, [phase, loaded, total]);

    useEffect(() => {
        if (phase === 'loading' && (shown >= 0.99 || prefersReducedMotion())) {
            setPhase('parting');
            onReveal();
        }
    }, [phase, shown, onReveal]);

    useEffect(() => {
        if (phase !== 'parting') return undefined;
        const timer = setTimeout(() => {
            setPhase('gone');
            onDone();
        }, prefersReducedMotion() ? 0 : PART_MS);
        return () => clearTimeout(timer);
    }, [phase, onDone]);

    if (phase === 'gone') return null;
    const parting = phase === 'parting';

    return (
        <div className={`site-loader fixed inset-0 z-[100] text-paper ${parting ? 'is-parting' : ''}`} aria-hidden="true">
            <div className="site-loader__half site-loader__half--top" />
            <div className="site-loader__half site-loader__half--bottom" />

            <div className="site-loader__content absolute inset-0 flex flex-col items-center justify-center px-6">
                <p className="font-code text-[10px] uppercase tracking-[0.45em] text-paper/50">Udupi Sri Krishna</p>
                <p className="site-loader__word mt-4 font-kn text-[clamp(2.8rem,8vw,5.5rem)] leading-[1.3]">{RESTAURANT.wordKn}</p>

                <div className="site-loader__arch relative mt-8 aspect-[3/4] w-[38vw] max-w-[200px] overflow-hidden sm:w-[16vw]">
                    {DISHES.map((src, index) => (
                        <img
                            key={src}
                            src={src}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
                            style={{ opacity: index === dish % DISHES.length ? 1 : 0 }}
                        />
                    ))}
                    <span className="absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_rgba(230,168,60,0.45)]" />
                </div>

                <div className="mt-10 flex w-[min(360px,70vw)] items-center gap-4">
                    <span className="relative h-px flex-1 bg-paper/15">
                        <span className="absolute inset-y-0 left-0 bg-gold" style={{ width: `${(shown * 100).toFixed(1)}%` }} />
                    </span>
                    <span className="w-10 text-right font-accent text-2xl tabular-nums text-paper/80">{Math.round(shown * 100)}</span>
                </div>
            </div>

            <p className="site-loader__content absolute bottom-7 left-6 font-code text-[10px] uppercase tracking-[0.35em] text-paper/40 sm:left-10">{RESTAURANT.area} · {RESTAURANT.city}</p>
        </div>
    );
};

Preloader.propTypes = {
    heroSrc: PropTypes.string.isRequired,
    onReveal: PropTypes.func.isRequired,
    onDone: PropTypes.func.isRequired,
};

export default Preloader;
