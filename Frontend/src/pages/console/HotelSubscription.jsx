import { useState } from 'react';
import PropTypes from 'prop-types';
import { FiCheck } from 'react-icons/fi';
import { Card } from '../../components/pos/DashboardCharts';
import { Button, EmptyState, ErrorNote, Field, Table, inputClass } from '../../components/console/ui';
import { consoleApi, apiError, daysLeftLabel, formatDate, PLAN_LABELS } from '../../utils/console';
import { formatINR } from '../../utils/pos';
import { showToast } from '../../utils/toast';

const METHODS = { upi: 'UPI', bank: 'Bank transfer', cash: 'Cash', card: 'Card', other: 'Other' };

const toDateInput = (date) => new Date(date).toISOString().slice(0, 10);

/**
 * Record payments (extends the paid period) and change the plan
 */
export default function HotelSubscription({ hotel, onChanged }) {
    const subscription = hotel.subscription;
    const suggested = subscription.monthlyFee || 1499;
    const [payment, setPayment] = useState({ months: '1', amount: String(suggested), method: 'upi', reference: '', note: '' });
    const [plan, setPlan] = useState({
        plan: subscription.plan,
        monthlyFee: String(subscription.monthlyFee || 0),
        graceDays: String(subscription.graceDays ?? 3),
        paidUntil: toDateInput(subscription.paidUntil),
    });
    const [saving, setSaving] = useState('');
    const [error, setError] = useState('');

    const setPay = (field) => (event) => {
        const value = event.target.value;
        setPayment((current) => ({
            ...current,
            [field]: value,
            // Keep the amount in step with the months unless it was typed by hand
            ...(field === 'months' && current.amount === String(suggested * Number(current.months)) && { amount: String(suggested * Number(value || 0)) }),
        }));
    };

    const recordPayment = async (event) => {
        event.preventDefault();
        setSaving('payment');
        setError('');
        try {
            const res = await consoleApi.post(`/hotels/${hotel._id}/payments`, {
                ...payment,
                amount: Number(payment.amount),
                months: Number(payment.months),
            });
            showToast.success(`Payment recorded - paid until ${formatDate(res.data.hotel.subscription.paidUntil)}`);
            setPayment((current) => ({ ...current, reference: '', note: '' }));
            onChanged();
        } catch (err) {
            setError(apiError(err, 'Could not record the payment'));
        } finally {
            setSaving('');
        }
    };

    const savePlan = async (event) => {
        event.preventDefault();
        setSaving('plan');
        setError('');
        try {
            await consoleApi.patch(`/hotels/${hotel._id}`, {
                subscription: {
                    plan: plan.plan,
                    monthlyFee: Number(plan.monthlyFee || 0),
                    graceDays: Number(plan.graceDays || 0),
                    // End of the chosen day
                    ...(plan.paidUntil !== toDateInput(subscription.paidUntil) && { paidUntil: `${plan.paidUntil}T23:59:59` }),
                },
            });
            showToast.success('Plan updated');
            onChanged();
        } catch (err) {
            setError(apiError(err, 'Could not update the plan'));
        } finally {
            setSaving('');
        }
    };

    return (
        <div className="space-y-4">
            <ErrorNote message={error} />
            <div className="grid gap-4 lg:grid-cols-2">
                <Card title="Record a payment" subtitle={`Extends from ${subscription.daysLeft >= 0 ? formatDate(subscription.paidUntil) : 'today'} by the months paid`}>
                    <form onSubmit={recordPayment} className="grid gap-4 sm:grid-cols-2">
                        <Field label="Months paid">
                            <select className={inputClass} value={payment.months} onChange={setPay('months')}>
                                {[1, 2, 3, 6, 12, 24].map((months) => <option key={months} value={months}>{months} month{months === 1 ? '' : 's'}</option>)}
                            </select>
                        </Field>
                        <Field label="Amount received (₹)">
                            <input className={inputClass} type="number" min="1" value={payment.amount} onChange={setPay('amount')} required />
                        </Field>
                        <Field label="Paid by">
                            <select className={inputClass} value={payment.method} onChange={setPay('method')}>
                                {Object.entries(METHODS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                        </Field>
                        <Field label="Reference" hint="UPI / bank transaction ID">
                            <input className={inputClass} value={payment.reference} onChange={setPay('reference')} />
                        </Field>
                        <Field label="Note" className="sm:col-span-2">
                            <input className={inputClass} value={payment.note} onChange={setPay('note')} />
                        </Field>
                        <div className="sm:col-span-2">
                            <Button type="submit" disabled={saving === 'payment' || !Number(payment.amount)}>
                                <FiCheck /> {saving === 'payment' ? 'Saving…' : `Record ${formatINR(Number(payment.amount) || 0)}`}
                            </Button>
                        </div>
                    </form>
                </Card>

                <Card title="Plan" subtitle={`Currently ${PLAN_LABELS[subscription.plan].toLowerCase()} · ${daysLeftLabel(subscription.daysLeft)}`}>
                    <form onSubmit={savePlan} className="grid gap-4 sm:grid-cols-2">
                        <Field label="Plan">
                            <select className={inputClass} value={plan.plan} onChange={(event) => setPlan({ ...plan, plan: event.target.value })}>
                                {Object.entries(PLAN_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                        </Field>
                        <Field label="Monthly fee (₹)">
                            <input className={inputClass} type="number" min="0" value={plan.monthlyFee} onChange={(event) => setPlan({ ...plan, monthlyFee: event.target.value })} />
                        </Field>
                        <Field label="Paid until" hint="Change only to correct a mistake">
                            <input className={inputClass} type="date" value={plan.paidUntil} onChange={(event) => setPlan({ ...plan, paidUntil: event.target.value })} required />
                        </Field>
                        <Field label="Grace days" hint="Billing keeps working this long after it ends">
                            <input className={inputClass} type="number" min="0" max="30" value={plan.graceDays} onChange={(event) => setPlan({ ...plan, graceDays: event.target.value })} />
                        </Field>
                        <div className="sm:col-span-2">
                            <Button type="submit" variant="secondary" disabled={saving === 'plan'}>{saving === 'plan' ? 'Saving…' : 'Save plan'}</Button>
                        </div>
                    </form>
                </Card>
            </div>

            <Card title="Payment history">
                {hotel.payments.length === 0 ? <EmptyState>No payments recorded yet.</EmptyState> : (
                    <Table head={['Paid on', 'Amount', 'Months', 'Paid by', 'Reference', 'Covers until']}>
                        {hotel.payments.map((entry) => (
                            <tr key={entry._id}>
                                <td className="whitespace-nowrap px-4 py-3">{formatDate(entry.paidOn)}</td>
                                <td className="px-4 py-3 font-semibold tabular-nums">{formatINR(entry.amount)}</td>
                                <td className="px-4 py-3">{entry.months}</td>
                                <td className="px-4 py-3">{METHODS[entry.method] || entry.method}</td>
                                <td className="px-4 py-3 text-stone-600">{entry.reference || entry.note || '—'}</td>
                                <td className="whitespace-nowrap px-4 py-3">{formatDate(entry.periodEnd)}</td>
                            </tr>
                        ))}
                    </Table>
                )}
            </Card>
        </div>
    );
}

HotelSubscription.propTypes = {
    hotel: PropTypes.object.isRequired,
    onChanged: PropTypes.func.isRequired,
};
