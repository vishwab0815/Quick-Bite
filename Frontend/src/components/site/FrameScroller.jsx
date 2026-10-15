import { useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { applyBeats, useMediaQuery, useNear, useScrollProgress } from './motion';

const CONCURRENCY = 6;
const MAX_DPR = 2;

const frameUrl = (name, cut, index) => `/site/seq/${name}/${cut}/${String(index + 1).padStart(3, '0')}.webp`;

/** Load order: first and last frame, then every 8th, 4th, 2nd... so the whole film can be scrubbed early */
const loadOrder = (count) => {
    const order = [0, count - 1];
    const seen = new Set(order);
    for (const stride of [8, 4, 2, 1]) {
        for (let index = 0; index < count; index += stride) {
            if (!seen.has(index)) {
                seen.add(index);
                order.push(index);
            }
        }
    }
    return order;
};

/** Draws an image to fill the canvas (like object-fit: cover) */
const drawCover = (context, image, width, height, alpha) => {
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    context.globalAlpha = alpha;
    context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
};

/**
 * A scroll-driven film: a pinned full-screen canvas that plays a pre-rendered image sequence
 * frame by frame as the page scrolls, cross-fading between neighbouring frames so it stays smooth.
 * Phones in portrait get a portrait cut ('m'), everything else the landscape cut ('d').
 * Children are overlays; elements with data-beat="from,to" fade in and out with the film.
 */
const FrameScroller = ({ id, chapter, name, count, screens = 3, eager = false, onLoadProgress, className = '', label, children }) => {
    const sectionRef = useRef(null);
    const stageRef = useRef(null);
    const canvasRef = useRef(null);
    const framesRef = useRef([]);
    const progressRef = useRef(0);
    const beatsRef = useRef([]);
    const drawFrameRef = useRef(0);
    const portrait = useMediaQuery('(max-aspect-ratio: 4/5)');
    const cut = portrait ? 'm' : 'd';
    const near = useNear(sectionRef, '150% 0px', eager);

    const draw = useCallback(() => {
        drawFrameRef.current = 0;
        const canvas = canvasRef.current;
        const frames = framesRef.current;
        if (!canvas || frames.length === 0) return;
        const context = canvas.getContext('2d');
        const position = progressRef.current * (count - 1);
        const index = Math.floor(position);
        const fraction = position - index;

        // Nearest frame that has arrived (the film sharpens as more frames load)
        let base = null;
        for (let offset = 0; offset < count && !base; offset++) {
            base = frames[index - offset] || frames[index + offset] || null;
        }
        if (!base) return;
        context.clearRect(0, 0, canvas.width, canvas.height);
        drawCover(context, base, canvas.width, canvas.height, 1);
        const next = frames[index + 1];
        if (next && fraction > 0.02 && base === frames[index]) drawCover(context, next, canvas.width, canvas.height, fraction);
        context.globalAlpha = 1;
    }, [count]);

    const scheduleDraw = useCallback(() => {
        if (!drawFrameRef.current) drawFrameRef.current = requestAnimationFrame(draw);
    }, [draw]);

    // Canvas matches the screen (capped at 2x pixels)
    useEffect(() => {
        const canvas = canvasRef.current;
        const stage = stageRef.current;
        if (!canvas || !stage) return undefined;
        const resize = () => {
            const ratio = Math.min(window.devicePixelRatio || 1, MAX_DPR);
            canvas.width = Math.round(stage.clientWidth * ratio);
            canvas.height = Math.round(stage.clientHeight * ratio);
            const context = canvas.getContext('2d');
            context.imageSmoothingQuality = 'high';
            draw();
        };
        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(stage);
        return () => observer.disconnect();
    }, [draw]);

    // Load the frames (for this cut) once the scene is near
    useEffect(() => {
        if (!near) return undefined;
        let cancelled = false;
        const frames = new Array(count).fill(null);
        framesRef.current = frames;
        const order = loadOrder(count);
        let next = 0;
        let done = 0;
        const loadNext = () => {
            if (cancelled || next >= order.length) return;
            const index = order[next++];
            const image = new Image();
            image.decoding = 'async';
            const finish = () => {
                if (cancelled) return;
                done += 1;
                onLoadProgress?.(done / count);
                scheduleDraw();
                loadNext();
            };
            image.onload = () => {
                if (cancelled) return;
                frames[index] = image;
                finish();
            };
            image.onerror = finish;
            image.src = frameUrl(name, cut, index);
        };
        for (let worker = 0; worker < CONCURRENCY; worker++) loadNext();
        return () => {
            cancelled = true;
        };
    }, [near, name, cut, count, onLoadProgress, scheduleDraw]);

    useEffect(() => {
        beatsRef.current = [...(stageRef.current?.querySelectorAll('[data-beat]') || [])];
        applyBeats(beatsRef.current, progressRef.current);
    }, [children]);

    useEffect(() => () => cancelAnimationFrame(drawFrameRef.current), []);

    useScrollProgress(sectionRef, (progress) => {
        progressRef.current = progress;
        sectionRef.current?.style.setProperty('--p', progress.toFixed(4));
        applyBeats(beatsRef.current, progress);
        scheduleDraw();
    });

    return (
        <section id={id} data-chapter={chapter} ref={sectionRef} className={`relative ${className}`} style={{ height: `${screens * 100}svh` }} aria-label={label}>
            <div
                ref={stageRef}
                className="sticky top-0 h-[100svh] overflow-hidden bg-cover bg-center"
                style={{ backgroundImage: `url(${frameUrl(name, cut, 0)})` }}
            >
                <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
                {children}
            </div>
        </section>
    );
};

FrameScroller.propTypes = {
    id: PropTypes.string,
    chapter: PropTypes.string,
    name: PropTypes.string.isRequired,
    count: PropTypes.number.isRequired,
    screens: PropTypes.number,
    eager: PropTypes.bool,
    onLoadProgress: PropTypes.func,
    className: PropTypes.string,
    label: PropTypes.string,
    children: PropTypes.node,
};

export default FrameScroller;
