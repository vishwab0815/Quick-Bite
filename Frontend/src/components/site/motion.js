import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

export const prefersReducedMotion = () =>
    typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

export const clamp01 = (value) => Math.min(1, Math.max(0, value));

export const smoothstep = (from, to, value) => {
    const x = clamp01((value - from) / (to - from));
    return x * x * (3 - 2 * x);
};

/** Run work when the browser is idle (falls back to a short timeout) */
export const whenIdle = (work, timeout = 1500) => {
    if (typeof window === 'undefined') return () => {};
    if ('requestIdleCallback' in window) {
        const id = window.requestIdleCallback(work, { timeout });
        return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(work, 60);
    return () => window.clearTimeout(id);
};

/** A promise that resolves at the next idle moment - for splitting heavy work into slices */
export const idle = (timeout = 400) => new Promise((resolve) => whenIdle(resolve, timeout));

/**
 * How much this device can comfortably do, decided once:
 * - 'low':  data saver on, a 2G connection, 2 GB of memory or less, or 2 CPU cores or fewer.
 *           Gets the same page with a still image instead of the live 3D scene.
 * - 'mid':  phones and tablets (touch screens), and small computers. Live 3D at a lighter
 *           quality, and no frosted-glass blur.
 * - 'high': computers with a mouse and enough cores. Everything, at full quality.
 * (Safari reports at most 4 cores and no memory figure, so iPhones land in 'mid' - right for them.)
 */
let tierCache = null;
export const deviceTier = () => {
    if (tierCache) return tierCache;
    if (typeof window === 'undefined') return 'high';
    const connection = navigator.connection || {};
    const cores = navigator.hardwareConcurrency || 4;
    const memory = navigator.deviceMemory;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    let tier = 'high';
    if (connection.saveData || /2g$/.test(connection.effectiveType || '') || (memory && memory <= 2) || cores <= 2) tier = 'low';
    else if (coarse || cores <= 4) tier = 'mid';
    tierCache = tier;
    document.documentElement.dataset.tier = tier;
    return tier;
};

/* ------------------------------------------------------------------------------------------
 * One scroll engine for the whole page.
 *
 * Instead of every animated section listening to scroll and measuring itself with
 * getBoundingClientRect() every frame (which makes the browser recalculate layout several
 * times a frame), there is one listener and one animation frame per scrolled frame. Element
 * positions are measured only when the layout can have changed - resize, rotation, fonts
 * loading, content growing - and each frame works from scrollY and those cached numbers.
 * ------------------------------------------------------------------------------------------ */
const subscribers = new Set();
let frame = 0;
let measurePending = true;
let viewport = typeof window !== 'undefined' ? window.innerHeight : 800;
let bodyObserver = null;

const measureAll = () => {
    measurePending = false;
    viewport = window.innerHeight;
    for (const subscriber of subscribers) subscriber.measure?.(viewport);
};

const run = () => {
    frame = 0;
    if (measurePending) measureAll();
    const y = window.scrollY;
    for (const subscriber of subscribers) subscriber.update(y, viewport);
};

export const scheduleFrame = () => {
    if (!frame) frame = requestAnimationFrame(run);
};

const invalidate = () => {
    measurePending = true;
    scheduleFrame();
};

const start = () => {
    window.addEventListener('scroll', scheduleFrame, { passive: true });
    window.addEventListener('resize', invalidate, { passive: true });
    window.addEventListener('orientationchange', invalidate);
    window.addEventListener('pageshow', invalidate);
    document.fonts?.addEventListener?.('loadingdone', invalidate);
    document.fonts?.ready?.then(invalidate);
    if (typeof ResizeObserver !== 'undefined') {
        bodyObserver = new ResizeObserver(invalidate);
        bodyObserver.observe(document.body);
    }
};

const stop = () => {
    window.removeEventListener('scroll', scheduleFrame);
    window.removeEventListener('resize', invalidate);
    window.removeEventListener('orientationchange', invalidate);
    window.removeEventListener('pageshow', invalidate);
    document.fonts?.removeEventListener?.('loadingdone', invalidate);
    bodyObserver?.disconnect();
    bodyObserver = null;
    cancelAnimationFrame(frame);
    frame = 0;
};

/** Subscribe { measure(viewport), update(scrollY, viewport) }; returns an unsubscribe function */
export const subscribeScroll = (subscriber) => {
    if (subscribers.size === 0) start();
    subscribers.add(subscriber);
    invalidate();
    return () => {
        subscribers.delete(subscriber);
        if (subscribers.size === 0) stop();
    };
};

/** Force a re-measure on the next frame (after content above has changed size) */
export const remeasure = invalidate;

/** Where an element sits on the page, in document coordinates */
export const documentBox = (node) => {
    const rect = node.getBoundingClientRect();
    return { top: rect.top + window.scrollY, height: rect.height };
};

/**
 * Calls onProgress(0..1) whenever the page scrolls and the value changes.
 * 'pin':  0 when the element's top reaches the top of the screen, 1 when its bottom reaches the bottom
 *         (sticky sections taller than the screen).
 * 'pass': 0 when the element enters at the bottom of the screen, 1 when it leaves at the top.
 * The callback writes straight to the DOM, so scrolling never re-renders React; sections that
 * are off screen (progress pinned at 0 or 1) cost nothing.
 */
export const useScrollProgress = (ref, onProgress, mode = 'pin', enabled = true) => {
    const callback = useRef(onProgress);
    useEffect(() => {
        callback.current = onProgress;
    });

    useEffect(() => {
        const node = ref.current;
        if (!node || !enabled) return undefined;
        let box = { top: 0, height: 0 };
        let last = -1;
        return subscribeScroll({
            measure: () => {
                box = documentBox(node);
                last = -1;
            },
            update: (y, height) => {
                const top = box.top - y;
                const progress = clamp01(mode === 'pin'
                    ? -top / Math.max(1, box.height - height)
                    : (height - top) / (height + box.height));
                if (progress === last) return;
                last = progress;
                callback.current(progress);
            },
        });
    }, [ref, mode, enabled]);
};

/*
 * Which chapter is on screen. Kept outside React state so a chapter change re-renders only
 * the two small things that show it (the nav and the chapter marker), never the whole page.
 */
let chapterNow = { number: 1, name: 'Welcome' };
const chapterListeners = new Set();
export const setChapter = (number, name) => {
    if (chapterNow.name === name) return;
    chapterNow = { number, name };
    for (const listener of chapterListeners) listener();
};
const subscribeChapter = (listener) => {
    chapterListeners.add(listener);
    return () => chapterListeners.delete(listener);
};
export const useChapter = () => useSyncExternalStore(subscribeChapter, () => chapterNow, () => chapterNow);

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
