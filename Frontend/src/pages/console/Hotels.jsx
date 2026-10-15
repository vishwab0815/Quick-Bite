import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { FiPlus, FiSearch } from 'react-icons/fi';
import Skeleton from '../../components/pos/Skeleton';
import { PageHeader, StatusBadge, Button, Modal, Field, inputClass, ErrorNote, EmptyState, DataTable } from '../../components/console/ui';
import { consoleApi, apiError, compactINR, daysLeftLabel, formatDate, timeAgo, PLAN_LABELS } from '../../utils/console';
import { formatINR } from '../../utils/pos';
import { showToast } from '../../utils/toast';
import { useCachedQuery, setQueryData } from '../../utils/useCachedQuery';

const fetchHotels = () => consoleApi.get('/hotels').then((res) => res.data.hotels);

const FILTERS = [
    { key: 'all', label: 'All', match: () => true },
    { key: 'active', label: 'Active', match: (hotel) => ['active', 'expiring', 'grace'].includes(hotel.subscription.state) },
    { key: 'expiring', label: 'Renewing soon', match: (hotel) => ['expiring', 'grace'].includes(hotel.subscription.state) },
    { key: 'expired', label: 'Expired', match: (hotel) => hotel.subscription.state === 'expired' },
    { key: 'disabled', label: 'Disabled', match: (hotel) => hotel.subscription.state === 'disabled' },
    { key: 'trial', label: 'Free trial', match: (hotel) => hotel.subscription.plan === 'trial' },
];

const HOTEL_COLUMNS = [
    {
        label: 'Hotel',
        render: (hotel) => (
            <>
                <p className="font-semibold text-stone-900">
                    {hotel.name}
                    {hotel.isDemo && <span className="ml-2 rounded-full bg-sky-50 px-2 py-0.5 align-middle text-[11px] font-semibold text-sky-800 ring-1 ring-sky-200">Demo</span>}
                </p>
                <p className="text-xs text-stone-500">{hotel.city || `/${hotel.slug}`}</p>
            </>
        ),
    },
    { label: 'Status', card: 'aside', render: (hotel) => <StatusBadge state={hotel.subscription.state} /> },
    {
        label: 'Plan',
        className: 'whitespace-nowrap',
        render: (hotel) => (
            <>
                <p className="font-medium">{PLAN_LABELS[hotel.subscription.plan]}</p>
                <p className="text-xs text-stone-500">{hotel.subscription.monthlyFee ? `${formatINR(hotel.subscription.monthlyFee)}/mo` : '—'}</p>
            </>
        ),
    },
    {
        label: 'Paid until',
        className: 'whitespace-nowrap',
        render: (hotel) => (
            <>
                <p>{formatDate(hotel.subscription.paidUntil)}</p>
                <p className={`text-xs ${hotel.subscription.daysLeft < 0 ? 'text-rose-700' : 'text-stone-500'}`}>{daysLeftLabel(hotel.subscription.daysLeft)}</p>
            </>
        ),
    },
    {
        label: 'Today',
        className: 'whitespace-nowrap tabular-nums',
        render: (hotel) => (
            <>
                <p className="font-semibold">{formatINR(hotel.stats.salesToday)}</p>
                <p className="text-xs text-stone-500">{hotel.stats.ordersToday} orders</p>
            </>
        ),
    },
    {
        label: 'Last 30 days',
        className: 'whitespace-nowrap tabular-nums',
        render: (hotel) => (
            <>
                <p className="font-semibold">{compactINR(hotel.stats.sales30)}</p>
                <p className="text-xs text-stone-500">{hotel.stats.orders30.toLocaleString('en-IN')} orders</p>
            </>
        ),
    },
    { label: 'Last order', className: 'whitespace-nowrap text-stone-600', render: (hotel) => timeAgo(hotel.stats.lastOrderAt) },
];

const slugify = (text) => text.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);

const AddHotelModal = ({ onClose, onCreated }) => {
    const [form, setForm] = useState({
        name: '', slug: '', ownerName: '', ownerEmail: '', ownerPassword: '',
        plan: 'trial', monthlyFee: '1499', trialDays: '14', address: '', phone: '', upiVpa: '',
    });
    const [slugTouched, setSlugTouched] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const set = (field) => (event) => {
        const value = event.target.value;
        setForm((current) => ({
            ...current,
            [field]: value,
            ...(field === 'name' && !slugTouched && { slug: slugify(value) }),
        }));
    };

    const submit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        try {
            const res = await consoleApi.post('/hotels', {
                name: form.name,
                slug: form.slug,
                plan: form.plan,
                monthlyFee: Number(form.monthlyFee || 0),
                trialDays: Number(form.trialDays || 0),
                owner: { name: form.ownerName, email: form.ownerEmail, password: form.ownerPassword },
                settings: { address: form.address, phone: form.phone, upiVpa: form.upiVpa },
            });
            showToast.success(`${res.data.hotel.name} added - the owner can sign in now`);
            onCreated(res.data.hotel);
        } catch (err) {
            setError(apiError(err, 'Could not add the hotel'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal title="Add a hotel" onClose={onClose} wide>
            <form onSubmit={submit} className="space-y-5">
                <fieldset className="grid gap-4 sm:grid-cols-2">
                    <legend className="mb-3 text-xs font-bold uppercase tracking-wide text-stone-400">Restaurant</legend>
                    <Field label="Hotel name"><input className={inputClass} value={form.name} onChange={set('name')} required autoFocus /></Field>
                    <Field label="Web address" hint={form.slug ? `Token TV: /tv/${form.slug}` : 'Used for the token TV link'}>
                        <input className={inputClass} value={form.slug} onChange={(event) => { setSlugTouched(true); set('slug')(event); }} required />
                    </Field>
                    <Field label="Address"><input className={inputClass} value={form.address} onChange={set('address')} /></Field>
                    <Field label="Phone"><input className={inputClass} value={form.phone} onChange={set('phone')} inputMode="tel" /></Field>
                    <Field label="UPI ID" hint="Payments go straight to this account" className="sm:col-span-2">
                        <input className={inputClass} value={form.upiVpa} onChange={set('upiVpa')} placeholder="hotelname@okaxis" />
                    </Field>
                </fieldset>

                <fieldset className="grid gap-4 sm:grid-cols-3">
                    <legend className="mb-3 text-xs font-bold uppercase tracking-wide text-stone-400">Owner login</legend>
                    <Field label="Owner name"><input className={inputClass} value={form.ownerName} onChange={set('ownerName')} required /></Field>
                    <Field label="Email / login ID"><input className={inputClass} type="email" value={form.ownerEmail} onChange={set('ownerEmail')} required /></Field>
                    <Field label="Password" hint="8+ chars, upper, lower, number"><input className={inputClass} type="text" value={form.ownerPassword} onChange={set('ownerPassword')} required autoComplete="new-password" /></Field>
                </fieldset>

                <fieldset className="grid gap-4 sm:grid-cols-3">
                    <legend className="mb-3 text-xs font-bold uppercase tracking-wide text-stone-400">Subscription</legend>
                    <Field label="Plan">
                        <select className={inputClass} value={form.plan} onChange={set('plan')}>
                            {Object.entries(PLAN_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                    </Field>
                    <Field label="Monthly fee (₹)"><input className={inputClass} type="number" min="0" value={form.monthlyFee} onChange={set('monthlyFee')} /></Field>
                    <Field label="Free days to start" hint="Billing works until then"><input className={inputClass} type="number" min="0" max="90" value={form.trialDays} onChange={set('trialDays')} /></Field>
                </fieldset>

                <ErrorNote message={error} />
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit" disabled={saving}>{saving ? 'Adding…' : 'Add hotel'}</Button>
                </div>
            </form>
        </Modal>
    );
};

AddHotelModal.propTypes = {
    onClose: PropTypes.func.isRequired,
    onCreated: PropTypes.func.isRequired,
};

export default function Hotels() {
    const navigate = useNavigate();
    const { data: hotels, error, refresh } = useCachedQuery('console:hotels', fetchHotels, { refreshInterval: 60000 });
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState('all');
    const [adding, setAdding] = useState(false);

    const visible = useMemo(() => {
        const text = query.trim().toLowerCase();
        const match = FILTERS.find((entry) => entry.key === filter).match;
        return (hotels || []).filter((hotel) => match(hotel) && (!text || `${hotel.name} ${hotel.slug} ${hotel.city}`.toLowerCase().includes(text)));
    }, [hotels, query, filter]);

    return (
        <>
            <PageHeader
                title="Hotels"
                subtitle={hotels ? `${hotels.length} hotel${hotels.length === 1 ? '' : 's'} on the platform` : 'Every restaurant on the platform'}
                actions={<Button onClick={() => setAdding(true)}><FiPlus /> Add hotel</Button>}
            />

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <label className="relative min-w-[220px] flex-1 sm:max-w-xs">
                    <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input className={`${inputClass} pl-10`} placeholder="Search hotels" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search hotels" />
                </label>
                <div className="flex flex-wrap gap-1.5">
                    {FILTERS.map((entry) => (
                        <button
                            key={entry.key}
                            onClick={() => setFilter(entry.key)}
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${filter === entry.key ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50'}`}
                        >
                            {entry.label}
                            {hotels && <span className="ml-1.5 opacity-60">{hotels.filter(entry.match).length}</span>}
                        </button>
                    ))}
                </div>
            </div>

            {!hotels ? (
                error ? <EmptyState>Could not load hotels. <button className="font-semibold underline" onClick={refresh}>Try again</button></EmptyState> : <Skeleton className="h-72" />
            ) : visible.length === 0 ? (
                <EmptyState>{hotels.length === 0 ? 'No hotels yet - add your first one.' : 'No hotels match.'}</EmptyState>
            ) : (
                <DataTable
                    columns={HOTEL_COLUMNS}
                    rows={visible}
                    rowKey={(hotel) => hotel._id}
                    onRowClick={(hotel) => navigate(`/console/hotels/${hotel._id}`)}
                />
            )}

            {adding && (
                <AddHotelModal
                    onClose={() => setAdding(false)}
                    onCreated={(hotel) => {
                        setAdding(false);
                        setQueryData('console:hotels', (current) => [hotel, ...(current || [])]);
                        refresh();
                        navigate(`/console/hotels/${hotel._id}`);
                    }}
                />
            )}
        </>
    );
}
