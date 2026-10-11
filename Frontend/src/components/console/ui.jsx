import { useEffect } from 'react';
import PropTypes from 'prop-types';
import { FiX } from 'react-icons/fi';
import { STATES } from '../../utils/console';

export const StatusBadge = ({ state }) => {
    const meta = STATES[state] || STATES.active;
    return (
        <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${meta.className}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
        </span>
    );
};

StatusBadge.propTypes = { state: PropTypes.string };

export const PageHeader = ({ title, subtitle, actions }) => (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-stone-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
);

PageHeader.propTypes = {
    title: PropTypes.node.isRequired,
    subtitle: PropTypes.node,
    actions: PropTypes.node,
};

export const Button = ({ variant = 'primary', className = '', ...props }) => {
    const styles = {
        primary: 'bg-stone-900 text-white hover:bg-stone-700',
        secondary: 'bg-white text-stone-800 ring-1 ring-stone-200 hover:bg-stone-50',
        danger: 'bg-rose-600 text-white hover:bg-rose-700',
        success: 'bg-emerald-600 text-white hover:bg-emerald-700',
    };
    return (
        <button
            type="button"
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
            {...props}
        />
    );
};

Button.propTypes = {
    variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'success']),
    className: PropTypes.string,
};

export const inputClass = 'w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-900 focus:ring-4 focus:ring-stone-900/5';

export const Field = ({ label, hint, children, className = '' }) => (
    <label className={`block ${className}`}>
        <span className="mb-1.5 block text-xs font-semibold text-stone-600">{label}</span>
        {children}
        {hint && <span className="mt-1 block text-xs text-stone-400">{hint}</span>}
    </label>
);

Field.propTypes = {
    label: PropTypes.node.isRequired,
    hint: PropTypes.node,
    children: PropTypes.node.isRequired,
    className: PropTypes.string,
};

export const Modal = ({ title, onClose, children, wide = false }) => {
    useEffect(() => {
        const onKey = (event) => { if (event.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                onMouseDown={(event) => event.stopPropagation()}
                className={`max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}
            >
                <div className="mb-5 flex items-center justify-between gap-4">
                    <h2 className="text-lg font-bold">{title}</h2>
                    <button onClick={onClose} className="rounded-full p-2 text-stone-500 hover:bg-stone-100" aria-label="Close">
                        <FiX />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
};

Modal.propTypes = {
    title: PropTypes.string.isRequired,
    onClose: PropTypes.func.isRequired,
    children: PropTypes.node.isRequired,
    wide: PropTypes.bool,
};

export const EmptyState = ({ children }) => (
    <p className="rounded-2xl border border-dashed border-stone-200 px-6 py-10 text-center text-sm text-stone-500">{children}</p>
);

EmptyState.propTypes = { children: PropTypes.node };

export const ErrorNote = ({ message }) => (message
    ? <p role="alert" className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700 ring-1 ring-rose-200">{message}</p>
    : null);

ErrorNote.propTypes = { message: PropTypes.string };

/**
 * Rows of data: a table on wider screens, one card per row on phones.
 *
 * Each column: { label, render(row), className?, card? }
 *   cardLabel: false hides the column name on the card (e.g. action buttons)
 *   card: 'title' - big text at the top of the card (defaults to the first column)
 *         'aside' - top-right of the card (status badge, amount)
 *         'full'  - spans the card's full width (long text, actions)
 *         'hide'  - table only
 * Other columns appear in the card as label / value pairs.
 */
export const DataTable = ({ columns, rows, rowKey, onRowClick, rowClassName }) => {
    const titleColumn = columns.find((column) => column.card === 'title') || columns[0];
    const asideColumns = columns.filter((column) => column.card === 'aside');
    const detailColumns = columns.filter((column) => column !== titleColumn && !['aside', 'hide'].includes(column.card));
    // Which details land in the card's right-hand column (full-width rows restart the pairing)
    let slot = 0;
    const onRight = detailColumns.map((column) => {
        if (column.card === 'full') {
            slot = 0;
            return false;
        }
        slot += 1;
        return slot % 2 === 0;
    });
    const open = (row) => onRowClick?.(row);
    const keyOpen = (row) => (event) => { if (event.key === 'Enter') open(row); };

    return (
        <>
            {/* Phones: cards */}
            <ul className="space-y-3 md:hidden">
                {rows.map((row) => (
                    <li
                        key={rowKey(row)}
                        {...(onRowClick && { onClick: () => open(row), onKeyDown: keyOpen(row), tabIndex: 0, role: 'button' })}
                        className={`rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(28,25,23,0.05)] ${
                            onRowClick ? 'cursor-pointer transition-colors active:bg-stone-50' : ''
                        } ${rowClassName?.(row) || ''}`}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 text-[15px]">{titleColumn.render(row)}</div>
                            {asideColumns.length > 0 && (
                                <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                                    {asideColumns.map((column) => <div key={column.label}>{column.render(row)}</div>)}
                                </div>
                            )}
                        </div>
                        {detailColumns.length > 0 && (
                            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-stone-100 pt-3 text-sm">
                                {detailColumns.map((column, index) => (
                                    <div key={column.label} className={column.card === 'full' ? 'col-span-2' : `min-w-0 ${onRight[index] ? 'text-right' : ''}`}>
                                        {column.cardLabel !== false && <dt className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">{column.label}</dt>}
                                        <dd className="mt-0.5 break-words">{column.render(row)}</dd>
                                    </div>
                                ))}
                            </dl>
                        )}
                    </li>
                ))}
            </ul>

            {/* Tablets and up: table */}
            <div className="hidden overflow-x-auto rounded-2xl border border-stone-200/80 bg-white shadow-[0_1px_2px_rgba(28,25,23,0.05)] md:block">
                <table className="w-full text-left text-sm">
                    <thead className="border-b border-stone-200 bg-stone-50/80 text-xs font-semibold uppercase tracking-wide text-stone-500">
                        <tr>{columns.map((column) => <th key={column.label} className="whitespace-nowrap px-4 py-3">{column.label}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                        {rows.map((row) => (
                            <tr
                                key={rowKey(row)}
                                {...(onRowClick && { onClick: () => open(row), onKeyDown: keyOpen(row), tabIndex: 0 })}
                                className={`${onRowClick ? 'cursor-pointer transition-colors hover:bg-stone-50 focus:bg-stone-50 focus:outline-none' : ''} ${rowClassName?.(row) || ''}`}
                            >
                                {columns.map((column) => (
                                    <td key={column.label} className={`px-4 py-3 ${column.className || ''}`}>{column.render(row)}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
};

DataTable.propTypes = {
    columns: PropTypes.arrayOf(PropTypes.shape({
        label: PropTypes.string.isRequired,
        render: PropTypes.func.isRequired,
        className: PropTypes.string,
        card: PropTypes.oneOf(['title', 'aside', 'full', 'hide']),
        cardLabel: PropTypes.bool,
    })).isRequired,
    rows: PropTypes.array.isRequired,
    rowKey: PropTypes.func.isRequired,
    onRowClick: PropTypes.func,
    rowClassName: PropTypes.func,
};

/** Key figure: label, big value and a short note underneath */
export const Kpi = ({ label, value, note, tone }) => (
    <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(28,25,23,0.05)]">
        <p className="text-xs font-medium text-stone-500">{label}</p>
        <p className={`mt-1.5 text-xl font-semibold tracking-tight tabular-nums sm:text-2xl ${tone === 'warn' ? 'text-rose-700' : 'text-stone-900'}`}>{value}</p>
        {note && <p className="mt-1.5 truncate text-xs text-stone-500">{note}</p>}
    </div>
);

Kpi.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.node.isRequired,
    note: PropTypes.node,
    tone: PropTypes.oneOf(['warn']),
};
