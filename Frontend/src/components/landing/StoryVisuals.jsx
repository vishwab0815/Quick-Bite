import PropTypes from 'prop-types';
import { FiSearch, FiCheck, FiArrowUpRight } from 'react-icons/fi';
import { formatINR } from '../../utils/pos';

/*
 * The six scenes of "one order, ninety seconds". Each animates in when its
 * parent gets the `is-active` class (see .story-* rules in index.css).
 */

const ORDER = [
    { name: 'Masala Dosa', quantity: 2, price: 80 },
    { name: 'Filter Coffee', quantity: 1, price: 30 },
];
const TOTAL = ORDER.reduce((sum, line) => sum + line.quantity * line.price, 0);
const TOKEN = 42;

const Kbd = ({ children }) => (
    <kbd className="rounded-md border border-white/15 bg-white/5 px-2 py-1 font-code text-[11px] text-stone-300 shadow-[0_2px_0_rgba(255,255,255,0.08)]">
        {children}
    </kbd>
);

Kbd.propTypes = { children: PropTypes.node };

export const BillScene = () => (
    <div className="flex h-full flex-col justify-center gap-5 p-6 sm:p-10">
        <div className="story-rise rounded-3xl bg-paper p-5 text-ink shadow-2xl sm:p-6">
            <div className="flex items-center gap-2.5 rounded-xl bg-white px-3.5 py-3 font-code text-sm ring-1 ring-ink/10">
                <FiSearch className="shrink-0 text-stone-400" />
                <span className="story-typing">masala d</span>
                <span className="story-caret text-saffron">▍</span>
            </div>
            <ul className="mt-4 space-y-2.5 text-sm">
                {ORDER.map((line, index) => (
                    <li key={line.name} className="story-pop flex justify-between gap-3" style={{ '--d': `${700 + index * 220}ms` }}>
                        <span><b className="font-semibold">{line.quantity}×</b> {line.name}</span>
                        <span className="tabular-nums text-stone-500">{formatINR(line.quantity * line.price)}</span>
                    </li>
                ))}
            </ul>
            <div className="mt-4 flex items-end justify-between border-t border-dashed border-ink/20 pt-3">
                <span className="text-xs uppercase tracking-wider text-stone-500">Total</span>
                <span className="text-2xl font-bold tabular-nums">{formatINR(TOTAL)}</span>
            </div>
            <div className="story-confirm mt-4 rounded-xl py-3 text-center text-sm font-bold">
                <span className="story-confirm-idle">Confirm order</span>
                <span className="story-confirm-done inline-flex items-center gap-1.5"><FiCheck /> Token {TOKEN}</span>
            </div>
        </div>
        <p className="flex flex-wrap items-center justify-center gap-2 text-xs text-stone-400">
            <Kbd>Enter</Kbd> adds the dish <span className="mx-1 text-stone-600">·</span> <Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd> confirms
        </p>
    </div>
);

export const PrintScene = () => (
    <div className="flex h-full flex-col items-center justify-center p-6">
        <div className="relative z-10 flex h-16 w-64 items-start justify-end rounded-2xl bg-gradient-to-b from-stone-700 to-stone-800 p-3 shadow-2xl ring-1 ring-white/10">
            <span className="h-1.5 w-1.5 rounded-full bg-leaf shadow-[0_0_8px_#22c07a]" />
            <span className="absolute inset-x-6 bottom-3 h-1.5 rounded-full bg-black" />
        </div>
        <div className="-mt-5 h-[290px] w-56 overflow-hidden px-1">
            <div className="story-feed">
                <div className="bg-white px-5 pb-3 pt-8 font-code text-[11px] leading-relaxed text-ink">
                    <p className="text-center font-bold">TAX INVOICE</p>
                    <p className="text-center text-[10px] text-stone-500">QB/2026-27/000142</p>
                    <div className="my-2 border-t border-dashed border-ink/40" />
                    <p className="text-center text-[10px] tracking-[0.3em]">TOKEN</p>
                    <p className="text-center text-5xl font-extrabold leading-none">{TOKEN}</p>
                    <div className="my-2 border-t border-dashed border-ink/40" />
                    {ORDER.map((line) => (
                        <p key={line.name} className="flex justify-between"><span>{line.quantity} {line.name}</span><span>{line.quantity * line.price}</span></p>
                    ))}
                    <div className="my-2 border-t border-dashed border-ink/40" />
                    <p className="flex justify-between font-bold"><span>TOTAL</span><span>{formatINR(TOTAL)}</span></p>
                    <p className="mt-1 text-center text-[10px] text-stone-500">GST included · UPI</p>
                </div>
                <div className="receipt-edge" />
            </div>
        </div>
    </div>
);

const Ticket = ({ token, item, timer, tone, highlight }) => (
    <div className={`rounded-2xl bg-paper p-4 text-ink shadow-xl ${highlight ? 'story-rise' : ''}`}>
        <div className="flex items-center justify-between">
            <span className="text-3xl font-extrabold tracking-tight">#{token}</span>
            <span className={`rounded-md px-2 py-0.5 font-code text-xs font-bold ${tone === 'late' ? 'bg-red-500 text-white' : 'bg-turmeric text-ink'}`}>{timer}</span>
        </div>
        <p className="mt-3 flex justify-between text-sm"><span>{item}</span><span className="font-bold text-saffron-deep">× 2</span></p>
        <div className={`relative mt-4 rounded-xl bg-ink py-2.5 text-center text-xs font-bold text-paper ${highlight ? 'story-tap' : ''}`}>
            Ready
        </div>
    </div>
);

Ticket.propTypes = {
    token: PropTypes.number,
    item: PropTypes.string,
    timer: PropTypes.string,
    tone: PropTypes.oneOf(['late', 'ok']),
    highlight: PropTypes.bool,
};

export const KitchenScene = () => (
    <div className="flex h-full flex-col justify-center p-6 sm:p-10">
        <p className="mb-4 font-code text-[11px] uppercase tracking-[0.25em] text-stone-500">Dosa counter · 2 waiting</p>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <Ticket token={41} item="Ghee Podi Dosa" timer="6:42" tone="late" />
            <Ticket token={TOKEN} item="Masala Dosa" timer="1:12" tone="ok" highlight />
        </div>
        <p className="mt-5 text-xs text-stone-500">Timers turn amber, then red, when an order waits too long.</p>
    </div>
);

export const CallScene = ({ hotelName }) => (
    <div className="flex h-full flex-col items-center justify-center p-6 sm:p-10">
        <div className="w-full rounded-2xl border-[6px] border-stone-800 bg-black p-4 shadow-2xl sm:p-5">
            <div className="flex justify-between font-code text-[10px] uppercase tracking-[0.2em] text-stone-500">
                <span>Now serving</span>
                <span className="truncate pl-3">{hotelName}</span>
            </div>
            <div className="mt-4 grid grid-cols-[1fr_1.25fr] gap-3">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">Preparing</p>
                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                        {[43, 44, 45, 46].map((token) => (
                            <span key={token} className="rounded-lg bg-white/[0.07] py-2 text-center text-lg font-bold text-stone-300">{token}</span>
                        ))}
                    </div>
                </div>
                <div className="story-call flex flex-col items-center justify-center rounded-xl bg-leaf py-3 text-ink">
                    <span className="text-[10px] font-bold uppercase tracking-[0.25em]">Ready</span>
                    <span className="text-6xl font-extrabold leading-none tracking-tight sm:text-7xl">{TOKEN}</span>
                    <span className="mt-1 text-[11px] font-semibold">Dosa counter</span>
                </div>
            </div>
        </div>
        <div className="h-4 w-16 bg-stone-800" />
        <div className="h-1.5 w-32 rounded-full bg-stone-800" />
    </div>
);

CallScene.propTypes = { hotelName: PropTypes.string };

export const WhatsAppScene = ({ hotelName }) => (
    <div className="flex h-full items-center justify-center p-6">
        <div className="w-60 overflow-hidden rounded-[2.2rem] border-[6px] border-stone-800 bg-[#ece5dd] shadow-2xl">
            <div className="flex items-center gap-2.5 bg-[#0b6b5f] px-4 pb-3 pt-5 text-white">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-bold">{hotelName.charAt(0)}</span>
                <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold">{hotelName}</span>
                    <span className="block text-[10px] text-white/70">Business account</span>
                </span>
            </div>
            <div className="space-y-2 px-3 pb-5 pt-3">
                <p className="mx-auto w-fit rounded-md bg-white/70 px-2 py-0.5 text-[10px] text-stone-500">TODAY</p>
                <div className="story-bubble max-w-[88%] rounded-xl rounded-tl-sm bg-white p-3 text-[11px] leading-relaxed text-stone-800 shadow-sm">
                    <p>Hi Ravi, thank you for ordering at <b>{hotelName}</b>!</p>
                    <p className="mt-1">Your token is <b>#{TOKEN}</b> · {formatINR(TOTAL)}</p>
                    <p className="mt-2 flex items-center gap-1 font-semibold text-[#0b6b5f]">View receipt <FiArrowUpRight /></p>
                    <p className="mt-1 text-right text-[9px] text-stone-400">1:30 PM</p>
                </div>
            </div>
        </div>
    </div>
);

WhatsAppScene.propTypes = { hotelName: PropTypes.string.isRequired };

// Sales by hour, 7 AM - 6 PM (illustration)
const HOURLY = [18, 46, 72, 100, 64, 30, 34, 80, 92, 52, 28, 22];
const PAYMENT_MIX = [
    { label: 'UPI', share: 57, color: '#eb6834' },
    { label: 'Cash', share: 38, color: '#2a78d6' },
    { label: 'Card', share: 5, color: '#1baf7a' },
];

export const DashboardScene = () => (
    <div className="flex h-full flex-col justify-center gap-6 p-6 sm:p-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
                <p className="text-xs text-stone-400">Today so far · example</p>
                <p className="mt-1 text-4xl font-bold tracking-tight tabular-nums">₹48,210</p>
            </div>
            <span className="rounded-full bg-leaf/15 px-3 py-1 text-xs font-semibold text-leaf">▲ 12% vs last Saturday</span>
        </div>
        <div>
            <div className="flex h-36 items-end gap-1.5">
                {HOURLY.map((value, index) => (
                    <span
                        key={index}
                        className={`story-bar flex-1 rounded-t-[4px] ${value === 100 ? 'bg-saffron' : 'bg-white/20'}`}
                        style={{ '--h': `${value}%`, '--d': `${index * 45}ms` }}
                    />
                ))}
            </div>
            <div className="mt-2 flex justify-between font-code text-[10px] text-stone-500">
                <span>7 AM</span><span>Busiest: 10 AM</span><span>6 PM</span>
            </div>
        </div>
        <div>
            <div className="flex h-2.5 gap-[2px] overflow-hidden rounded-full">
                {PAYMENT_MIX.map((part) => (
                    <span key={part.label} style={{ width: `${part.share}%`, background: part.color }} />
                ))}
            </div>
            <div className="mt-2.5 flex gap-4 text-xs text-stone-300">
                {PAYMENT_MIX.map((part) => (
                    <span key={part.label} className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ background: part.color }} />
                        {part.label} <span className="tabular-nums text-stone-500">{part.share}%</span>
                    </span>
                ))}
            </div>
        </div>
    </div>
);
