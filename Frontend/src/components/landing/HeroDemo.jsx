import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { FiCheck, FiMessageCircle, FiPrinter } from 'react-icons/fi';
import VegDot from '../pos/VegDot';
import { formatINR } from '../../utils/pos';

const DEFAULT_DISHES = [
    { name: 'Masala Dosa', price: 80 },
    { name: 'Filter Coffee', price: 30 },
    { name: 'Idli Vada', price: 70 },
    { name: 'Ghee Podi Dosa', price: 100 },
    { name: 'Kesari Bath', price: 45 },
    { name: 'Mini Meals', price: 90 },
];

// What the cashier does in the demo: [dish index] taps, then confirm
const TAPS = [0, 1, 0];
const STEP_MS = 950;
const TOTAL_STEPS = TAPS.length + 6; // taps, confirm, token, print, whatsapp, ready, hold
const TOKEN = 42;

/**
 * Self-playing counter demo: dishes are added, the order is confirmed, a token
 * prints, the bill goes on WhatsApp and the kitchen marks it ready - on a loop.
 */
const HeroDemo = ({ dishes }) => {
    const menu = (dishes?.length >= 3 ? dishes : DEFAULT_DISHES).slice(0, 6);
    const [step, setStep] = useState(0);
    const ref = useRef(null);
    const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    useEffect(() => {
        if (reducedMotion) {
            setStep(TOTAL_STEPS - 1);
            return undefined;
        }
        let visible = true;
        const observer = typeof IntersectionObserver !== 'undefined'
            ? new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; })
            : null;
        if (observer && ref.current) observer.observe(ref.current);

        const timer = setInterval(() => {
            if (visible && document.visibilityState === 'visible') {
                setStep((current) => (current + 1) % (TOTAL_STEPS + 1));
            }
        }, STEP_MS);
        return () => {
            clearInterval(timer);
            observer?.disconnect();
        };
    }, [reducedMotion]);

    const tapsDone = Math.min(step, TAPS.length);
    const lines = TAPS.slice(0, tapsDone).reduce((acc, dishIndex) => {
        const dish = menu[dishIndex];
        const existing = acc.find((line) => line.name === dish.name);
        if (existing) existing.quantity += 1;
        else acc.push({ ...dish, quantity: 1 });
        return acc;
    }, []);
    const total = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
    const activeTap = step > 0 && step <= TAPS.length ? TAPS[step - 1] : null;

    const confirmed = step > TAPS.length;
    const tokenShown = step > TAPS.length + 1;
    const printed = step > TAPS.length + 2;
    const whatsapp = step > TAPS.length + 3;
    const ready = step > TAPS.length + 4;

    return (
        <div ref={ref} className="relative mx-auto w-full max-w-[560px]" aria-hidden="true">
            {/* Counter window */}
            <div className="overflow-hidden rounded-[28px] border border-white/10 bg-stone-900/70 shadow-[0_40px_120px_-30px_rgba(249,115,22,0.35)] backdrop-blur-xl">
                <div className="flex items-center gap-1.5 border-b border-white/5 px-4 py-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                    <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                    <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                    <span className="ml-3 text-[11px] font-medium text-stone-400">quickbite · counter</span>
                </div>

                <div className="grid grid-cols-[1.25fr_1fr]">
                    <div className="grid grid-cols-2 gap-2 p-3 sm:p-4">
                        {menu.map((dish, index) => (
                            <div
                                key={dish.name}
                                className={`rounded-xl border p-2.5 transition-all duration-300 ${
                                    activeTap === index
                                        ? 'scale-[0.96] border-orange-400/80 bg-orange-500/15'
                                        : 'border-white/5 bg-white/[0.03]'
                                }`}
                            >
                                <p className="flex items-start gap-1.5 text-[11px] font-semibold leading-tight text-stone-100 sm:text-xs">
                                    <span className="mt-px"><VegDot isVeg={dish.isVeg !== false} /></span>
                                    <span className="line-clamp-2">{dish.name}</span>
                                </p>
                                <p className="mt-2 text-[11px] font-bold tabular-nums text-stone-300 sm:text-xs">{formatINR(dish.price)}</p>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col border-l border-white/5 bg-white/[0.02] p-3 sm:p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">Order</p>
                        <ul className="mt-2 min-h-[84px] flex-1 space-y-1.5">
                            {lines.map((line) => (
                                <li key={line.name} className="demo-pop flex justify-between gap-2 text-[11px] text-stone-200 sm:text-xs">
                                    <span className="truncate">{line.quantity}× {line.name}</span>
                                    <span className="tabular-nums text-stone-400">{formatINR(line.price * line.quantity)}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-2 flex items-end justify-between border-t border-white/5 pt-2">
                            <span className="text-[10px] uppercase tracking-wider text-stone-500">Total</span>
                            <span className="text-base font-extrabold tabular-nums text-white sm:text-lg">{formatINR(total)}</span>
                        </div>
                        <div
                            className={`mt-2.5 rounded-xl py-2 text-center text-[11px] font-bold transition-all duration-300 sm:text-xs ${
                                confirmed ? 'bg-emerald-500 text-stone-950' : 'bg-gradient-to-r from-orange-500 to-rose-500 text-white'
                            } ${step === TAPS.length + 1 ? 'scale-95' : ''}`}
                        >
                            {confirmed ? <span className="inline-flex items-center gap-1"><FiCheck /> Confirmed</span> : 'Confirm order'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Token */}
            {tokenShown && (
                <div className="demo-pop absolute -left-3 -top-6 rounded-2xl bg-white px-4 py-3 text-stone-900 shadow-2xl sm:-left-10 sm:-top-8">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">Token</p>
                    <p className="text-3xl font-extrabold leading-none tracking-tight">{TOKEN}</p>
                </div>
            )}

            {/* Printed slip */}
            {printed && (
                <div className="demo-pop absolute -bottom-7 left-6 hidden items-center gap-2 rounded-full bg-stone-800 px-3.5 py-2 text-xs font-medium text-stone-200 shadow-xl ring-1 ring-white/10 sm:flex">
                    <FiPrinter className="text-orange-400" /> Token slip printed
                </div>
            )}

            {/* WhatsApp bill */}
            {whatsapp && (
                <div className="demo-pop absolute -right-2 -top-14 max-w-[200px] rounded-2xl rounded-br-sm bg-[#d9fdd3] px-3.5 py-2.5 text-[11px] leading-snug text-stone-800 shadow-2xl sm:-right-8 sm:-top-16 sm:text-xs">
                    <p className="flex items-center gap-1 font-semibold text-emerald-800"><FiMessageCircle /> WhatsApp</p>
                    Bill for token #{TOKEN} · {formatINR(total)}. Show this at the counter.
                </div>
            )}

            {/* Kitchen ready */}
            {ready && (
                <div className="demo-pop absolute -bottom-7 right-4 flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-xs font-bold text-stone-950 shadow-xl">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-stone-950" /> Token {TOKEN} ready · Dosa counter
                </div>
            )}
        </div>
    );
};

HeroDemo.propTypes = {
    dishes: PropTypes.arrayOf(PropTypes.shape({ name: PropTypes.string, price: PropTypes.number })),
};

export default HeroDemo;
