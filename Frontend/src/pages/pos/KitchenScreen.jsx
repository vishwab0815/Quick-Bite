import { useEffect, useRef, useState } from 'react';
import {
    PiScanBold, PiSpeakerHighBold, PiSpeakerSlashBold, PiCheckBold, PiArrowCounterClockwiseBold,
    PiCookingPotDuotone, PiCheckCircleFill, PiWarningCircleFill, PiBellRingingDuotone,
} from 'react-icons/pi';
import Skeleton from '../../components/pos/Skeleton';
import { Button, DishPhoto, EmptyState, IconButton } from '../../components/pos/ui';
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
        const late = status === 'preparing' && minutes >= LATE_MINUTES;
        const timerColor = status === 'ready'
            ? 'bg-emerald-100 text-emerald-800'
            : late
                ? 'bg-rose-600 text-white animate-pulse'
                : minutes >= WARN_MINUTES
                    ? 'bg-amber-400 text-stone-900'
                    : 'bg-white text-stone-700 ring-1 ring-line';

        return (
            <article
                key={ticket._id}
                className={`qb-fade flex flex-col overflow-hidden rounded-3xl border bg-white shadow-[var(--shadow-card)] ${
                    status === 'ready' ? 'border-emerald-300' : late ? 'border-rose-300' : 'border-line'
                }`}
            >
                <header className={`flex items-center justify-between px-5 py-3.5 ${status === 'ready' ? 'bg-emerald-50' : late ? 'bg-rose-50' : 'bg-stone-50'}`}>
                    <span className="font-display text-[34px] font-extrabold leading-none tracking-tight text-stone-900">#{ticket.tokenNumber}</span>
                    <span className={`rounded-xl px-2.5 py-1 font-mono text-sm font-bold tabular-nums ${timerColor}`}>{elapsedLabel(ticket.createdAt, now)}</span>
                </header>

                <ul className="flex-1 space-y-2.5 px-5 py-4">
                    {ticket.items.map((item) => (
                        <li key={`${item.itemId}-${item.name}`} className="flex items-center gap-3">
                            <DishPhoto item={{ name: item.name }} className="h-9 w-9 shrink-0" rounded="rounded-lg" />
                            <span className="min-w-0 flex-1 text-[16px] font-semibold leading-snug text-stone-900">{item.name}</span>
                            <span className="font-display text-lg font-bold text-saffron-deep">×{item.quantity}</span>
                        </li>
                    ))}
                </ul>

                {!counterParam && ticket.stations.length > 1 && (
                    <div className="flex flex-wrap gap-1.5 px-5 pb-3">
                        {ticket.stations.map((station) => (
                            <span
                                key={station.counter}
                                className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${
                                    station.status === 'ready' ? 'bg-emerald-100 text-emerald-800'
                                        : station.status === 'served' ? 'bg-stone-100 text-stone-400 line-through'
                                            : 'bg-orange-100 text-orange-800'
                                }`}
                            >
                                {station.counter}
                            </span>
                        ))}
                    </div>
                )}

                <div className="border-t border-line p-3">
                    {status === 'preparing' ? (
                        <Button onClick={() => updateStatus(ticket, 'ready')} disabled={busyId === ticket._id} className="h-12 w-full rounded-2xl text-base">
                            <PiCheckBold /> Ready
                        </Button>
                    ) : (
                        <div className="flex gap-2">
                            <IconButton label="Back to preparing" onClick={() => updateStatus(ticket, 'preparing')} disabled={busyId === ticket._id} className="h-12 w-12 rounded-2xl ring-1 ring-line">
                                <PiArrowCounterClockwiseBold />
                            </IconButton>
                            <Button variant="success" onClick={() => updateStatus(ticket, 'served')} disabled={busyId === ticket._id} className="h-12 flex-1 rounded-2xl text-base">
                                Served
                            </Button>
                        </div>
                    )}
                </div>
            </article>
        );
    };

    const columnTitle = (dot, label, count) => (
        <h2 className="mb-4 flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.12em] text-stone-600">
            <span className={`h-2.5 w-2.5 rounded-full ${dot}`} /> {label}
            <span className="rounded-full bg-white px-2 py-0.5 text-xs tabular-nums text-stone-500 ring-1 ring-line">{count}</span>
        </h2>
    );

    return (
        <div className="flex min-h-full flex-col">
            <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-line bg-canvas/90 px-4 py-3 backdrop-blur-md sm:px-6">
                <div className="flex w-full gap-2 overflow-x-auto [scrollbar-width:none] sm:w-auto">
                    {['All', ...settings.counters].map((name) => (
                        <button
                            key={name}
                            type="button"
                            onClick={() => setCounter(name)}
                            className={`h-10 shrink-0 whitespace-nowrap rounded-full px-4 text-[13px] font-semibold transition-colors ${
                                counter === name ? 'bg-ink text-white' : 'bg-white text-stone-600 ring-1 ring-line hover:text-stone-900'
                            }`}
                        >
                            {name === 'All' ? 'All counters' : name}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleScan} className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto sm:min-w-[320px] sm:max-w-md sm:flex-1">
                    <div className="relative flex-1">
                        <PiScanBold className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-stone-400" />
                        <input
                            ref={scanRef}
                            value={scanCode}
                            onChange={(event) => setScanCode(event.target.value)}
                            placeholder="Scan token QR or type token no."
                            aria-label="Scan token QR or type token number"
                            className="h-11 w-full rounded-xl border border-line bg-white pl-11 pr-4 text-sm outline-none transition focus:border-stone-900 focus:ring-4 focus:ring-stone-900/5"
                            autoFocus
                        />
                    </div>
                    <Button type="submit" variant="success">Serve</Button>
                </form>

                <IconButton label={soundOn ? 'Mute new-order beep' : 'Unmute new-order beep'} onClick={() => setSoundOn((value) => !value)} className="h-11 w-11 bg-white ring-1 ring-line">
                    {soundOn ? <PiSpeakerHighBold /> : <PiSpeakerSlashBold />}
                </IconButton>
            </div>

            {flash && (
                <div className={`qb-pop mx-4 mt-4 flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-base font-semibold text-white shadow-lg sm:mx-6 ${flash.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                    {flash.type === 'success' ? <PiCheckCircleFill className="text-xl" /> : <PiWarningCircleFill className="text-xl" />} {flash.text}
                </div>
            )}

            <div className="grid flex-1 gap-6 p-4 sm:p-6 lg:grid-cols-[2fr_1fr]">
                <section>
                    {columnTitle('bg-amber-400', 'Preparing', preparing.length)}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {!ticketsData && Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-56 rounded-3xl" />)}
                        {preparing.map(renderTicket)}
                    </div>
                    {ticketsData && preparing.length === 0 && (
                        <EmptyState icon={PiCookingPotDuotone} title="All caught up">New tokens appear here the moment they are billed.</EmptyState>
                    )}
                </section>
                <section>
                    {columnTitle('bg-emerald-500', 'Ready for pickup', ready.length)}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
                        {ready.map(renderTicket)}
                    </div>
                    {ticketsData && ready.length === 0 && (
                        <EmptyState icon={PiBellRingingDuotone} title="Nothing waiting">Tap Ready on a token and it moves here.</EmptyState>
                    )}
                </section>
            </div>
        </div>
    );
}
