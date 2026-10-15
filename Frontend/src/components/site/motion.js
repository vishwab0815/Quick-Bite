import { useEffect, useRef, useState } from 'react';

export const prefersReducedMotion = () =>
    typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

export const clamp01 = (value) => Math.min(1, Math.max(0, value));

export const smoothstep = (from, to, value) => {
    const x = clamp01((value - from) / (to - from));
    return x * x * (3 - 2 * x);
};

/**
 * Calls onProgress(0..1) once per animation frame while the page scrolls.
 * 'pin':  0 when the element's top reaches the top of the screen, 1 when its bottom reaches the bottom
 *         (sticky sections taller than the screen).
 * 'pass': 0 when the element enters at the bottom of the screen, 1 when it leaves at the top.
 * The callback writes straight to the DOM, so scrolling never re-renders React.
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
            callback.current(clamp01(progress));
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

/** True once the element comes within `margin` of the screen (then stays true) */
export const useNear = (ref, margin = '120% 0px', initial = false) => {
    const [near, setNear] = useState(initial);
    useEffect(() => {
        if (near) return undefined;
        const node = ref.current;
        if (!node || typeof IntersectionObserver === 'undefined') {
            setNear(true);
            return undefined;
        }
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setNear(true);
                observer.disconnect();
            }
        }, { rootMargin: margin });
        observer.observe(node);
        return () => observer.disconnect();
    }, [ref, margin, near]);
    return near;
};

/**
 * Text "beats" inside a scroll scene: every element with data-beat="from,to" fades and rises in
 * as progress passes `from`, and drifts out before `to` (a beat starting at 0 is visible at once,
 * a beat ending at 1 stays).
 */
export const applyBeats = (nodes, progress) => {
    for (const node of nodes) {
        const [from, to] = node.dataset.beat.split(',').map(Number);
        const fade = Math.min(0.12, (to - from) / 3);
        const shown = from <= 0 ? 1 : smoothstep(from, from + fade, progress);
        const kept = to >= 1 ? 1 : 1 - smoothstep(to - fade, to, progress);
        const opacity = shown * kept;
        node.style.opacity = opacity.toFixed(3);
        node.style.transform = `translate3d(0, ${(-(1 - kept) * 40).toFixed(1)}px, 0)`;
        node.style.visibility = opacity < 0.01 ? 'hidden' : 'visible';
        // Words inside play their rise while the beat is on screen
        node.classList.toggle('is-in', opacity > 0.35);
    }
};

/** True once the element is well inside the screen (then stays true) */
export const useInView = (ref, { threshold = 0.3, rootMargin = '0px 0px -8% 0px', disabled = false } = {}) => {
    const [inView, setInView] = useState(false);
    useEffect(() => {
        if (disabled || inView) return undefined;
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
        }, { threshold, rootMargin });
        observer.observe(node);
        return () => observer.disconnect();
    }, [ref, threshold, rootMargin, disabled, inView]);
    return inView;
};
