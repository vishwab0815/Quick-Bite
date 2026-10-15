import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { RESTAURANT } from '../../site/restaurant';
import { prefersReducedMotion } from './motion';

// Dishes that flicker through the little frame while the page gets ready
const FLICKER = ['/site/course-vade.webp', '/site/masala-dosa.webp', '/site/vada-kaapi.webp', '/site/ghee-roast.webp', '/site/upma.webp', '/site/oota.webp'];
const MIN_MS = 1900;
const MAX_MS = 4500;
const LIFT_MS = 1150;
const FLICKER_MS = 170;

/**
 * Opening curtain: dishes flicker in a small frame with a counter while the page gets ready,
 * then the curtain lifts and the opening screen plays its entrance.
 */
const Preloader = ({ heroSrc, onReveal, onDone }) => {
    const [loaded, setLoaded] = useState(0);
    const [shown, setShown] = useState(0);
    const [index, setIndex] = useState(0);
    const [phase, setPhase] = useState('loading');
    const startedAt = useRef(Date.now());
    const total = FLICKER.length + 1;

    // Load the flicker dishes and the hero photo
    useEffect(() => {
        let alive = true;
        [...FLICKER, heroSrc].forEach((src) => {
            const image = new Image();
            image.onload = image.onerror = () => alive && setLoaded((count) => count + 1);
            image.src = src;
        });
        return () => {
            alive = false;
        };
    }, [heroSrc]);

    // Counter eases towards the real progress; dishes flicker while loading
    useEffect(() => {
        if (phase !== 'loading') return undefined;
        const timer = setInterval(() => {
            const elapsed = Date.now() - startedAt.current;
            const target = Math.min(loaded / total, elapsed / MIN_MS, 1);
            setShown((value) => Math.max(Math.min(1, elapsed / MAX_MS), value + (target - value) * 0.2));
            setIndex((value) => value + 1);
        }, FLICKER_MS);
        return () => clearInterval(timer);
    }, [phase, loaded, total]);

    useEffect(() => {
        if (phase === 'loading' && (shown >= 0.99 || prefersReducedMotion())) {
            setPhase('leaving');
            onReveal();
        }
    }, [phase, shown, onReveal]);

    useEffect(() => {
        if (phase !== 'leaving') return undefined;
        const timer = setTimeout(() => {
            setPhase('gone');
            onDone();
        }, prefersReducedMotion() ? 0 : LIFT_MS);
        return () => clearTimeout(timer);
    }, [phase, onDone]);

    if (phase === 'gone') return null;
    return (
        <div className={`site-loader fixed inset-0 z-[100] bg-ink text-paper ${phase === 'leaving' ? 'is-leaving' : ''}`} aria-hidden="true">
            <div className="site-loader__frame absolute left-1/2 top-1/2 aspect-[4/5] w-[44vw] max-w-[260px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[4px] sm:w-[22vw]">
                <img src={FLICKER[index % FLICKER.length]} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="site-loader__meta pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between px-5 pb-6 sm:px-10 sm:pb-8">
                <div>
                    <p className="font-kn text-xl text-gold sm:text-2xl">{RESTAURANT.wordKn}</p>
                    <p className="mt-2 font-code text-[10px] uppercase tracking-[0.35em] text-paper/50">{RESTAURANT.area} · {RESTAURANT.city}</p>
                </div>
                <p className="font-accent text-7xl leading-none tabular-nums sm:text-9xl">{Math.round(shown * 100)}</p>
            </div>
        </div>
    );
};

Preloader.propTypes = {
    heroSrc: PropTypes.string.isRequired,
    onReveal: PropTypes.func.isRequired,
    onDone: PropTypes.func.isRequired,
};

export default Preloader;
