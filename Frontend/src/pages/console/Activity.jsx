import { Link } from 'react-router-dom';
import Skeleton from '../../components/pos/Skeleton';
import { EmptyState, PageHeader, Table } from '../../components/console/ui';
import { consoleApi, formatDateTime } from '../../utils/console';
import { formatINR } from '../../utils/pos';
import { useCachedQuery } from '../../utils/useCachedQuery';

const ACTIONS = {
    'console.signin': 'Signed in to the console',
    'hotel.create': 'Added hotel',
    'hotel.update': 'Edited hotel',
    'hotel.enable': 'Enabled hotel',
    'hotel.disable': 'Disabled hotel',
    'payment.record': 'Recorded payment',
    'login.password_reset': 'Reset a password',
};

const describe = (entry) => {
    const details = entry.details || {};
    switch (entry.action) {
        case 'hotel.disable': return details.reason;
        case 'payment.record': return `${formatINR(details.amount)} for ${details.months} month${details.months === 1 ? '' : 's'}`;
        case 'login.password_reset': return details.email;
        case 'hotel.create': return `Owner ${details.owner}`;
        case 'hotel.update': return Object.keys(details).join(', ');
        default: return '';
    }
};

const fetchAudit = () => consoleApi.get('/audit').then((res) => res.data.entries);

export default function Activity() {
    const { data: entries } = useCachedQuery('console:audit', fetchAudit);

    return (
        <>
            <PageHeader title="Activity log" subtitle="Every console sign-in and change - who, what, when and from where" />
            {!entries ? <Skeleton className="h-72" /> : entries.length === 0 ? <EmptyState>Nothing yet.</EmptyState> : (
                <Table head={['When', 'Action', 'Hotel', 'Details', 'By', 'IP address']}>
                    {entries.map((entry) => (
                        <tr key={entry._id}>
                            <td className="whitespace-nowrap px-4 py-3 text-stone-600">{formatDateTime(entry.createdAt)}</td>
                            <td className="whitespace-nowrap px-4 py-3 font-medium">{ACTIONS[entry.action] || entry.action}</td>
                            <td className="px-4 py-3">
                                {entry.hotel ? <Link to={`/console/hotels/${entry.hotel}`} className="font-semibold hover:underline">{entry.hotelName}</Link> : '—'}
                            </td>
                            <td className="max-w-[260px] truncate px-4 py-3 text-stone-600">{describe(entry) || '—'}</td>
                            <td className="px-4 py-3 text-stone-600">{entry.actorEmail}</td>
                            <td className="px-4 py-3 font-mono text-xs text-stone-500">{entry.ip}</td>
                        </tr>
                    ))}
                </Table>
            )}
        </>
    );
}
