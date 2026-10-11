import { Link } from 'react-router-dom';
import { FiArrowRight, FiRefreshCw } from 'react-icons/fi';
import { Card, DailyColumns, BarList } from '../../components/pos/DashboardCharts';
import Skeleton from '../../components/pos/Skeleton';
import { PageHeader, StatusBadge, Button, EmptyState, Kpi } from '../../components/console/ui';
import { consoleApi, compactINR, daysLeftLabel, formatDate, timeAgo } from '../../utils/console';
import { formatINR } from '../../utils/pos';
import { useCachedQuery } from '../../utils/useCachedQuery';

const fetchOverview = () => consoleApi.get('/overview').then((res) => res.data);

export default function Overview() {
    const { data, error, refresh } = useCachedQuery('console:overview', fetchOverview, { refreshInterval: 60000 });

    if (!data) {
        return (
            <>
                <PageHeader title="Overview" subtitle="Every hotel on QuickBite at a glance" />
                {error ? <EmptyState>Could not load the overview. <button className="font-semibold underline" onClick={refresh}>Try again</button></EmptyState> : (
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="h-24" />)}</div>
                )}
            </>
        );
    }

    const { hotels, revenue, orders, daily, topHotels, attention } = data;

    return (
        <>
            <PageHeader
                title="Overview"
                subtitle={`Every hotel on QuickBite · updated ${timeAgo(data.generatedAt).toLowerCase()}`}
                actions={<Button variant="secondary" onClick={refresh}><FiRefreshCw /> Refresh</Button>}
            />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Kpi label="Hotels billing now" value={`${hotels.active} / ${hotels.total}`} note={`${hotels.trial} on free trial`} />
                <Kpi label="Monthly recurring revenue" value={formatINR(revenue.mrr)} note="from paying hotels" />
                <Kpi label="Collected this month" value={formatINR(revenue.collectedThisMonth)} note={`${revenue.paymentsThisMonth} payment${revenue.paymentsThisMonth === 1 ? '' : 's'}`} />
                <Kpi label="Need attention" tone={hotels.expired + hotels.disabled > 0 ? 'warn' : undefined} value={String(hotels.expiring + hotels.expired + hotels.disabled)} note={`${hotels.expired} expired · ${hotels.disabled} disabled`} />
                <Kpi label="Orders today" value={orders.ordersToday.toLocaleString('en-IN')} note="across all hotels" />
                <Kpi label="Sales today" value={formatINR(orders.salesToday)} note="hotels' takings" />
                <Kpi label="Orders · 30 days" value={orders.orders30.toLocaleString('en-IN')} note="across all hotels" />
                <Kpi label="Sales · 30 days" value={compactINR(orders.sales30)} note="hotels' takings" />
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
                <Card title="Sales across all hotels" subtitle="Last 30 days · hover a day for orders">
                    <DailyColumns data={daily} />
                </Card>
                <Card title="Top hotels" subtitle="By sales, last 30 days">
                    <BarList
                        rows={topHotels.filter((hotel) => hotel.stats.sales30 > 0).map((hotel) => ({
                            label: hotel.name,
                            value: hotel.stats.sales30,
                            detail: `${hotel.stats.orders30} orders`,
                        }))}
                        formatValue={compactINR}
                        emptyText="No orders in the last 30 days"
                        emphasizeFirst
                        emphasisLabel="Top"
                    />
                </Card>
            </div>

            <Card className="mt-4" title="Needs attention" subtitle="Subscriptions ending, expired, or hotels you switched off">
                {attention.length === 0 ? (
                    <EmptyState>All hotels are paid up and running.</EmptyState>
                ) : (
                    <ul className="divide-y divide-stone-100">
                        {attention.map((hotel) => (
                            <li key={hotel._id}>
                                <Link to={`/console/hotels/${hotel._id}`} className="group flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate font-semibold text-stone-900">{hotel.name}</span>
                                        <span className="text-xs text-stone-500">
                                            {hotel.subscription.state === 'disabled'
                                                ? hotel.statusReason || 'Switched off'
                                                : `Paid until ${formatDate(hotel.subscription.paidUntil)} · ${daysLeftLabel(hotel.subscription.daysLeft)}`}
                                        </span>
                                    </span>
                                    <StatusBadge state={hotel.subscription.state} />
                                    <FiArrowRight className="text-stone-400 transition-transform group-hover:translate-x-0.5" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </>
    );
}
