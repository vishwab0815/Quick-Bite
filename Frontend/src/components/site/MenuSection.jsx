import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { formatPrice } from '../../utils/pos';
import { dishPhoto } from '../../utils/foodPhotos';
import { prefersReducedMotion, useMediaQuery } from './motion';
import { RevealFade, RevealWords } from './Reveal';

const FIRST_VIEW = 14;

const VegMark = ({ isVeg }) => (
    <span
        className={`flex h-3 w-3 shrink-0 items-center justify-center rounded-[2px] border ${isVeg === false ? 'border-red-700' : 'border-green-700'}`}
        title={isVeg === false ? 'Non-veg' : 'Veg'}
    >
        <span className={`h-1.5 w-1.5 rounded-full ${isVeg === false ? 'bg-red-700' : 'bg-green-700'}`} />
    </span>
);

VegMark.propTypes = { isVeg: PropTypes.bool };

/**
 * Today's menu, live from the restaurant's counter. On a computer the dish's photo
 * floats beside the pointer as you move down the list; on phones each dish shows a thumbnail.
 */
const MenuSection = ({ menu, pricesIncludeGst, onlineOrdering }) => {
    const [all, setAll] = useState(false);
    const [photo, setPhoto] = useState(null);
    const floatRef = useRef(null);
    const target = useRef({ x: 0, y: 0 });
    const current = useRef({ x: 0, y: 0 });
    const pointer = useMediaQuery('(hover: hover) and (pointer: fine)');
    const follow = pointer && !prefersReducedMotion();

    const groups = useMemo(() => {
        const shown = all ? menu : menu.slice(0, FIRST_VIEW);
        const byCategory = new Map();
        for (const item of shown) {
            const key = item.category || 'Menu';
            if (!byCategory.has(key)) byCategory.set(key, []);
            byCategory.get(key).push(item);
        }
        return [...byCategory.entries()];
    }, [menu, all]);

    // The floating photo trails the pointer with a little lag
    useEffect(() => {
        if (!follow) return undefined;
        // Runs only while the photo is catching up with the pointer, then rests
        let frame = 0;
        const loop = () => {
            const now = current.current;
            const goal = target.current;
            now.x += (goal.x - now.x) * 0.16;
            now.y += (goal.y - now.y) * 0.16;
            const settled = Math.abs(goal.x - now.x) < 0.1 && Math.abs(goal.y - now.y) < 0.1;
            if (floatRef.current) floatRef.current.style.transform = `translate3d(${now.x}px, ${now.y}px, 0) translate(-50%, -50%)`;
            frame = settled ? 0 : requestAnimationFrame(loop);
        };
        const onMove = (event) => {
            target.current = { x: event.clientX, y: event.clientY };
            if (!frame) frame = requestAnimationFrame(loop);
        };
        window.addEventListener('pointermove', onMove, { passive: true });
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('pointermove', onMove);
        };
    }, [follow]);

    return (
        <section id="menu" data-chapter="Menu" className="relative flex min-h-[100svh] flex-col justify-center bg-paper px-5 py-28 text-ink sm:px-12 lg:py-36" onPointerLeave={() => setPhoto(null)}>
            {follow && (
                <div ref={floatRef} className={`site-menu-float pointer-events-none fixed left-0 top-0 z-40 h-56 w-44 overflow-hidden rounded-[4px] shadow-2xl ${photo ? 'is-on' : ''}`} aria-hidden="true">
                    {photo && <img src={photo} alt="" className="h-full w-full object-cover" />}
                </div>
            )}

            <div className="mx-auto max-w-6xl">
                <div className="flex flex-wrap items-end justify-between gap-6">
                    <div>
                        <RevealFade className="flex items-center gap-3 font-code text-[10px] uppercase tracking-[0.4em] text-saffron-deep sm:text-[11px]">
                            <span className="h-px w-8 bg-current opacity-70" /> Today
                        </RevealFade>
                        <RevealWords as="h2" delay={150} by="chars" step={80} text="Today’s *menu.*" className="mt-6 font-accent text-[clamp(3.5rem,8vw,8.5rem)] leading-[0.85]" />
                    </div>
                    <div className="flex flex-col items-start gap-4 sm:items-end">
                        <p className="flex items-center gap-2 font-code text-[11px] uppercase tracking-[0.3em] text-ink/50">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-leaf" /> Live from our counter
                        </p>
                        {onlineOrdering && <a href="/order" className="site-button bg-ink text-paper" data-cursor="Order">Order online →</a>}
                    </div>
                </div>

                <div className="mt-16 grid gap-x-16 gap-y-14 md:grid-cols-2">
                    {groups.map(([category, items], groupIndex) => (
                        <RevealFade key={category} delay={groupIndex * 120}>
                            <h3 className="border-b border-ink/15 pb-3 font-code text-[11px] uppercase tracking-[0.35em] text-ink/50">{category}</h3>
                            <ul className="mt-2">
                                {items.map((item) => {
                                    const src = dishPhoto(item);
                                    return (
                                        <li
                                            key={item.name}
                                            className="flex items-center gap-3 py-3"
                                            onPointerEnter={() => follow && setPhoto(src)}
                                            onPointerLeave={() => follow && setPhoto(null)}
                                        >
                                            {src && <img src={src} alt="" loading="lazy" className="h-11 w-11 shrink-0 rounded-[4px] object-cover md:hidden" />}
                                            <VegMark isVeg={item.isVeg} />
                                            <span className="font-accent text-2xl leading-tight sm:text-[28px]">{item.name}</span>
                                            <span className="mt-3 min-w-6 flex-1 self-center border-b border-dotted border-ink/25" />
                                            <span className="font-code text-sm tabular-nums text-ink/80">{formatPrice(item.price)}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </RevealFade>
                    ))}
                </div>

                <div className="mt-14 flex flex-wrap items-center justify-between gap-4 text-sm text-ink/50">
                    {pricesIncludeGst ? <p>All prices include GST.</p> : <span />}
                    {menu.length > FIRST_VIEW && (
                        <button type="button" onClick={() => setAll((value) => !value)} className="site-link font-semibold text-ink">
                            {all ? 'Show less' : `See all ${menu.length} dishes`}
                        </button>
                    )}
                </div>
            </div>
        </section>
    );
};

MenuSection.propTypes = {
    menu: PropTypes.arrayOf(PropTypes.shape({
        name: PropTypes.string,
        price: PropTypes.number,
        category: PropTypes.string,
        isVeg: PropTypes.bool,
        image: PropTypes.string,
    })).isRequired,
    pricesIncludeGst: PropTypes.bool,
    onlineOrdering: PropTypes.bool,
};

export default MenuSection;
