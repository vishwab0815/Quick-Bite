import { useEffect, useRef, useState } from 'react';
import { FiCamera, FiVolume2, FiVolumeX, FiCheck, FiRotateCcw } from 'react-icons/fi';
import Skeleton from '../../components/pos/Skeleton';
import { showToast } from '../../utils/toast';
import { posApi, loadPref, savePref, playBeep } from '../../utils/pos';
import { usePos } from '../../utils/posContext';
import { useCachedQuery } from '../../utils/useCachedQuery';

const POLL_MS = 3000;
const WARN_MINUTES = 5;
const LATE_MINUTES = 10;
const NO_TICKETS = [];

const elapsedLabel = (from, now) => {
    const seconds = Math.max(0, Math.floor((now - new Date(from).getTime()) / 1000));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

export default function KitchenScreen() {
    const { settings } = usePos();

    const [counter, setCounter] = useState(() => loadPref('qb_kitchen_counter', 'All'));
    const [now, setNow] = useState(() => Date.now());
    const [soundOn, setSoundOn] = useState(() => loadPref('qb_kitchen_sound', true));
    const [scanCode, setScanCode] = useState('');
    const [flash, setFlash] = useState(null);
    const [busyId, setBusyId] = useState(null);

    const knownIds = useRef(null);
    const scanRef = useRef(null);
    const counterParam = counter === 'All' ? undefined : counter;

    // Polled every few seconds; switching back to this screen shows the last tickets instantly
    const { data: ticketsData, refresh: fetchTickets } = useCachedQuery(
        `kitchen:${counter}`,
        () => posApi.get('/kitchen', { params: { counter: counterParam } }).then((res) => res.data.tickets),
        { refreshInterval: POLL_MS }
    );
    const tickets = ticketsData || NO_TICKETS;

    // Beep when a new token arrives (not on first load or when switching counters)
    useEffect(() => {
        knownIds.current = null;
    }, [counter]);

    useEffect(() => {
        if (!ticketsData) return;
        if (knownIds.current && soundOn && ticketsData.some((ticket) => !knownIds.current.has(ticket._id))) {
            playBeep();
        }
        knownIds.current = new Set(ticketsData.map((ticket) => ticket._id));
    }, [ticketsData, soundOn]);

    useEffect(() => {
        const tick = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(tick);
    }, []);

    useEffect(() => savePref('qb_kitchen_counter', counter), [counter]);
    useEffect(() => savePref('qb_kitchen_sound', soundOn), [soundOn]);

    useEffect(() => {
        if (!flash) return undefined;
        const timer = setTimeout(() => setFlash(null), 3500);
        return () => clearTimeout(timer);
    }, [flash]);

    const ticketStatus = (ticket) => {
        if (!counterParam) return ticket.status;
        return ticket.stations.find((station) => station.counter === counterParam)?.status || 'preparing';
    };

    const updateStatus = async (ticket, status) => {
        setBusyId(ticket._id);
        try {
            await posApi.patch(`/bills/${ticket._id}/stations`, { counter: counterParam, status });
            await fetchTickets();
        } catch (error) {
            showToast.error(error.response?.data?.message || 'Failed to update token');
        } finally {
            setBusyId(null);
        }
    };

    const handleScan = async (event) => {
        event.preventDefault();
        const code = scanCode.trim();
        if (!code) return;
        setScanCode('');

        try {
            const res = await posApi.post('/serve', { code, counter: counterParam });
            setFlash({ type: 'success', text: res.data.message });
            if (soundOn) playBeep(1200, 0.12);
            fetchTickets();
        } catch (error) {
            setFlash({ type: 'error', text: error.response?.data?.message || 'Token not found' });
            if (soundOn) playBeep(220, 0.4);
        } finally {
            scanRef.current?.focus();
        }
    };

    const preparing = tickets.filter((ticket) => ticketStatus(ticket) === 'preparing');
    const ready = tickets.filter((ticket) => ticketStatus(ticket) === 'ready');

    const renderTicket = (ticket) => {
        const status = ticketStatus(ticket);
        const minutes = (now - new Date(ticket.createdAt).getTime()) / 60000;
        const timerColor = status === 'ready'
            ? 'bg-emerald-100 text-emerald-800'
            : minutes >= LATE_MINUTES
                ? 'bg-rose-600 text-white animate-pulse'
                : minutes >= WARN_MINUTES
                    ? 'bg-amber-400 text-stone-900'
                    : 'bg-stone-100 text-stone-700';

        return (
            <div
                key={ticket._id}
                className={`flex flex-col rounded-2xl border bg-white p-4 shadow-[0_1px_2px_rgba(28,25,23,0.05)] transition-colors ${
                    status === 'ready' ? 'border-emerald-400' : minutes >= LATE_MINUTES ? 'border-rose-400' : 'border-stone-200'
                }`}
            >
                <div className="mb-2 flex items-start justify-between">
                    <span className="text-3xl font-bold tracking-tight text-stone-900">#{ticket.tokenNumber}</span>
                    <span className={`rounded-lg px-2 py-1 font-mono text-sm font-bold ${timerColor}`}>
                        {elapsedLabel(ticket.createdAt, now)}
                    </span>
                </div>

                <ul className="mb-3 flex-1 space-y-1">
                    {ticket.items.map((item) => (
                        <li key={`${item.itemId}-${item.name}`} className="flex justify-between gap-2 text-base font-semibold text-stone-800">
                            <span>{item.name}</span>
                            <span className="text-orange-600">× {item.quantity}</span>
                        </li>
                    ))}
                </ul>

                {!counterParam && ticket.stations.length > 1 && (
                    <div className="mb-2 flex flex-wrap gap-1">
                        {ticket.stations.map((station) => (
                            <span
                                key={station.counter}
                                className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                                    station.status === 'ready' ? 'bg-emerald-100 text-emerald-700'
                                        : station.status === 'served' ? 'bg-stone-200 text-stone-500 line-through'
                                            : 'bg-orange-100 text-orange-700'
                                }`}
                            >
                                {station.counter}
                            </span>
                        ))}
                    </div>
                )}

                {status === 'preparing' ? (
                    <button
                        onClick={() => updateStatus(ticket, 'ready')}
                        disabled={busyId === ticket._id}
                        className="flex items-center justify-center gap-2 rounded-xl bg-stone-900 py-2.5 font-semibold text-white transition hover:bg-stone-800 disabled:opacity-50"
                    >
                        <FiCheck /> Ready
                    </button>
                ) : (
                    <div className="grid grid-cols-[auto_1fr] gap-2">
                        <button
                            onClick={() => updateStatus(ticket, 'preparing')}
                            disabled={busyId === ticket._id}
                            className="rounded-lg border border-stone-200 px-3 text-stone-500 hover:bg-stone-50 disabled:opacity-50"
                            title="Back to preparing"
                        >
                            <FiRotateCcw />
                        </button>
                        <button
                            onClick={() => updateStatus(ticket, 'served')}
                            disabled={busyId === ticket._id}
                            className="rounded-xl bg-emerald-600 py-2.5 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                            Served
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex min-h-full flex-col">
            <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-stone-200/80 bg-white/90 px-3 py-2.5 backdrop-blur-md sm:px-5">
                <div className="flex w-full gap-1.5 overflow-x-auto [scrollbar-width:none] sm:w-auto">
                    {['All', ...settings.counters].map((name) => (
                        <button
                            key={name}
                            onClick={() => setCounter(name)}
                            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                                counter === name ? 'bg-stone-900 text-white shadow-sm' : 'bg-white text-stone-600 ring-1 ring-stone-200 hover:text-stone-900'
                            }`}
                        >
                            {name}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleScan} className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto sm:min-w-[300px] sm:max-w-md sm:flex-1">
                    <div className="relative flex-1">
                        <FiCamera className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                            ref={scanRef}
                            value={scanCode}
                            onChange={(e) => setScanCode(e.target.value)}
                            placeholder="Scan coupon QR or type token no."
                            className="w-full rounded-full border border-stone-200 bg-stone-50 py-2 pl-10 pr-4 text-sm outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                            autoFocus
                        />
                    </div>
                    <button type="submit" className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">
                        Serve
                    </button>
                </form>

                <button
                    onClick={() => setSoundOn((value) => !value)}
                    className="rounded-full p-2.5 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
                    title={soundOn ? 'Mute new-order beep' : 'Unmute new-order beep'}
                >
                    {soundOn ? <FiVolume2 /> : <FiVolumeX />}
                </button>
            </div>

            {flash && (
                <div className={`mx-3 mt-3 rounded-2xl px-4 py-3 text-center text-base font-semibold text-white shadow-sm sm:mx-5 ${flash.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                    {flash.type === 'success' ? '✓ ' : '✕ '}{flash.text}
                </div>
            )}

            <div className="grid flex-1 gap-5 p-3 sm:p-5 lg:grid-cols-[2fr_1fr]">
                <section>
                    <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
                        Preparing · {preparing.length}
                    </h2>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {!ticketsData && Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-40" />)}
                        {preparing.map(renderTicket)}
                    </div>
                    {ticketsData && preparing.length === 0 && <p className="py-10 text-center text-sm text-stone-400">No pending orders</p>}
                </section>
                <section>
                    <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                        Ready for pickup · {ready.length}
                    </h2>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                        {ready.map(renderTicket)}
                    </div>
                </section>
            </div>
        </div>
    );
}
