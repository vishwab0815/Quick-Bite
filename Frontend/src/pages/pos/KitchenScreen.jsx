import { useCallback, useEffect, useRef, useState } from 'react';
import { FiCamera, FiVolume2, FiVolumeX, FiCheck, FiRotateCcw } from 'react-icons/fi';
import PosHeader from '../../components/pos/PosHeader';
import { showToast } from '../../utils/toast';
import { posApi, loadPref, savePref, playBeep, useStaffUser, usePosSettings } from '../../utils/pos';

const POLL_MS = 3000;
const WARN_MINUTES = 5;
const LATE_MINUTES = 10;

const elapsedLabel = (from, now) => {
    const seconds = Math.max(0, Math.floor((now - new Date(from).getTime()) / 1000));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

export default function KitchenScreen() {
    const user = useStaffUser();
    const settings = usePosSettings(Boolean(user));

    const [counter, setCounter] = useState(() => loadPref('qb_kitchen_counter', 'All'));
    const [tickets, setTickets] = useState([]);
    const [now, setNow] = useState(() => Date.now());
    const [soundOn, setSoundOn] = useState(() => loadPref('qb_kitchen_sound', true));
    const [scanCode, setScanCode] = useState('');
    const [flash, setFlash] = useState(null);
    const [busyId, setBusyId] = useState(null);

    const knownIds = useRef(null);
    const scanRef = useRef(null);
    const counterParam = counter === 'All' ? undefined : counter;

    const fetchTickets = useCallback(async () => {
        try {
            const res = await posApi.get('/kitchen', { params: { counter: counterParam } });
            const next = res.data.tickets;

            const ids = new Set(next.map((ticket) => ticket._id));
            if (knownIds.current && soundOn && next.some((ticket) => !knownIds.current.has(ticket._id))) {
                playBeep();
            }
            knownIds.current = ids;
            setTickets(next);
        } catch {
            // Polling retries every few seconds; an expired session is handled by posApi
        }
    }, [counterParam, soundOn]);

    useEffect(() => {
        if (!user) return undefined;
        knownIds.current = null;
        fetchTickets();
        const poll = setInterval(fetchTickets, POLL_MS);
        return () => clearInterval(poll);
    }, [user, fetchTickets]);

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

    if (!user || !settings) {
        return (
            <div className="pos-app flex min-h-screen items-center justify-center bg-stone-100">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
            </div>
        );
    }

    const preparing = tickets.filter((ticket) => ticketStatus(ticket) === 'preparing');
    const ready = tickets.filter((ticket) => ticketStatus(ticket) === 'ready');

    const renderTicket = (ticket) => {
        const status = ticketStatus(ticket);
        const minutes = (now - new Date(ticket.createdAt).getTime()) / 60000;
        const timerColor = status === 'ready'
            ? 'bg-green-100 text-green-800'
            : minutes >= LATE_MINUTES
                ? 'bg-red-600 text-white animate-pulse'
                : minutes >= WARN_MINUTES
                    ? 'bg-amber-400 text-stone-900'
                    : 'bg-stone-100 text-stone-700';

        return (
            <div
                key={ticket._id}
                className={`flex flex-col rounded-xl border-2 bg-white p-3 shadow-sm ${
                    status === 'ready' ? 'border-green-400' : minutes >= LATE_MINUTES ? 'border-red-400' : 'border-stone-200'
                }`}
            >
                <div className="mb-2 flex items-start justify-between">
                    <span className="text-4xl font-black text-stone-900">#{ticket.tokenNumber}</span>
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
                                    station.status === 'ready' ? 'bg-green-100 text-green-700'
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
                        className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-rose-500 py-3 text-lg font-bold text-white disabled:opacity-50"
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
                            className="rounded-lg bg-green-600 py-3 text-lg font-bold text-white hover:bg-green-700 disabled:opacity-50"
                        >
                            Served
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex min-h-screen flex-col pos-app bg-stone-100">
            <PosHeader user={user} hotelName={settings.name} />

            <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 bg-white px-3 py-2">
                <div className="flex w-full gap-1.5 overflow-x-auto [scrollbar-width:none] sm:w-auto">
                    {['All', ...settings.counters].map((name) => (
                        <button
                            key={name}
                            onClick={() => setCounter(name)}
                            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${
                                counter === name ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700'
                            }`}
                        >
                            {name}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleScan} className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto sm:min-w-[300px] sm:max-w-md sm:flex-1">
                    <div className="relative flex-1">
                        <FiCamera className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                            ref={scanRef}
                            value={scanCode}
                            onChange={(e) => setScanCode(e.target.value)}
                            placeholder="Scan coupon QR or type token no."
                            className="w-full rounded-lg border border-stone-200 py-2 pl-9 pr-3 outline-none focus:border-orange-500"
                            autoFocus
                        />
                    </div>
                    <button type="submit" className="rounded-lg bg-green-600 px-4 py-2 font-bold text-white hover:bg-green-700">
                        Serve
                    </button>
                </form>

                <button
                    onClick={() => setSoundOn((value) => !value)}
                    className="rounded-lg p-2 text-stone-600 hover:bg-stone-100"
                    title={soundOn ? 'Mute new-order beep' : 'Unmute new-order beep'}
                >
                    {soundOn ? <FiVolume2 /> : <FiVolumeX />}
                </button>
            </div>

            {flash && (
                <div className={`px-4 py-3 text-center text-xl font-black text-white ${flash.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {flash.type === 'success' ? '✓ ' : '✕ '}{flash.text}
                </div>
            )}

            <div className="grid flex-1 gap-4 p-3 lg:grid-cols-[2fr_1fr]">
                <section>
                    <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-stone-500">
                        Preparing ({preparing.length})
                    </h2>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {preparing.map(renderTicket)}
                    </div>
                    {preparing.length === 0 && <p className="py-10 text-center text-stone-400">No pending orders 🎉</p>}
                </section>
                <section>
                    <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-green-700">
                        Ready - waiting for pickup ({ready.length})
                    </h2>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                        {ready.map(renderTicket)}
                    </div>
                </section>
            </div>
        </div>
    );
}
