import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

/**
 * Tiny stale-while-revalidate cache for the counter screens.
 * - Returning to a screen shows its last data instantly, then refreshes quietly
 * - Identical requests in flight are shared, never sent twice
 * - Polling pauses while the browser tab is hidden
 */

const cache = new Map(); // key -> { data, error, updatedAt }
const inFlight = new Map(); // key -> promise
const listeners = new Map(); // key -> Set<() => void>

const notify = (key) => listeners.get(key)?.forEach((listener) => listener());

const subscribe = (key, listener) => {
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key).add(listener);
    return () => listeners.get(key)?.delete(listener);
};

export const fetchQuery = (key, fetcher) => {
    if (inFlight.has(key)) return inFlight.get(key);

    const promise = fetcher()
        .then((data) => {
            cache.set(key, { data, error: null, updatedAt: Date.now() });
            return data;
        })
        .catch((error) => {
            cache.set(key, { ...cache.get(key), error });
            throw error;
        })
        .finally(() => {
            inFlight.delete(key);
            notify(key);
        });

    inFlight.set(key, promise);
    return promise;
};

/**
 * Update cached data locally (e.g. after a save) - every screen using the key re-renders
 */
export const setQueryData = (key, updater) => {
    const current = cache.get(key)?.data;
    const data = typeof updater === 'function' ? updater(current) : updater;
    cache.set(key, { data, error: null, updatedAt: Date.now() });
    notify(key);
};

export const getQueryData = (key) => cache.get(key)?.data;

/**
 * @param {string|null} key      cache key (null = disabled)
 * @param {() => Promise<any>} fetcher
 * @param {{ refreshInterval?: number, staleTime?: number }} options
 */
export const useCachedQuery = (key, fetcher, { refreshInterval = 0, staleTime = 0 } = {}) => {
    const fetcherRef = useRef(fetcher);
    fetcherRef.current = fetcher;

    const entry = useSyncExternalStore(
        useCallback((listener) => (key ? subscribe(key, listener) : () => {}), [key]),
        () => (key ? cache.get(key) : undefined)
    );

    const refresh = useCallback(
        () => (key ? fetchQuery(key, () => fetcherRef.current()).catch(() => undefined) : Promise.resolve()),
        [key]
    );

    // Load on mount / key change unless the cached copy is still fresh
    useEffect(() => {
        if (!key) return;
        const cached = cache.get(key);
        if (!cached?.updatedAt || Date.now() - cached.updatedAt > staleTime) refresh();
    }, [key, staleTime, refresh]);

    // Background polling, paused while the tab is hidden
    useEffect(() => {
        if (!key || !refreshInterval) return undefined;
        const timer = setInterval(() => {
            if (document.visibilityState === 'visible') refresh();
        }, refreshInterval);
        const onVisible = () => {
            if (document.visibilityState === 'visible') refresh();
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [key, refreshInterval, refresh]);

    return {
        data: entry?.data,
        error: entry?.error || null,
        isLoading: Boolean(key) && entry?.data === undefined && !entry?.error,
        refresh,
        mutate: useCallback((updater) => key && setQueryData(key, updater), [key]),
    };
};
