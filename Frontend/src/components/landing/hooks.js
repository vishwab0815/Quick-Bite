import { useEffect, useRef, useState } from 'react';

export const prefersReducedMotion = () =>
    typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

/**
 * Calls onProgress(0..1) once per animation frame while the page scrolls.
 * 'pin':  0 when the element's top reaches the top of the screen, 1 when its bottom reaches the bottom
 *         (for sticky sections taller than the screen).
 * 'pass': 0 when the element enters at the bottom of the screen, 1 when it leaves at the top.
 * The callback writes straight to the DOM, so scrolling never re-renders React unless it chooses to.
 */
export const useScrollProgress = (ref, onProgress, mode = 'pin', enabled = true) => {
    const callback = useRef(onProgress);
    useEffect(() => {
        callback.current = onProgress;
    });

    useEffect(() => {
        const node = ref.current;
        if (!node || !enabled) return undefined;
        let frame = 0;
        const update = () => {
            frame = 0;
            const rect = node.getBoundingClientRect();
            const viewport = window.innerHeight;
            const progress = mode === 'pin'
                ? -rect.top / Math.max(1, rect.height - viewport)
                : (viewport - rect.top) / (viewport + rect.height);
            callback.current(Math.min(1, Math.max(0, progress)));
        };
        const schedule = () => {
            if (!frame) frame = requestAnimationFrame(update);
        };
        update();
        window.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('scroll', schedule);
            window.removeEventListener('resize', schedule);
        };
    }, [ref, mode, enabled]);
};

/** True once the element has scrolled into view */
export const useInView = (ref, { rootMargin = '0px 0px -12% 0px', threshold = 0.15 } = {}) => {
    const [inView, setInView] = useState(false);
    useEffect(() => {
        const node = ref.current;
        if (!node || typeof IntersectionObserver === 'undefined') {
            setInView(true);
            return undefined;
        }
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setInView(true);
                observer.disconnect();
            }
        }, { rootMargin, threshold });
        observer.observe(node);
        return () => observer.disconnect();
    }, [ref, rootMargin, threshold]);
    return inView;
};

export const useMediaQuery = (query) => {
    const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
    useEffect(() => {
        const media = window.matchMedia(query);
        const onChange = () => setMatches(media.matches);
        onChange();
        media.addEventListener('change', onChange);
        return () => media.removeEventListener('change', onChange);
    }, [query]);
    return matches;
};
