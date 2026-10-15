import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { RESTAURANT } from '../../site/restaurant';
import { prefersReducedMotion } from './motion';

const READY_AT = 0.3;      // enough of the opening film to scrub smoothly
const MIN_MS = 1100;
const MAX_MS = 3200;

/**
 * Opening curtain: the name in Kannada and a counter while the first frames arrive,
 * then it lifts away. Never holds the page for more than a few seconds.
 */
const Preloader = ({ progress, onDone }) => {
    const [shown, setShown] = useState(0);
    const [leaving, setLeaving] = useState(false);
    const [gone, setGone] = useState(false);
    const [startedAt] = useState(() => Date.now());

    // The counter eases towards the real progress
    useEffect(() => {
        const target = Math.min(1, progress / READY_AT);
        const timer = setInterval(() => {
            const waited = Date.now() - startedAt;
            const floor = Math.min(1, waited / MAX_MS);
            setShown((value) => Math.min(1, Math.max(floor, value + (target - value) * 0.18)));
        }, 40);
        return () => clearInterval(timer);
    }, [progress, startedAt]);

    useEffect(() => {
        if (leaving) return;
        const ready = shown >= 0.995 && Date.now() - startedAt >= MIN_MS;
        if (ready || prefersReducedMotion()) setLeaving(true);
    }, [shown, leaving, startedAt]);

    // Once the curtain starts to lift, hand the page over when it has gone
    useEffect(() => {
        if (!leaving) return undefined;
        const timer = setTimeout(() => {
            setGone(true);
            onDone();
        }, prefersReducedMotion() ? 0 : 1100);
        return () => clearTimeout(timer);
    }, [leaving, onDone]);

    if (gone) return null;

    return (
        <div className={`site-preloader fixed inset-0 z-[100] flex flex-col items-center justify-center bg-ink text-paper ${leaving ? 'is-leaving' : ''}`} aria-hidden="true">
            <p className="site-preloader__word font-kn text-[clamp(2.6rem,9vw,6rem)] leading-none text-gold">{RESTAURANT.wordKn}</p>
            <p className="mt-6 font-code text-[11px] uppercase tracking-[0.4em] text-stone-500">{RESTAURANT.area} · {RESTAURANT.city}</p>
            <p className="absolute bottom-8 right-8 font-accent text-6xl tabular-nums text-paper/80 sm:text-8xl">{Math.round(shown * 100)}</p>
            <span className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-gold" style={{ transform: `scaleX(${shown})` }} />
        </div>
    );
};

Preloader.propTypes = {
    progress: PropTypes.number.isRequired,
    onDone: PropTypes.func.isRequired,
};

export default Preloader;
