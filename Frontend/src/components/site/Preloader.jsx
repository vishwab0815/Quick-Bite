import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import Mandala from './Mandala';
import { RESTAURANT } from '../../site/restaurant';
import { prefersReducedMotion } from './motion';

const MIN_MS = 2600;
const MAX_MS = 5200;
const PART_MS = 1400;

/**
 * Opening: a gold mandala draws itself on, ring by ring, each ring turning at its own pace,
 * with the name blooming at its centre and a counter below. When the page is ready the
 * mandala flares, and the two halves of the curtain part.
 */
const Preloader = ({ heroSrc, onReveal, onDone }) => {
    const [loaded, setLoaded] = useState(false);
    const [shown, setShown] = useState(0);
    const [phase, setPhase] = useState('loading');
    const startedAt = useRef(Date.now());

    useEffect(() => {
        const image = new Image();
        image.onload = () => setLoaded(true);
        image.onerror = () => setLoaded(true);
        image.src = heroSrc;
    }, [heroSrc]);

    useEffect(() => {
        if (phase !== 'loading') return undefined;
        const timer = setInterval(() => {
            const elapsed = Date.now() - startedAt.current;
            const target = Math.min(loaded ? 1 : 0.9, elapsed / MIN_MS, 1);
            setShown((value) => Math.max(Math.min(1, elapsed / MAX_MS), value + (target - value) * 0.16));
        }, 50);
        return () => clearInterval(timer);
    }, [phase, loaded]);

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

    return (
        <div className={`site-loader fixed inset-0 z-[100] text-paper ${phase === 'parting' ? 'is-parting' : ''}`} aria-hidden="true">
            <div className="site-loader__half site-loader__half--top" />
            <div className="site-loader__half site-loader__half--bottom" />

            <div className="site-loader__content absolute inset-0 flex flex-col items-center justify-center px-6">
                <div className="relative flex h-[min(72vw,440px)] w-[min(72vw,440px)] items-center justify-center text-gold">
                    <Mandala className="absolute inset-0 h-full w-full" />
                    <div className="site-loader__core relative w-[72%] text-center">
                        <p className="font-code text-[8px] uppercase tracking-[0.4em] text-paper/50 sm:text-[9px]">Udupi Sri Krishna</p>
                        <p className="site-loader__word mt-1.5 font-kn text-[clamp(1.4rem,5.2vw,2.1rem)] leading-[1.3]">{RESTAURANT.wordKn}</p>
                    </div>
                </div>
                <div className="mt-8 flex w-[min(320px,64vw)] items-center gap-4">
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
