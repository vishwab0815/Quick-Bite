import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { prefersReducedMotion, useMediaQuery } from './hooks';

const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const FLIP_MS = 55;
const DEMO_STEP_MS = 3600;
const DEMO_COUNTERS = ['DOSA', 'MEALS', 'COFFEE', 'IDLI VADA', 'CHATS'];
const ROWS = 3;

/**
 * One split-flap character: flips through a few random characters before landing on the new one
 */
const FlapCell = ({ char, delay }) => {
    const [flap, setFlap] = useState({ shown: ' ', count: 0 });

    useEffect(() => {
        if (prefersReducedMotion()) {
            setFlap((current) => ({ shown: char, count: current.count }));
            return undefined;
        }
        const sequence = char === ' '
            ? [' ']
            : [
                ...Array.from({ length: 2 + Math.floor(Math.random() * 4) }, () => CHARSET[Math.floor(Math.random() * CHARSET.length)]),
                char,
            ];
        let index = 0;
        let timer = setTimeout(function step() {
            const next = sequence[index];
            setFlap((current) => ({ shown: next, count: current.count + 1 }));
            index += 1;
            if (index < sequence.length) timer = setTimeout(step, FLIP_MS);
        }, delay);
        return () => clearTimeout(timer);
    }, [char, delay]);

    return (
        <span className="flap-cell">
            <span key={flap.count} className="flap-char">{flap.shown === ' ' ? ' ' : flap.shown}</span>
        </span>
    );
};

FlapCell.propTypes = {
    char: PropTypes.string.isRequired,
    delay: PropTypes.number.isRequired,
};

const FlapText = ({ text, length, delay = 0, className = '' }) => {
    const padded = String(text).toUpperCase().slice(0, length).padEnd(length, ' ');
    return (
        <span className={`inline-flex gap-[0.07em] ${className}`}>
            {[...padded].map((char, index) => (
                <FlapCell key={index} char={char} delay={delay + index * 35} />
            ))}
        </span>
    );
};

FlapText.propTypes = {
    text: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    length: PropTypes.number.isRequired,
    delay: PropTypes.number,
    className: PropTypes.string,
};

// Sized in the board's own font size so each label sits exactly above its column of cells
const ColumnLabel = ({ cells, children }) => (
    <span className="shrink-0" style={cells ? { width: `calc(${cells} * 0.78em + ${cells - 1} * 0.07em)` } : undefined}>
        <span className="text-[0.42em] tracking-[0.2em]">{children}</span>
    </span>
);

ColumnLabel.propTypes = {
    cells: PropTypes.number,
    children: PropTypes.node,
};

const demoRows = (base) => Array.from({ length: ROWS }, (_, offset) => ({
    token: base + offset,
    counter: DEMO_COUNTERS[(base + offset) % DEMO_COUNTERS.length],
    ready: offset === 0,
}));

const liveRows = (board) => {
    const readyTokens = new Set(board.ready.map((row) => row.tokenNumber));
    return [
        ...board.ready.map((row) => ({
            token: row.tokenNumber,
            counter: (row.counters?.[0] || '').replace(/counter/i, '').trim(),
            ready: true,
        })),
        ...board.preparing
            .filter((token) => !readyTokens.has(token))
            .map((token) => ({ token, counter: '', ready: false })),
    ].slice(0, ROWS);
};

/**
 * Airport-style "Now serving" board. Shows the restaurant's real tokens when the counter
 * is busy, otherwise a clearly labelled demo that keeps calling the next number.
 */
const TokenBoard = ({ board, restaurantName }) => {
    const wide = useMediaQuery('(min-width: 640px)');
    const [base, setBase] = useState(41);
    const live = Boolean(board && board.ready.length + board.preparing.length > 0);

    useEffect(() => {
        if (live || prefersReducedMotion()) return undefined;
        const timer = setInterval(() => {
            if (document.visibilityState === 'visible') setBase((current) => (current >= 996 ? 41 : current + 1));
        }, DEMO_STEP_MS);
        return () => clearInterval(timer);
    }, [live]);

    const rows = live ? liveRows(board) : demoRows(base);
    while (rows.length < ROWS) rows.push({ token: '', counter: '', ready: null });

    const summary = rows
        .filter((row) => row.token !== '')
        .map((row) => `token ${row.token} ${row.ready ? 'ready' : 'being prepared'}${row.counter ? ` at ${row.counter.toLowerCase()} counter` : ''}`)
        .join(', ');

    return (
        <div className="relative rounded-[28px] bg-[#121110] p-4 shadow-[0_50px_120px_-40px_rgba(255,90,31,0.45)] ring-1 ring-white/10 sm:p-6">
            <p className="sr-only">{live ? 'Live token board' : 'Demo token board'}: {summary}</p>

            <div aria-hidden="true">
                <div className="flex items-center justify-between font-code text-[10px] uppercase tracking-[0.2em] text-stone-500 sm:text-[11px]">
                    <span className="flex items-center gap-2">
                        <span className={`h-1.5 w-1.5 rounded-full ${live ? 'animate-pulse bg-leaf' : 'bg-turmeric'}`} />
                        {live ? `Live · ${restaurantName || 'Counter'}` : 'Demo board'}
                    </span>
                    <span>Now serving</span>
                </div>

                <div className="mt-4 font-code text-[clamp(1.05rem,4.6vw,1.3rem)] font-bold text-paper sm:text-[clamp(1rem,1.9vw,1.55rem)]">
                    <div className="mb-2 flex gap-[0.6em] font-medium uppercase text-stone-500">
                        <ColumnLabel cells={3}>Token</ColumnLabel>
                        {wide && <ColumnLabel cells={9}>Counter</ColumnLabel>}
                        <ColumnLabel>Status</ColumnLabel>
                    </div>
                    <div className="space-y-[0.35em]">
                        {rows.map((row, index) => (
                            <div key={index} className="flex gap-[0.6em]">
                                <FlapText text={row.token === '' ? '' : String(row.token).padStart(3, '0')} length={3} delay={index * 120} />
                                {wide && <FlapText text={row.counter} length={9} delay={index * 120 + 80} />}
                                <FlapText
                                    text={row.ready === null ? '' : row.ready ? 'READY' : 'PREPARING'}
                                    length={9}
                                    delay={index * 120 + 160}
                                    className={row.ready ? 'text-leaf' : 'text-turmeric'}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

TokenBoard.propTypes = {
    board: PropTypes.shape({
        ready: PropTypes.arrayOf(PropTypes.shape({ tokenNumber: PropTypes.number, counters: PropTypes.arrayOf(PropTypes.string) })),
        preparing: PropTypes.arrayOf(PropTypes.number),
    }),
    restaurantName: PropTypes.string,
};

export default TokenBoard;
