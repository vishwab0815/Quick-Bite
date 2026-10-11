import { useState } from 'react';
import PropTypes from 'prop-types';
import { FiArrowUpRight, FiArrowDownRight } from 'react-icons/fi';
import { formatINR } from '../../utils/pos';

const compactINR = (amount) => {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1).replace(/\.0$/, '')}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1).replace(/\.0$/, '')}K`;
    return `₹${Math.round(amount)}`;
};

const niceMax = (value) => {
    if (value <= 0) return 1;
    const magnitude = 10 ** Math.floor(Math.log10(value));
    const step = [1, 2, 2.5, 5, 10].find((candidate) => candidate * magnitude >= value);
    return step * magnitude;
};

const hourLabel = (hour) => {
    const h = Number(hour);
    if (h === 0) return '12a';
    if (h === 12) return '12p';
    return h < 12 ? `${h}a` : `${h - 12}p`;
};

export const Card = ({ title, subtitle, children, className = '' }) => (
    <section className={`rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(28,25,23,0.05)] sm:p-5 ${className}`}>
        {(title || subtitle) && (
            <header className="mb-4">
                {title && <h2 className="text-sm font-semibold text-stone-900">{title}</h2>}
                {subtitle && <p className="mt-0.5 text-xs text-stone-500">{subtitle}</p>}
            </header>
        )}
        {children}
    </section>
);

Card.propTypes = {
    title: PropTypes.node,
    subtitle: PropTypes.node,
    children: PropTypes.node,
    className: PropTypes.string,
};

/**
 * Stat tile: label · value · delta vs a named period (up/down colored by whether up is good)
 */
export const StatTile = ({ label, value, delta, deltaLabel, upIsGood = true }) => {
    const hasDelta = Number.isFinite(delta);
    const good = hasDelta && (delta === 0 || (delta > 0) === upIsGood);
    return (
        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(28,25,23,0.05)]">
            <p className="text-xs font-medium text-stone-500">{label}</p>
            <p className="mt-1.5 text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">{value}</p>
            {hasDelta ? (
                <p className={`mt-1.5 flex items-center gap-1 text-xs font-medium ${good ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {delta >= 0 ? <FiArrowUpRight /> : <FiArrowDownRight />}
                    {delta >= 0 ? '+' : ''}{delta}% <span className="font-medium text-stone-500">{deltaLabel}</span>
                </p>
            ) : (
                <p className="mt-1.5 text-xs text-stone-400">{deltaLabel ? `No data ${deltaLabel}` : ' '}</p>
            )}
        </div>
    );
};

StatTile.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.node.isRequired,
    delta: PropTypes.number,
    deltaLabel: PropTypes.string,
    upIsGood: PropTypes.bool,
};

/**
 * Sales by hour - single-series column chart with per-column hover tooltip
 */
export const HourlyColumns = ({ data }) => {
    const [active, setActive] = useState(null);
    const byHour = new Map(data.map((entry) => [Number(entry.hour), entry]));
    const hours = data.map((entry) => Number(entry.hour));
    const start = Math.min(6, ...hours);
    const end = Math.max(22, ...hours);
    const slots = Array.from({ length: end - start + 1 }, (_, index) => {
        const hour = start + index;
        return { hour, total: byHour.get(hour)?.total || 0, count: byHour.get(hour)?.count || 0 };
    });
    const max = niceMax(Math.max(0, ...slots.map((slot) => slot.total)));
    const peak = slots.reduce((best, slot) => (slot.total > best.total ? slot : best), slots[0]);
    const ticks = [max, max / 2, 0];

    return (
        <div className="relative">
            <div className="flex">
                {/* Y axis */}
                <div className="relative mr-2 h-44 w-10 shrink-0 text-right text-[11px] tabular-nums text-stone-400">
                    {ticks.map((tick, index) => (
                        <span key={tick} className="absolute right-0 -translate-y-1/2" style={{ top: `${(index / 2) * 100}%` }}>
                            {compactINR(tick)}
                        </span>
                    ))}
                </div>

                <div className="relative h-44 flex-1">
                    {ticks.map((tick, index) => (
                        <div key={tick} className="absolute inset-x-0 h-px" style={{ top: `${(index / 2) * 100}%`, background: 'var(--viz-grid)' }} />
                    ))}

                    <div className="absolute inset-0 flex">
                        {slots.map((slot) => {
                            const height = (slot.total / max) * 100;
                            const isActive = active === slot.hour;
                            return (
                                <button
                                    key={slot.hour}
                                    type="button"
                                    onMouseEnter={() => setActive(slot.hour)}
                                    onMouseLeave={() => setActive(null)}
                                    onFocus={() => setActive(slot.hour)}
                                    onBlur={() => setActive(null)}
                                    className="relative flex h-full flex-1 items-end justify-center outline-none"
                                    aria-label={`${hourLabel(slot.hour)}: ${formatINR(slot.total)}, ${slot.count} bills`}
                                >
                                    {slot.total > 0 && (
                                        <span
                                            className="w-[70%] max-w-6 rounded-t-[4px] transition-opacity"
                                            style={{
                                                height: `${height}%`,
                                                background: 'var(--viz-series-1)',
                                                opacity: active === null || isActive ? 1 : 0.45,
                                            }}
                                        />
                                    )}
                                    {slot.hour === peak.hour && peak.total > 0 && active === null && (
                                        <span
                                            className="absolute -translate-y-1 whitespace-nowrap text-[11px] font-semibold text-stone-700"
                                            style={{ bottom: `${height}%` }}
                                        >
                                            {compactINR(slot.total)}
                                        </span>
                                    )}
                                    {isActive && (
                                        <span className="pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-lg bg-stone-900 px-2.5 py-1.5 text-left text-xs text-white shadow-lg">
                                            <span className="block font-semibold">{hourLabel(slot.hour)} – {hourLabel(slot.hour + 1)}</span>
                                            <span className="block tabular-nums">{formatINR(slot.total)} · {slot.count} bill{slot.count === 1 ? '' : 's'}</span>
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* X axis */}
            <div className="ml-12 mt-2 flex text-[11px] text-stone-400">
                {slots.map((slot) => (
                    <span key={slot.hour} className="flex-1 text-center">
                        {(slot.hour - start) % 3 === 0 ? hourLabel(slot.hour) : ''}
                    </span>
                ))}
            </div>
        </div>
    );
};

HourlyColumns.propTypes = {
    data: PropTypes.arrayOf(PropTypes.shape({ hour: PropTypes.string, total: PropTypes.number, count: PropTypes.number })).isRequired,
};

/**
 * Payment mix - part-to-whole stacked bar (2px surface gaps) with a legend that carries the values
 */
export const PaymentMix = ({ byMode }) => {
    const [active, setActive] = useState(null);
    const segments = [
        { key: 'cash', label: 'Cash', color: 'var(--viz-series-1)' },
        { key: 'upi', label: 'UPI', color: 'var(--viz-series-2)' },
        { key: 'card', label: 'Card', color: 'var(--viz-series-3)' },
    ].map((segment) => ({ ...segment, ...byMode[segment.key] }));
    const total = segments.reduce((sum, segment) => sum + segment.total, 0);

    if (total === 0) {
        return <p className="py-6 text-center text-sm text-stone-400">No payments yet</p>;
    }

    const visible = segments.filter((segment) => segment.total > 0);

    return (
        <div>
            <div className="flex h-3.5 gap-[2px]" style={{ background: 'var(--viz-surface)' }}>
                {visible.map((segment, index) => (
                    <div
                        key={segment.key}
                        onMouseEnter={() => setActive(segment.key)}
                        onMouseLeave={() => setActive(null)}
                        className={`relative h-full transition-opacity ${index === 0 ? 'rounded-l-[4px]' : ''} ${index === visible.length - 1 ? 'rounded-r-[4px]' : ''}`}
                        style={{
                            width: `${(segment.total / total) * 100}%`,
                            background: segment.color,
                            opacity: active === null || active === segment.key ? 1 : 0.4,
                        }}
                    >
                        {active === segment.key && (
                            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-stone-900 px-2.5 py-1.5 text-xs text-white shadow-lg">
                                <span className="font-semibold">{segment.label}</span> · {formatINR(segment.total)} · {segment.count} bill{segment.count === 1 ? '' : 's'}
                            </span>
                        )}
                    </div>
                ))}
            </div>

            <ul className="mt-4 space-y-2.5">
                {segments.map((segment) => (
                    <li
                        key={segment.key}
                        className="flex items-center justify-between gap-3 text-sm"
                        onMouseEnter={() => setActive(segment.key)}
                        onMouseLeave={() => setActive(null)}
                    >
                        <span className="flex items-center gap-2 text-stone-600">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: segment.color }} />
                            {segment.label}
                            <span className="text-xs text-stone-400">{segment.count} bill{segment.count === 1 ? '' : 's'}</span>
                        </span>
                        <span className="tabular-nums">
                            <span className="font-semibold text-stone-900">{formatINR(segment.total)}</span>
                            <span className="ml-2 inline-block w-10 text-right text-xs text-stone-400">
                                {Math.round((segment.total / total) * 100)}%
                            </span>
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

PaymentMix.propTypes = {
    byMode: PropTypes.object.isRequired,
};

/**
 * Ranked horizontal bars with the value at the tip.
 * emphasizeFirst highlights the top row (accent) and greys the rest.
 */
export const BarList = ({ rows, formatValue, emptyText, emphasizeFirst = false, emphasisLabel }) => {
    if (rows.length === 0) {
        return <p className="py-6 text-center text-sm text-stone-400">{emptyText}</p>;
    }
    const max = Math.max(...rows.map((row) => row.value)) || 1;

    return (
        <ul className="space-y-3.5">
            {rows.map((row, index) => {
                const accent = emphasizeFirst && index === 0;
                return (
                    <li key={row.label} title={`${row.label}: ${formatValue(row.value)}${row.detail ? ` · ${row.detail}` : ''}`}>
                        <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                            <span className="truncate font-medium text-stone-700">
                                {row.label}
                                {accent && emphasisLabel && (
                                    <span className="ml-2 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-800">{emphasisLabel}</span>
                                )}
                            </span>
                            <span className="shrink-0 tabular-nums">
                                <span className="font-semibold text-stone-900">{formatValue(row.value)}</span>
                                {row.detail && <span className="ml-1.5 text-xs text-stone-400">{row.detail}</span>}
                            </span>
                        </div>
                        <div className="h-2.5 rounded-r-[4px] bg-stone-100">
                            <div
                                className="h-full rounded-r-[4px]"
                                style={{
                                    width: `${Math.max((row.value / max) * 100, 2)}%`,
                                    background: emphasizeFirst ? (accent ? 'var(--viz-series-2)' : 'var(--viz-muted)') : 'var(--viz-series-1)',
                                }}
                            />
                        </div>
                    </li>
                );
            })}
        </ul>
    );
};

BarList.propTypes = {
    rows: PropTypes.arrayOf(PropTypes.shape({ label: PropTypes.string, value: PropTypes.number, detail: PropTypes.string })).isRequired,
    formatValue: PropTypes.func.isRequired,
    emptyText: PropTypes.string.isRequired,
    emphasizeFirst: PropTypes.bool,
    emphasisLabel: PropTypes.string,
};
