import { useState } from 'react';
import PropTypes from 'prop-types';
import { Card } from '../../components/pos/DashboardCharts';
import { Button, ErrorNote, Field, inputClass } from '../../components/console/ui';
import { consoleApi, apiError } from '../../utils/console';
import { showToast } from '../../utils/toast';

const TEXT_FIELDS = [
    ['address', 'Address', 'Printed on every bill'],
    ['phone', 'Phone', ''],
    ['hours', 'Opening hours', 'e.g. 6:30 AM – 10:30 PM'],
    ['upiVpa', 'UPI ID', 'Customers pay straight into this account'],
    ['upiPayeeName', 'UPI payee name', ''],
    ['gstin', 'GSTIN', 'Leave empty if not registered'],
    ['billPrefix', 'Bill number prefix', 'Bills look like QB/2026-27/000123'],
    ['receiptFooter', 'Receipt footer', ''],
];

/**
 * Edit the hotel's details and billing settings (what prints on bills, GST, UPI)
 */
export default function HotelSettings({ hotel, onChanged }) {
    const [form, setForm] = useState({ name: hotel.name, slug: hotel.slug, ...hotel.settings });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const set = (field, transform = (value) => value) => (event) => {
        const value = event.target.type === 'checkbox' ? event.target.checked : transform(event.target.value);
        setForm((current) => ({ ...current, [field]: value }));
    };

    const save = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        try {
            const settings = Object.fromEntries(
                [...TEXT_FIELDS.map(([field]) => field), 'gstScheme', 'gstRate', 'pricesIncludeGst', 'printCounterCoupons', 'receiptPaperWidth']
                    .map((field) => [field, form[field]])
            );
            await consoleApi.patch(`/hotels/${hotel._id}`, { name: form.name, slug: form.slug, settings });
            showToast.success('Saved - the counter picks it up within a minute');
            onChanged();
        } catch (err) {
            setError(apiError(err, 'Could not save'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={save} className="space-y-4">
            <Card title="Restaurant">
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Hotel name"><input className={inputClass} value={form.name} onChange={set('name')} required /></Field>
                    <Field label="Web address" hint={`Token TV: /tv/${form.slug}`}>
                        <input className={inputClass} value={form.slug} onChange={set('slug', (value) => value.toLowerCase())} required />
                    </Field>
                    {TEXT_FIELDS.map(([field, label, hint]) => (
                        <Field key={field} label={label} hint={hint || undefined}>
                            <input className={inputClass} value={form[field] || ''} onChange={set(field)} />
                        </Field>
                    ))}
                </div>
            </Card>

            <Card title="GST & printing">
                <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="GST scheme">
                        <select className={inputClass} value={form.gstScheme} onChange={set('gstScheme')}>
                            <option value="regular">Regular (CGST + SGST on the bill)</option>
                            <option value="composition">Composition (Bill of Supply)</option>
                        </select>
                    </Field>
                    <Field label="GST rate (%)">
                        <input className={inputClass} type="number" min="0" max="28" step="0.5" value={form.gstRate} onChange={set('gstRate', Number)} />
                    </Field>
                    <Field label="Receipt paper">
                        <select className={inputClass} value={form.receiptPaperWidth} onChange={set('receiptPaperWidth', Number)}>
                            <option value={80}>80 mm</option>
                            <option value={58}>58 mm</option>
                        </select>
                    </Field>
                    <label className="flex items-center gap-2.5 text-sm font-medium text-stone-700 sm:col-span-3">
                        <input type="checkbox" className="h-4 w-4 accent-stone-900" checked={form.pricesIncludeGst !== false} onChange={set('pricesIncludeGst')} />
                        Menu prices already include GST (nothing is added on top)
                    </label>
                    <label className="flex items-center gap-2.5 text-sm font-medium text-stone-700 sm:col-span-3">
                        <input type="checkbox" className="h-4 w-4 accent-stone-900" checked={form.printCounterCoupons !== false} onChange={set('printCounterCoupons')} />
                        Print a token slip for each food counter with every bill
                    </label>
                </div>
            </Card>

            <ErrorNote message={error} />
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
        </form>
    );
}

HotelSettings.propTypes = {
    hotel: PropTypes.object.isRequired,
    onChanged: PropTypes.func.isRequired,
};
