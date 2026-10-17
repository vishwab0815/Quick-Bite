import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { FiArrowLeft, FiExternalLink, FiPower, FiKey } from 'react-icons/fi';
import { Card, DailyColumns, PaymentMix, BarList } from '../../components/pos/DashboardCharts';
import Skeleton from '../../components/pos/Skeleton';
import VegDot from '../../components/pos/VegDot';
import { Button, DataTable, EmptyState, ErrorNote, Field, Kpi, Modal, StatusBadge, inputClass } from '../../components/console/ui';
import { consoleApi, apiError, compactINR, daysLeftLabel, formatDate, timeAgo, PLAN_LABELS } from '../../utils/console';
import { formatINR } from '../../utils/pos';
import { showToast } from '../../utils/toast';
import { useCachedQuery } from '../../utils/useCachedQuery';
import HotelSales from './HotelSales';
import HotelSubscription from './HotelSubscription';
import HotelSettings from './HotelSettings';
import HotelOnlinePayments from './HotelOnlinePayments';

const TABS = ['Overview', 'Sales', 'Menu', 'Staff', 'Online orders', 'Subscription', 'Settings'];

/* ---------- Enable / disable ---------- */

const StatusModal = ({ hotel, onClose, onChanged }) => {
    const disabling = hotel.status === 'active';
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const submit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        try {
            await consoleApi.patch(`/hotels/${hotel._id}/status`, { status: disabling ? 'disabled' : 'active', reason });
            showToast.success(disabling ? `${hotel.name} is switched off` : `${hotel.name} is switched back on`);
            onChanged();
        } catch (err) {
            setError(apiError(err, 'Could not change the status'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal title={disabling ? `Disable ${hotel.name}?` : `Enable ${hotel.name}?`} onClose={onClose}>
            <form onSubmit={submit} className="space-y-4">
                <p className="text-sm leading-relaxed text-stone-600">
                    {disabling
                        ? 'Their counter, kitchen screens and token TV stop within 15 seconds and nobody from this hotel can sign in. No data is deleted - enable it again any time.'
                        : 'Their staff can sign in and bill again straight away (as long as the subscription is paid).'}
                </p>
                {disabling && (
                    <Field label="Reason (shown in the activity log)">
                        <input className={inputClass} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="e.g. Unpaid for 2 months" required autoFocus />
                    </Field>
                )}
                <ErrorNote message={error} />
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit" variant={disabling ? 'danger' : 'success'} disabled={saving || (disabling && !reason.trim())}>
                        {saving ? 'Saving…' : disabling ? 'Disable hotel' : 'Enable hotel'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

StatusModal.propTypes = {
    hotel: PropTypes.object.isRequired,
    onClose: PropTypes.func.isRequired,
    onChanged: PropTypes.func.isRequired,
};

/* ---------- Tabs ---------- */

const OverviewTab = ({ data }) => {
    const { stats, today, daily, paymentMix, topItems, counts, hotel, owners } = data;
    const byMode = Object.fromEntries(paymentMix.map((entry) => [entry.mode, { count: entry.orders, total: entry.sales }]));

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Kpi label="Sales today" value={formatINR(stats.salesToday)} note={`${stats.ordersToday} orders · avg ${formatINR(today.averageBill)}`} />
                <Kpi label="Sales · 30 days" value={formatINR(stats.sales30)} note={`${stats.orders30.toLocaleString('en-IN')} orders`} />
                <Kpi label="Sales · all time" value={compactINR(stats.salesAll)} note={`${stats.ordersAll.toLocaleString('en-IN')} orders since ${formatDate(hotel.createdAt)}`} />
                <Kpi label="Last order" value={timeAgo(stats.lastOrderAt)} note={`${counts.cancelled30} cancelled in 30 days`} tone={counts.cancelled30 > 10 ? 'warn' : undefined} />
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
                <Card title="Sales per day" subtitle="Last 30 days · hover a day for orders">
                    <DailyColumns data={daily} />
                </Card>
                <Card title="How customers paid" subtitle="Last 30 days">
                    <PaymentMix byMode={byMode} />
                </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card title="Best sellers" subtitle="By quantity, last 30 days">
                    <BarList
                        rows={topItems.map((item) => ({ label: item.name, value: item.quantity, detail: formatINR(item.amount) }))}
                        formatValue={(value) => `${value} sold`}
                        emptyText="No orders yet"
                    />
                </Card>
                <Card title="Account">
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                        <div><dt className="text-xs text-stone-500">Owner</dt><dd className="font-medium">{owners.map((owner) => owner.name).join(', ') || '—'}</dd></div>
                        <div><dt className="text-xs text-stone-500">Owner login</dt><dd className="truncate font-medium">{owners.map((owner) => owner.email).join(', ') || '—'}</dd></div>
                        <div><dt className="text-xs text-stone-500">Phone</dt><dd className="font-medium">{hotel.settings.phone || '—'}</dd></div>
                        <div><dt className="text-xs text-stone-500">UPI ID</dt><dd className="truncate font-medium">{hotel.settings.upiVpa || 'Not set'}</dd></div>
                        <div className="col-span-2"><dt className="text-xs text-stone-500">Address</dt><dd className="font-medium">{hotel.settings.address || '—'}</dd></div>
                        <div><dt className="text-xs text-stone-500">Menu items</dt><dd className="font-medium">{counts.menuItems}</dd></div>
                        <div><dt className="text-xs text-stone-500">Staff logins</dt><dd className="font-medium">{counts.staff}</dd></div>
                        <div><dt className="text-xs text-stone-500">Regular customers</dt><dd className="font-medium">{counts.customers}</dd></div>
                        <div><dt className="text-xs text-stone-500">Joined</dt><dd className="font-medium">{formatDate(hotel.createdAt)}</dd></div>
                    </dl>
                </Card>
            </div>
        </div>
    );
};

OverviewTab.propTypes = { data: PropTypes.object.isRequired };

const MENU_COLUMNS = [
    { label: 'Dish', render: (item) => <span className="flex items-center gap-2.5 font-medium"><VegDot isVeg={item.isVeg !== false} /> {item.name}</span> },
    { label: 'Price', card: 'aside', render: (item) => <span className="font-semibold tabular-nums">{formatINR(item.price)}</span> },
    { label: 'Food counter', className: 'text-stone-600', render: (item) => item.counter },
    { label: 'Category', className: 'text-stone-600', render: (item) => item.category },
    {
        label: 'Today',
        render: (item) => (item.isAvailable === false
            ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">Sold out</span>
            : <span className="text-xs text-stone-500">Available</span>),
    },
];

const MenuTab = ({ hotelId }) => {
    const { data: items } = useCachedQuery(`console:menu:${hotelId}`, () => consoleApi.get(`/hotels/${hotelId}/menu`).then((res) => res.data.items));
    if (!items) return <Skeleton className="h-72" />;
    if (items.length === 0) return <EmptyState>This hotel has not added a menu yet.</EmptyState>;
    return (
        <DataTable columns={MENU_COLUMNS} rows={items} rowKey={(item) => item._id} />
    );
};

MenuTab.propTypes = { hotelId: PropTypes.string.isRequired };

const ResetPasswordModal = ({ hotelId, member, onClose }) => {
    const [password, setPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const submit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        try {
            const res = await consoleApi.patch(`/hotels/${hotelId}/staff/${member._id}/password`, { password });
            showToast.success(res.data.message);
            onClose();
        } catch (err) {
            setError(apiError(err, 'Could not reset the password'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal title={`New password for ${member.name}`} onClose={onClose}>
            <form onSubmit={submit} className="space-y-4">
                <Field label="New password" hint="8+ characters with upper case, lower case and a number. Share it with them privately.">
                    <input className={inputClass} type="text" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required autoFocus />
                </Field>
                <ErrorNote message={error} />
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit" disabled={saving || password.length < 8}>{saving ? 'Saving…' : 'Set password'}</Button>
                </div>
            </form>
        </Modal>
    );
};

ResetPasswordModal.propTypes = {
    hotelId: PropTypes.string.isRequired,
    member: PropTypes.object.isRequired,
    onClose: PropTypes.func.isRequired,
};

const staffColumns = (onReset) => [
    { label: 'Name', render: (member) => <span className="font-medium">{member.name}</span> },
    {
        label: 'Role',
        card: 'aside',
        render: (member) => (
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${member.role === 'admin' ? 'bg-orange-50 text-orange-800' : 'bg-stone-100 text-stone-700'}`}>
                {member.role === 'admin' ? 'Owner' : 'Staff'}
            </span>
        ),
    },
    { label: 'Login', card: 'full', className: 'text-stone-600', render: (member) => member.email },
    { label: 'Added', className: 'text-stone-600', render: (member) => formatDate(member.createdAt) },
    {
        label: 'Actions',
        card: 'full',
        cardLabel: false,
        className: 'text-right',
        render: (member) => (
            <Button variant="secondary" className="w-full px-3 py-1.5 text-xs md:w-auto" onClick={() => onReset(member)}><FiKey /> Reset password</Button>
        ),
    },
];

const StaffTab = ({ hotelId }) => {
    const { data: staff } = useCachedQuery(`console:staff:${hotelId}`, () => consoleApi.get(`/hotels/${hotelId}/staff`).then((res) => res.data.staff));
    const [resetting, setResetting] = useState(null);
    if (!staff) return <Skeleton className="h-48" />;
    return (
        <>
            <DataTable columns={staffColumns(setResetting)} rows={staff} rowKey={(member) => member._id} />
            {resetting && <ResetPasswordModal hotelId={hotelId} member={resetting} onClose={() => setResetting(null)} />}
        </>
    );
};

StaffTab.propTypes = { hotelId: PropTypes.string.isRequired };

/* ---------- Page ---------- */

export default function HotelDetail() {
    const { id } = useParams();
    const { data, error, refresh } = useCachedQuery(`console:hotel:${id}`, () => consoleApi.get(`/hotels/${id}`).then((res) => res.data), { refreshInterval: 60000 });
    const [tab, setTab] = useState('Overview');
    const [changingStatus, setChangingStatus] = useState(false);

    if (!data) {
        return error?.response?.status === 404
            ? <EmptyState>Hotel not found. <Link to="/console/hotels" className="font-semibold underline">Back to hotels</Link></EmptyState>
            : <div className="space-y-4"><Skeleton className="h-20" /><Skeleton className="h-72" /></div>;
    }

    const { hotel } = data;
    const subscription = hotel.subscription;

    return (
        <>
            <Link to="/console/hotels" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-stone-900">
                <FiArrowLeft /> Hotels
            </Link>

            <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight">{hotel.name}</h1>
                        <StatusBadge state={subscription.state} />
                    </div>
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500">
                        <span>{PLAN_LABELS[subscription.plan]}{subscription.monthlyFee ? ` · ${formatINR(subscription.monthlyFee)}/month` : ''}</span>
                        <span>Paid until {formatDate(subscription.paidUntil)} ({daysLeftLabel(subscription.daysLeft)})</span>
                        <a href={`/tv/${hotel.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-stone-700 hover:text-stone-900">
                            Token TV <FiExternalLink />
                        </a>
                    </p>
                    {hotel.status !== 'active' && hotel.statusReason && (
                        <p className="mt-2 rounded-lg bg-stone-200/60 px-3 py-1.5 text-sm text-stone-700">Disabled: {hotel.statusReason}</p>
                    )}
                </div>
                <Button variant={hotel.status === 'active' ? 'danger' : 'success'} onClick={() => setChangingStatus(true)}>
                    <FiPower /> {hotel.status === 'active' ? 'Disable hotel' : 'Enable hotel'}
                </Button>
            </header>

            <div className="mb-5 flex gap-1 overflow-x-auto border-b border-stone-200 [scrollbar-width:none]" role="tablist">
                {TABS.map((name) => (
                    <button
                        key={name}
                        role="tab"
                        aria-selected={tab === name}
                        onClick={() => setTab(name)}
                        className={`-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                            tab === name ? 'border-stone-900 text-stone-900' : 'border-transparent text-stone-500 hover:text-stone-800'
                        }`}
                    >
                        {name}
                    </button>
                ))}
            </div>

            {tab === 'Overview' && <OverviewTab data={data} />}
            {tab === 'Sales' && <HotelSales hotelId={id} timeZone={hotel.settings.timeZone} />}
            {tab === 'Menu' && <MenuTab hotelId={id} />}
            {tab === 'Staff' && <StaffTab hotelId={id} />}
            {tab === 'Online orders' && <HotelOnlinePayments hotel={hotel} />}
            {tab === 'Subscription' && <HotelSubscription hotel={hotel} onChanged={refresh} />}
            {tab === 'Settings' && <HotelSettings hotel={hotel} onChanged={refresh} />}

            {changingStatus && (
                <StatusModal
                    hotel={hotel}
                    onClose={() => setChangingStatus(false)}
                    onChanged={() => { setChangingStatus(false); refresh(); }}
                />
            )}
        </>
    );
}
