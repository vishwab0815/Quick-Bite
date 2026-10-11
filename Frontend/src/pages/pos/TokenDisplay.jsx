import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FiVolume2 } from 'react-icons/fi';
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
        <div className="pos-app flex min-h-screen flex-col bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 p-4 text-white sm:p-6">
            <header className="mb-6 flex items-center justify-between">
                <h1 className="bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-4xl font-black text-transparent">
                    {board.hotelName || 'QuickBite'}
                </h1>
                <div className="flex items-center gap-4">
                    {offline && <span className="rounded-lg bg-red-600 px-3 py-1 text-sm font-bold">Reconnecting…</span>}
                    {!soundOn && (
                        <button
                            onClick={() => {
                                setSoundOn(true);
                                playBeep(660, 0.1);
                            }}
                            className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20"
                        >
                            <FiVolume2 /> Enable announcements
                        </button>
                    )}
                    <span className="font-mono text-3xl font-bold text-stone-300">
                        {clock.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </header>

            <div className="grid flex-1 gap-6 lg:grid-cols-[1fr_2fr]">
                <section className="rounded-3xl bg-white/5 p-6">
                    <h2 className="mb-4 text-2xl font-bold uppercase tracking-widest text-amber-400">Preparing</h2>
                    <div className="flex flex-wrap gap-3">
                        {board.preparing.map((token) => (
                            <span key={token} className="rounded-xl bg-white/10 px-4 py-2 text-4xl font-black text-stone-200">
                                {token}
                            </span>
                        ))}
                        {board.preparing.length === 0 && <p className="text-xl text-stone-500">—</p>}
                    </div>
                </section>

                <section className="rounded-3xl bg-green-500/10 p-6">
                    <h2 className="mb-4 text-2xl font-bold uppercase tracking-widest text-green-400">Ready · Please collect</h2>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                        {ready.map((entry) => (
                            <div
                                key={`${entry.tokenNumber}-${entry.counters.join()}`}
                                className={`rounded-2xl p-4 text-center transition ${
                                    highlight.has(entry.tokenNumber)
                                        ? 'animate-pulse bg-green-500 text-stone-950'
                                        : 'bg-green-500/20 text-green-100'
                                }`}
                            >
                                <p className="text-7xl font-black leading-none">{entry.tokenNumber}</p>
                                <p className="mt-2 text-lg font-semibold">{entry.counters.join(' · ')}</p>
                            </div>
                        ))}
                        {ready.length === 0 && <p className="text-xl text-stone-500">—</p>}
                    </div>
                </section>
            </div>
        </div>
    );
}
