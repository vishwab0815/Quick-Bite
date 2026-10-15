import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion, useMediaQuery } from './motion';

/**
 * A soft ring that trails the pointer and grows over links and photos, with a word for
 * elements marked data-cursor="Order". Mouse / trackpad only; the normal cursor stays.
 */
const Cursor = () => {
    const ringRef = useRef(null);
    const [label, setLabel] = useState('');
    const [active, setActive] = useState(false);
    const fine = useMediaQuery('(hover: hover) and (pointer: fine)');
    const enabled = fine && !prefersReducedMotion();

    useEffect(() => {
        if (!enabled) return undefined;
        const target = { x: -100, y: -100 };
        const current = { x: -100, y: -100 };
        let frame = requestAnimationFrame(function loop() {
            current.x += (target.x - current.x) * 0.2;
            current.y += (target.y - current.y) * 0.2;
            if (ringRef.current) ringRef.current.style.transform = `translate3d(${current.x}px, ${current.y}px, 0)`;
            frame = requestAnimationFrame(loop);
        });
        const onMove = (event) => {
            target.x = event.clientX;
            target.y = event.clientY;
            const hit = event.target.closest?.('[data-cursor], a, button');
            setActive(Boolean(hit));
            setLabel(hit?.dataset?.cursor || '');
        };
        window.addEventListener('pointermove', onMove, { passive: true });
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('pointermove', onMove);
        };
    }, [enabled]);

    if (!enabled) return null;

    return (
        <div ref={ringRef} className="pointer-events-none fixed left-0 top-0 z-[90] mix-blend-difference" aria-hidden="true">
            <div className={`site-cursor ${active ? 'is-active' : ''} ${label ? 'has-label' : ''}`}>
                <span>{label}</span>
            </div>
        </div>
    );
};

export default Cursor;
