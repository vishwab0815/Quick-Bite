import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { FiRefreshCw } from 'react-icons/fi';
import { Card } from '../../components/pos/DashboardCharts';
import Skeleton from '../../components/pos/Skeleton';
import { Button, CopyText, ErrorNote, Field, inputClass } from '../../components/console/ui';
import { consoleApi, apiError } from '../../utils/console';
import { showToast } from '../../utils/toast';

const API = import.meta.env.VITE_API_URL;
const EVENTS = ['payment.captured', 'payment.failed', 'order.paid'];

/** A random webhook secret, typed into Razorpay and saved here */
const newWebhookSecret = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    return btoa(String.fromCharCode(...bytes)).replace(/[^A-Za-z0-9]/g, '').slice(0, 28);
};

const STATUS = {
    razorpay: ['bg-emerald-50 text-emerald-700 ring-emerald-200', 'Taking online orders - paid through Razorpay'],
    simulated: ['bg-amber-50 text-amber-800 ring-amber-200', 'Simulated UPI payments - customers scan a QR / open a payment link and tap Pay; no money moves'],
    off: ['bg-stone-100 text-stone-600 ring-stone-200', 'Online ordering is off'],
};

/**
 * The hotel's own Razorpay account: customers' money goes straight to the restaurant.
 * Keys are checked with Razorpay before saving; secrets are stored encrypted and never shown again.
 */
export default function HotelOnlinePayments({ hotel }) {
    const [online, setOnline] = useState(null);
    const [form, setForm] = useState({ keyId: '', keySecret: '', webhookSecret: '' });
    const [generated, setGenerated] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const path = `/hotels/${hotel._id}/online-payments`;
    const webhookUrl = `${API}/pos/payments/razorpay/webhook/${hotel.slug}`;

    useEffect(() => {
        consoleApi.get(path)
            .then((res) => {
                setOnline(res.data.online);
                setForm((current) => ({ ...current, keyId: res.data.online.keyId }));
            })
            .catch((err) => setError(apiError(err, 'Could not load online payments')));
    }, [path]);

    const send = async (body, message, method = 'put') => {
        setSaving(true);
        setError('');
        try {
            const res = await consoleApi[method](path, body);
            setOnline(res.data.online);
            setForm({ keyId: res.data.online.keyId, keySecret: '', webhookSecret: '' });
            setGenerated(false);
            showToast.success(message);
        } catch (err) {
            setError(apiError(err, 'Could not save'));
        } finally {
            setSaving(false);
        }
    };

    const saveKeys = (event) => {
        event.preventDefault();
        const body = {};
        if (form.keyId.trim() !== online.keyId || form.keySecret) Object.assign(body, { keyId: form.keyId.trim(), keySecret: form.keySecret.trim() });
        if (form.webhookSecret) body.webhookSecret = form.webhookSecret.trim();
        if (!Object.keys(body).length) return setError('Nothing to save - enter new keys or a webhook secret');
        return send(body, 'Saved - Razorpay accepted the keys');
    };

    if (!online) return error ? <ErrorNote message={error} /> : <Skeleton className="h-72" />;

    const [statusClass, statusText] = STATUS[online.ordering || 'off'];
    const connected = Boolean(online.keyId);

    return (
        <div className="space-y-4">
            <p className={`rounded-xl px-4 py-3 text-sm font-medium ring-1 ${statusClass}`}>{statusText}</p>

            <form onSubmit={saveKeys}>
                <Card
                    title="Razorpay account"
                    subtitle="The restaurant's own account - customers pay straight into it. From Razorpay Dashboard → Account & Settings → API keys."
                >
                    {connected && (
                        <p className="mb-4 flex flex-wrap items-center gap-2 text-sm text-stone-600">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${online.mode === 'live' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'}`}>
                                {online.mode === 'live' ? 'Live' : 'Test mode'}
                            </span>
                            Connected{online.connectedAt ? ` on ${new Date(online.connectedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                            {!online.keySecretReadable && <span className="font-semibold text-rose-600">· the saved secret can no longer be read - enter it again</span>}
                        </p>
                    )}
                    {connected && online.upiEnabled === false && (
                        <p className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
                            <b>UPI is switched off on this Razorpay account.</b> Customers can&apos;t pay by UPI app or QR until it is on - for now
                            checkout shows the account&apos;s other methods. In Razorpay: Account &amp; Settings → Payment methods → UPI, or ask Razorpay support to enable UPI.
                        </p>
                    )}
                    {connected && online.upiEnabled === true && (
                        <p className="mb-4 text-sm font-medium text-emerald-700">UPI is on - customers pay with their UPI app or by scanning a QR.</p>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Key ID">
                            <input className={`${inputClass} font-mono`} value={form.keyId} onChange={(event) => setForm({ ...form, keyId: event.target.value })} placeholder="rzp_test_... or rzp_live_..." autoComplete="off" spellCheck="false" />
                        </Field>
                        <Field label="Key Secret" hint={online.keySecretSaved ? 'Saved (hidden). Leave empty to keep it.' : 'Shown once by Razorpay when the key is made'}>
                            <input className={`${inputClass} font-mono`} type="password" value={form.keySecret} onChange={(event) => setForm({ ...form, keySecret: event.target.value })} placeholder={online.keySecretSaved ? '••••••••••••' : ''} autoComplete="new-password" spellCheck="false" />
                        </Field>
                    </div>
                </Card>

                <Card title="Webhook" subtitle="Confirms payments even if the customer closes the page. Add it in Razorpay → Account & Settings → Webhooks." className="mt-4">
                    <div className="space-y-4">
                        <Field label="Webhook URL"><CopyText value={webhookUrl} /></Field>
                        <div>
                            <span className="mb-1.5 block text-xs font-semibold text-stone-600">Active events</span>
                            <p className="flex flex-wrap gap-2">
                                {EVENTS.map((name) => <code key={name} className="rounded-md bg-stone-100 px-2 py-1 font-mono text-xs">{name}</code>)}
                            </p>
                        </div>
                        <Field label="Webhook secret" hint={online.webhookSecretSaved ? 'Saved (hidden). Enter a new one only if you change it in Razorpay too.' : 'Type the same secret into Razorpay.'}>
                            <span className="flex gap-2">
                                <input
                                    className={`${inputClass} font-mono`}
                                    type={generated ? 'text' : 'password'}
                                    value={form.webhookSecret}
                                    onChange={(event) => { setGenerated(false); setForm({ ...form, webhookSecret: event.target.value }); }}
                                    placeholder={online.webhookSecretSaved ? '••••••••••••' : ''}
                                    autoComplete="new-password"
                                    spellCheck="false"
                                />
                                <Button variant="secondary" onClick={() => { setGenerated(true); setForm({ ...form, webhookSecret: newWebhookSecret() }); }}>
                                    <FiRefreshCw /> Generate
                                </Button>
                            </span>
                        </Field>
                        {generated && <p className="text-xs font-medium text-amber-700">Copy this secret into Razorpay now - after saving it is hidden.</p>}
                    </div>
                </Card>

                <ErrorNote message={error} />
                <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="submit" disabled={saving}>{saving ? 'Checking with Razorpay…' : 'Save'}</Button>
                    {connected && (
                        <Button variant="secondary" disabled={saving} onClick={() => send({ enabled: !online.enabled }, online.enabled ? 'Online payments paused' : 'Online payments on')}>
                            {online.enabled ? 'Pause online payments' : 'Turn online payments on'}
                        </Button>
                    )}
                    {connected && (
                        <Button
                            variant="danger"
                            disabled={saving}
                            onClick={() => window.confirm(`Remove ${hotel.name}'s Razorpay keys? Online payments stop at once.`) && send(undefined, 'Razorpay disconnected', 'delete')}
                        >
                            Disconnect
                        </Button>
                    )}
                </div>
            </form>

            <Card title="Simulated UPI payments (test)" subtitle="For showing the whole flow before real payments go live: each order gets its own UPI QR / payment link, and tapping Pay completes it - no money moves. While on, it is used instead of Razorpay.">
                <label className="flex items-center gap-2.5 text-sm font-medium text-stone-700">
                    <input type="checkbox" className="h-4 w-4 accent-stone-900" checked={online.demo} disabled={saving} onChange={(event) => send({ demo: event.target.checked }, event.target.checked ? 'Simulated payments on' : 'Simulated payments off - Razorpay is used')} />
                    Use simulated UPI payments
                </label>
            </Card>
        </div>
    );
}

HotelOnlinePayments.propTypes = { hotel: PropTypes.object.isRequired };
