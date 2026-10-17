import { memo, useEffect, useRef, useState } from 'react';
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
    const [phase, setPhase] = useState('loading');
    const loaded = useRef(false);
    const barRef = useRef(null);
    const countRef = useRef(null);

    // The opening photo (and the fonts the name is set in) must be ready before the curtain parts
    useEffect(() => {
        const image = new Image();
        image.decoding = 'async';
        const done = () => {
            const fonts = document.fonts?.ready || Promise.resolve();
            // Decode off the main thread, so the first frame of the reveal doesn't stall on it
            Promise.all([image.decode?.().catch(() => {}), fonts]).finally(() => {
                loaded.current = true;
            });
        };
        image.onload = done;
        image.onerror = () => {
            loaded.current = true;
        };
        image.src = heroSrc;
    }, [heroSrc]);

    // The counter and the line are written straight to the page - no re-rendering 20 times a second
    useEffect(() => {
        if (phase !== 'loading') return undefined;
        if (prefersReducedMotion()) {
            setPhase('parting');
            onReveal();
            return undefined;
        }
        const startedAt = performance.now();
        let shown = 0;
        let lastCount = -1;
        const timer = setInterval(() => {
            const elapsed = performance.now() - startedAt;
            const target = Math.min(loaded.current ? 1 : 0.9, elapsed / MIN_MS, 1);
            shown = Math.max(Math.min(1, elapsed / MAX_MS), shown + (target - shown) * 0.16);
            const count = Math.round(shown * 100);
            if (count !== lastCount) {
                lastCount = count;
                if (barRef.current) barRef.current.style.transform = `scaleX(${shown.toFixed(3)})`;
                if (countRef.current) countRef.current.textContent = String(count);
            }
            if (shown >= 0.99) {
                clearInterval(timer);
                setPhase('parting');
                onReveal();
            }
        }, 50);
        return () => clearInterval(timer);
    }, [phase, onReveal]);

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
                        <span ref={barRef} className="absolute inset-0 origin-left bg-gold" style={{ transform: 'scaleX(0)' }} />
                    </span>
                    <span ref={countRef} className="w-10 text-right font-accent text-2xl tabular-nums text-paper/80">0</span>
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

export default memo(Preloader);
