import { Link } from 'react-router-dom';
import Skeleton from '../../components/pos/Skeleton';
import { EmptyState, Kpi, PageHeader, Table } from '../../components/console/ui';
import { consoleApi, formatDate } from '../../utils/console';
import { formatINR } from '../../utils/pos';
import { useCachedQuery } from '../../utils/useCachedQuery';

const METHODS = { upi: 'UPI', bank: 'Bank transfer', cash: 'Cash', card: 'Card', other: 'Other' };

const fetchPayments = () => consoleApi.get('/payments').then((res) => res.data.payments);

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
                        <Kpi label="This month" value={formatINR(sumSince(payments, monthStart))} note={`${payments.filter((payment) => new Date(payment.paidOn) >= monthStart).length} payments`} />
                        <Kpi label="This financial year" value={formatINR(sumSince(payments, yearStart))} note={`Since ${formatDate(yearStart)}`} />
                        <Kpi label="All time" value={formatINR(payments.reduce((sum, payment) => sum + payment.amount, 0))} note={`${payments.length} payments`} />
                    </div>
                    {payments.length === 0 ? <EmptyState>No payments yet. Record one from a hotel&apos;s Subscription tab.</EmptyState> : (
                        <Table head={['Paid on', 'Hotel', 'Amount', 'Months', 'Paid by', 'Reference', 'Covers until']}>
                            {payments.map((payment) => (
                                <tr key={payment._id}>
                                    <td className="whitespace-nowrap px-4 py-3">{formatDate(payment.paidOn)}</td>
                                    <td className="px-4 py-3">
                                        <Link to={`/console/hotels/${payment.hotelId}`} className="font-semibold text-stone-900 hover:underline">{payment.hotelName}</Link>
                                    </td>
                                    <td className="px-4 py-3 font-semibold tabular-nums">{formatINR(payment.amount)}</td>
                                    <td className="px-4 py-3">{payment.months}</td>
                                    <td className="px-4 py-3">{METHODS[payment.method] || payment.method}</td>
                                    <td className="px-4 py-3 text-stone-600">{payment.reference || payment.note || '—'}</td>
                                    <td className="whitespace-nowrap px-4 py-3">{formatDate(payment.periodEnd)}</td>
                                </tr>
                            ))}
                        </Table>
                    )}
                </>
            )}
        </>
    );
}
