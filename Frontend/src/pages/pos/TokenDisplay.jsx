import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PiSpeakerHighBold, PiCookingPotDuotone, PiBellRingingDuotone } from 'react-icons/pi';
import { posApi, playBeep } from '../../utils/pos';

const POLL_MS = 3000;
const MAX_READY = 12;

/**
 * Public token display for the TV near the counters - /tv/<hotel address>.
 * Shows only token numbers and counter names - no prices or customer details.
 */
export default function TokenDisplay() {
    const { slug } = useParams();
    const [board, setBoard] = useState({ hotelName: '', preparing: [], ready: [] });
    const [missing, setMissing] = useState(false);
    const [clock, setClock] = useState(() => new Date());
    const [soundOn, setSoundOn] = useState(false);
    const [offline, setOffline] = useState(false);
    const [highlight, setHighlight] = useState(new Set());

    const announced = useRef(null);

    useEffect(() => {
        let active = true;

        const load = async () => {
            try {
                const res = await posApi.get(`/public/${encodeURIComponent(slug)}/display`);
                if (!active) return;
                setOffline(false);
                setMissing(false);
                setBoard(res.data);

                const readyKeys = res.data.ready.map((entry) => `${entry.tokenNumber}:${entry.counters.join(',')}`);
                if (announced.current) {
                    const fresh = res.data.ready.filter((entry) => !announced.current.has(`${entry.tokenNumber}:${entry.counters.join(',')}`));
                    if (fresh.length > 0) {
                        setHighlight(new Set(fresh.map((entry) => entry.tokenNumber)));
                        if (soundOn) {
                            playBeep(660, 0.25);
                            fresh.forEach((entry) => {
                                if ('speechSynthesis' in window) {
                                    const speech = new SpeechSynthesisUtterance(
                                        `Token number ${entry.tokenNumber}, please collect from ${entry.counters.join(' and ')}`
                                    );
                                    speech.lang = 'en-IN';
                                    window.speechSynthesis.speak(speech);
                                }
                            });
                        }
                    }
                }
                announced.current = new Set(readyKeys);
            } catch (error) {
                if (!active) return;
                // Unknown, paused or unpaid hotel: show a notice instead of a stale board
                if (error.response?.status === 404) setMissing(true);
                else setOffline(true);
            }
        };

        load();
        const poll = setInterval(load, POLL_MS);
        return () => {
            active = false;
            clearInterval(poll);
        };
    }, [soundOn, slug]);

    useEffect(() => {
        const tick = setInterval(() => setClock(new Date()), 1000);
        return () => clearInterval(tick);
    }, []);

    useEffect(() => {
        if (highlight.size === 0) return undefined;
        const timer = setTimeout(() => setHighlight(new Set()), 8000);
        return () => clearTimeout(timer);
    }, [highlight]);

    if (missing) {
        return (
            <div className="pos-app flex min-h-screen items-center justify-center bg-stone-950 p-6 text-center text-stone-300">
                <p className="text-2xl font-semibold">This token board is not available.</p>
            </div>
        );
    }

    const ready = [...board.ready]
        .sort((a, b) => new Date(b.readyAt || 0) - new Date(a.readyAt || 0))
        .slice(0, MAX_READY);

    return (
        <div className="pos-app grain relative flex min-h-screen flex-col overflow-hidden bg-ink p-5 text-white sm:p-8">
            <div className="pointer-events-none absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-saffron/15 blur-[120px]" />
            <header className="relative mb-8 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-saffron font-display text-2xl font-extrabold text-ink">
                        {(board.hotelName || 'Q').charAt(0)}
                    </span>
                    <div>
                        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{board.hotelName || 'QuickBite'}</h1>
                        <p className="text-sm font-medium uppercase tracking-[0.25em] text-stone-400">Now serving</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {offline && <span className="rounded-xl bg-rose-600 px-3 py-1.5 text-sm font-bold">Reconnecting…</span>}
                    {!soundOn && (
                        <button
                            type="button"
                            onClick={() => {
                                setSoundOn(true);
                                playBeep(660, 0.1);
                            }}
                            className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/20"
                        >
                            <PiSpeakerHighBold /> Turn on announcements
                        </button>
                    )}
                    <span className="font-display text-4xl font-bold tabular-nums text-stone-200">
                        {clock.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </header>

            <div className="relative grid flex-1 gap-6 lg:grid-cols-[1fr_2fr]">
                <section className="rounded-[32px] bg-white/[0.04] p-6 ring-1 ring-white/10 sm:p-8">
                    <h2 className="mb-6 flex items-center gap-3 text-xl font-bold uppercase tracking-[0.2em] text-amber-300">
                        <PiCookingPotDuotone className="text-3xl" /> Preparing
                    </h2>
                    <div className="flex flex-wrap gap-3">
                        {board.preparing.map((token) => (
                            <span key={token} className="flex h-20 min-w-[96px] items-center justify-center rounded-2xl bg-white/[0.08] px-4 font-display text-5xl font-bold tabular-nums text-stone-200 ring-1 ring-white/10">
                                {token}
                            </span>
                        ))}
                        {board.preparing.length === 0 && <p className="text-xl text-stone-500">No orders cooking</p>}
                    </div>
                </section>

                <section className="rounded-[32px] bg-emerald-500/[0.08] p-6 ring-1 ring-emerald-400/20 sm:p-8">
                    <h2 className="mb-6 flex items-center gap-3 text-xl font-bold uppercase tracking-[0.2em] text-emerald-300">
                        <PiBellRingingDuotone className="text-3xl" /> Ready · please collect
                    </h2>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                        {ready.map((entry) => (
                            <div
                                key={`${entry.tokenNumber}-${entry.counters.join()}`}
                                className={`rounded-3xl p-5 text-center transition-colors duration-500 ${
                                    highlight.has(entry.tokenNumber)
                                        ? 'qb-pop bg-leaf text-ink shadow-[0_0_60px_-10px_rgba(34,192,122,0.8)]'
                                        : 'bg-emerald-400/15 text-emerald-50'
                                }`}
                            >
                                <p className="font-display text-[88px] font-extrabold leading-none tracking-tight tabular-nums">{entry.tokenNumber}</p>
                                <p className="mt-3 text-lg font-semibold">{entry.counters.join(' · ')}</p>
                            </div>
                        ))}
                        {ready.length === 0 && <p className="text-xl text-stone-500">Tokens appear here when ready</p>}
                    </div>
                </section>
            </div>
        </div>
    );
}
