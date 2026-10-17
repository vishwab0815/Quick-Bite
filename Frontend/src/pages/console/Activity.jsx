import { Link } from 'react-router-dom';
import Skeleton from '../../components/pos/Skeleton';
import { DataTable, EmptyState, PageHeader } from '../../components/console/ui';
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
    'hotel.online_payments': 'Online payments',
};

const describe = (entry) => {
    const details = entry.details || {};
    switch (entry.action) {
        case 'hotel.disable': return details.reason;
        case 'payment.record': return `${formatINR(details.amount)} for ${details.months} month${details.months === 1 ? '' : 's'}`;
        case 'login.password_reset': return details.email;
        case 'hotel.create': return `Owner ${details.owner}`;
        case 'hotel.update': return Object.keys(details).join(', ');
        case 'hotel.online_payments': return Object.entries(details).map(([key, value]) => `${key}: ${value}`).join(', ');
        default: return '';
    }
};

const COLUMNS = [
    { label: 'Action', className: 'whitespace-nowrap font-medium', render: (entry) => <span className="font-medium">{ACTIONS[entry.action] || entry.action}</span> },
    { label: 'When', card: 'aside', className: 'whitespace-nowrap text-stone-600', render: (entry) => <span className="text-xs text-stone-500 md:text-sm md:text-stone-600">{formatDateTime(entry.createdAt)}</span> },
    {
        label: 'Hotel',
        render: (entry) => (entry.hotel ? <Link to={`/console/hotels/${entry.hotel}`} className="font-semibold hover:underline">{entry.hotelName}</Link> : '—'),
    },
    { label: 'By', card: 'full', className: 'text-stone-600', render: (entry) => entry.actorEmail || '—' },
    { label: 'Details', card: 'full', className: 'max-w-[260px] truncate text-stone-600', render: (entry) => describe(entry) || '—' },
    { label: 'IP address', render: (entry) => <span className="font-mono text-xs text-stone-500">{entry.ip}</span> },
];

const fetchAudit = () => consoleApi.get('/audit').then((res) => res.data.entries);

export default function Activity() {
    const { data: entries } = useCachedQuery('console:audit', fetchAudit);

    return (
        <>
            <PageHeader title="Activity log" subtitle="Every console sign-in and change - who, what, when and from where" />
            {!entries ? <Skeleton className="h-72" /> : entries.length === 0 ? <EmptyState>Nothing yet.</EmptyState> : (
                <DataTable columns={COLUMNS} rows={entries} rowKey={(entry) => entry._id} />
            )}
        </>
    );
}
