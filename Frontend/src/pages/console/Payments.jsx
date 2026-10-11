import { Link } from 'react-router-dom';
import Skeleton from '../../components/pos/Skeleton';
import { DataTable, EmptyState, Kpi, PageHeader } from '../../components/console/ui';
import { consoleApi, formatDate } from '../../utils/console';
import { formatINR } from '../../utils/pos';
import { useCachedQuery } from '../../utils/useCachedQuery';

const METHODS = { upi: 'UPI', bank: 'Bank transfer', cash: 'Cash', card: 'Card', other: 'Other' };

const COLUMNS = [
    {
        label: 'Hotel',
        render: (payment) => (
            <>
                <Link to={`/console/hotels/${payment.hotelId}`} className="font-semibold text-stone-900 hover:underline">{payment.hotelName}</Link>
                <p className="text-xs text-stone-500 md:hidden">{formatDate(payment.paidOn)}</p>
            </>
        ),
    },
    { label: 'Paid on', card: 'hide', className: 'whitespace-nowrap', render: (payment) => formatDate(payment.paidOn) },
    { label: 'Amount', card: 'aside', render: (payment) => <span className="font-semibold tabular-nums">{formatINR(payment.amount)}</span> },
    { label: 'Months', render: (payment) => payment.months },
    { label: 'Paid by', render: (payment) => METHODS[payment.method] || payment.method },
    { label: 'Covers until', className: 'whitespace-nowrap', render: (payment) => formatDate(payment.periodEnd) },
    { label: 'Reference', className: 'text-stone-600', render: (payment) => payment.reference || payment.note || '—' },
];

const fetchPayments = () => consoleApi.get('/payments').then((res) => res.data.payments);

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

const sumSince = (payments, since) => payments
    .filter((payment) => new Date(payment.paidOn) >= since)
    .reduce((sum, payment) => sum + payment.amount, 0);

export default function Payments() {
    const { data: payments } = useCachedQuery('console:payments', fetchPayments);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1, 3, 1); // Indian financial year

    return (
        <>
            <PageHeader title="Payments" subtitle="Subscription payments received from hotels" />
            {!payments ? <Skeleton className="h-72" /> : (
                <>
                    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
                        <Kpi label="This month" value={formatINR(sumSince(payments, monthStart))} note={plural(payments.filter((payment) => new Date(payment.paidOn) >= monthStart).length, 'payment')} />
                        <Kpi label="This financial year" value={formatINR(sumSince(payments, yearStart))} note={`Since ${formatDate(yearStart)}`} />
                        <Kpi label="All time" value={formatINR(payments.reduce((sum, payment) => sum + payment.amount, 0))} note={plural(payments.length, 'payment')} />
                    </div>
                    {payments.length === 0 ? <EmptyState>No payments yet. Record one from a hotel&apos;s Subscription tab.</EmptyState> : (
                        <DataTable columns={COLUMNS} rows={payments} rowKey={(payment) => payment._id} />
                    )}
                </>
            )}
        </>
    );
}
