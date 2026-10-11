import { useState } from 'react';
import PropTypes from 'prop-types';
import Skeleton from '../../components/pos/Skeleton';
import { DataTable, EmptyState, Kpi, inputClass } from '../../components/console/ui';
import { consoleApi } from '../../utils/console';
import { formatINR, formatTime, todayInTimeZone } from '../../utils/pos';
import { useCachedQuery } from '../../utils/useCachedQuery';

const STATUS_STYLE = {
    cancelled: 'bg-rose-50 text-rose-700',
    served: 'bg-stone-100 text-stone-600',
    ready: 'bg-emerald-50 text-emerald-700',
    preparing: 'bg-amber-50 text-amber-800',
};

const billColumns = (timeZone) => [
    { label: 'Token', className: 'font-bold tabular-nums', render: (bill) => <span className="font-bold tabular-nums">#{bill.tokenNumber}</span> },
    {
        label: 'Amount',
        card: 'aside',
        className: 'whitespace-nowrap',
        render: (bill) => <span className={`font-semibold tabular-nums ${bill.status === 'cancelled' ? 'line-through' : ''}`}>{formatINR(bill.total)}</span>,
    },
    {
        label: 'Status',
        card: 'aside',
        render: (bill) => (
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLE[bill.status]}`} title={bill.cancelReason || undefined}>
                {bill.status}
            </span>
        ),
    },
    { label: 'Bill no.', className: 'whitespace-nowrap', render: (bill) => <span className="font-mono text-xs">{bill.billNumber}</span> },
    { label: 'Time', className: 'whitespace-nowrap', render: (bill) => formatTime(bill.createdAt, timeZone) },
    { label: 'Paid by', render: (bill) => <span className="uppercase">{bill.payment.mode}</span> },
    {
        label: 'Items',
        card: 'full',
        className: 'max-w-[280px]',
        render: (bill) => <span className="line-clamp-2">{bill.items.map((item) => `${item.quantity}× ${item.name}`).join(', ')}</span>,
    },
];

/**
 * One hotel's bills for any day, with the day's totals
 */
export default function HotelSales({ hotelId, timeZone }) {
    const today = todayInTimeZone(timeZone);
    const [date, setDate] = useState(today);
    const { data } = useCachedQuery(
        `console:bills:${hotelId}:${date}`,
        () => consoleApi.get(`/hotels/${hotelId}/bills`, { params: { date } }).then((res) => res.data),
        { refreshInterval: date === today ? 30000 : 0 }
    );

    return (
        <div className="space-y-4">
            <label className="flex items-center gap-3 text-sm font-medium text-stone-600">
                Day
                <input type="date" className={`${inputClass} w-auto`} value={date} max={today} onChange={(event) => event.target.value && setDate(event.target.value)} />
            </label>

            {!data ? <Skeleton className="h-72" /> : (
                <>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                        <Kpi label="Sales" value={formatINR(data.summary.total)} note={`${data.summary.billCount} bills · avg ${formatINR(data.summary.averageBill)}`} />
                        <Kpi label="Cash" value={formatINR(data.summary.byMode.cash.total)} note={`${data.summary.byMode.cash.count} bills`} />
                        <Kpi label="UPI" value={formatINR(data.summary.byMode.upi.total)} note={`${data.summary.byMode.upi.count} bills`} />
                        <Kpi label="Card" value={formatINR(data.summary.byMode.card.total)} note={`${data.summary.byMode.card.count} bills`} />
                        <Kpi label="GST collected" value={formatINR(data.summary.cgst + data.summary.sgst)} note={`${data.summary.cancelledCount} cancelled`} tone={data.summary.cancelledCount > 5 ? 'warn' : undefined} />
                    </div>

                    {data.bills.length === 0 ? <EmptyState>No bills on this day.</EmptyState> : (
                        <DataTable
                            columns={billColumns(timeZone)}
                            rows={data.bills}
                            rowKey={(bill) => bill._id}
                            rowClassName={(bill) => (bill.status === 'cancelled' ? 'text-stone-400' : '')}
                        />
                    )}
                </>
            )}
        </div>
    );
}

HotelSales.propTypes = {
    hotelId: PropTypes.string.isRequired,
    timeZone: PropTypes.string,
};
