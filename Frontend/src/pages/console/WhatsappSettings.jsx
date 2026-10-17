import { useEffect, useState } from 'react';
import { FiRefreshCw, FiSend } from 'react-icons/fi';
import { Card } from '../../components/pos/DashboardCharts';
import Skeleton from '../../components/pos/Skeleton';
import { Button, CopyText, ErrorNote, Field, PageHeader, inputClass } from '../../components/console/ui';
import { consoleApi, apiError, formatDateTime } from '../../utils/console';
import { showToast } from '../../utils/toast';

const API = import.meta.env.VITE_API_URL;

// The two messages, exactly as they are created in Meta WhatsApp Manager (category Utility)
const TEMPLATES = [
    {
        field: 'receiptTemplate',
        label: 'Order confirmation',
        when: 'Sent the moment an order is paid',
        text: '🙏 Namaskara {{1}}!\n\nYour order at *{{2}}* is confirmed.\n\n🎟️ Token: *{{3}}*\n🍽️ {{4}}\n💰 {{5}}\n\nTrack your order live: {{6}}\n\nShow your token at the counter to collect.',
        sample: ['Meena', 'Udupi Sri Krishna Naivedya', '#12', '2 x Masala Dose, 1 x Filter Coffee', 'Paid ₹190.00 by UPI', 'https://…/order/x7Kq…'],
    },
    {
        field: 'readyTemplate',
        label: 'Order ready',
        when: 'Sent when the kitchen marks the whole order ready',
        text: '🔔 {{1}}, your order at *{{2}}* is ready!\n\nToken *{{3}}* - please collect it from {{4}}.\n\nEnjoy your meal 🙏',
        sample: ['Meena', 'Udupi Sri Krishna Naivedya', '#12', 'Dosa Counter'],
    },
];

const randomToken = () => Array.from(crypto.getRandomValues(new Uint8Array(18)), (byte) => byte.toString(16).padStart(2, '0')).join('');

/** What the customer sees: the template with the sample values filled in */
const preview = ({ text, sample }) => text.replace(/\{\{(\d)\}\}/g, (_, index) => sample[index - 1]);

const EMPTY = { phoneNumberId: '', accessToken: '', appSecret: '', verifyToken: '', receiptTemplate: 'order_receipt', readyTemplate: 'order_ready', language: 'en' };

/**
 * The platform's WhatsApp Business number, which messages every restaurant's customers
 * (the restaurant's name is in each message). Checked with Meta before saving; the access
 * token and app secret are stored encrypted and never shown again.
 */
export default function WhatsappSettings() {
    const [saved, setSaved] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [testPhone, setTestPhone] = useState('');
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');

    const apply = (whatsapp) => {
        setSaved(whatsapp);
        setForm({ ...EMPTY, ...whatsapp, accessToken: '', appSecret: '' });
    };

    useEffect(() => {
        consoleApi.get('/whatsapp').then((res) => apply(res.data.whatsapp)).catch((err) => setError(apiError(err, 'Could not load WhatsApp settings')));
    }, []);

    const set = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

    const save = async (body, message) => {
        setBusy('save');
        setError('');
        try {
            const res = await consoleApi.put('/whatsapp', body);
            apply(res.data.whatsapp);
            showToast.success(message);
        } catch (err) {
            setError(apiError(err, 'Could not save'));
        } finally {
            setBusy('');
        }
    };

    const submit = (event) => {
        event.preventDefault();
        const body = {
            phoneNumberId: form.phoneNumberId,
            verifyToken: form.verifyToken,
            receiptTemplate: form.receiptTemplate,
            readyTemplate: form.readyTemplate,
            language: form.language,
            ...(form.accessToken && { accessToken: form.accessToken }),
            ...(form.appSecret && { appSecret: form.appSecret }),
        };
        save(body, 'Saved - Meta accepted the number and token');
    };

    const sendTest = async (kind) => {
        setBusy(kind);
        setError('');
        try {
            await consoleApi.post('/whatsapp/test', { phone: testPhone, kind });
            showToast.success('Sent - check WhatsApp on that phone');
        } catch (err) {
            setError(apiError(err, 'Could not send'));
        } finally {
            setBusy('');
        }
    };

    if (!saved) {
        return (
            <>
                <PageHeader title="WhatsApp" />
                {error ? <ErrorNote message={error} /> : <Skeleton className="h-96" />}
            </>
        );
    }

    const connected = saved.mode === 'cloud';

    return (
        <>
            <PageHeader title="WhatsApp" subtitle="One WhatsApp Business number messages customers for every restaurant - each message carries the restaurant's name." />

            <p className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium ring-1 ${connected ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-stone-100 text-stone-600 ring-stone-200'}`}>
                {connected
                    ? `Sending automatically${saved.displayNumber ? ` from ${saved.displayNumber}` : ''}${saved.verifiedName ? ` (${saved.verifiedName})` : ''}${saved.source === 'environment' ? ' - using the server environment settings' : ''}.`
                    : 'Not connected - customers get no automatic messages; the counter can still send a WhatsApp link by hand.'}
                {saved.checkedAt && <span className="block text-xs opacity-70">Checked with Meta {formatDateTime(saved.checkedAt)}</span>}
            </p>

            <form onSubmit={submit} className="space-y-4">
                <Card title="Connection" subtitle="From Meta for Developers → your app → WhatsApp → API Setup. Use a permanent (System User) token for real use; the temporary one lasts 24 hours.">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Phone number ID" hint="The long number under your WhatsApp number - not the phone number itself">
                            <input className={`${inputClass} font-mono`} value={form.phoneNumberId} onChange={set('phoneNumberId')} inputMode="numeric" autoComplete="off" spellCheck="false" />
                        </Field>
                        <Field label="Access token" hint={saved.accessTokenSaved ? 'Saved (hidden). Leave empty to keep it.' : ''}>
                            <input className={`${inputClass} font-mono`} type="password" value={form.accessToken} onChange={set('accessToken')} placeholder={saved.accessTokenSaved ? '••••••••••••' : 'EAAG…'} autoComplete="new-password" spellCheck="false" />
                        </Field>
                        <Field label="Template language" hint="The language the templates were created in - en or en_US">
                            <input className={`${inputClass} font-mono`} value={form.language} onChange={set('language')} spellCheck="false" />
                        </Field>
                    </div>
                </Card>

                <Card title="Message templates" subtitle="Create these two in Meta → WhatsApp Manager → Message templates: category Utility, the same language. Meta usually approves them within minutes.">
                    <div className="grid gap-5 lg:grid-cols-2">
                        {TEMPLATES.map((template) => (
                            <div key={template.field} className="space-y-3">
                                <Field label={`${template.label} - template name`} hint={template.when}>
                                    <input className={`${inputClass} font-mono`} value={form[template.field]} onChange={set(template.field)} spellCheck="false" />
                                </Field>
                                <div>
                                    <span className="mb-1.5 block text-xs font-semibold text-stone-600">Body to paste in Meta</span>
                                    <CopyText value={template.text} multiline />
                                </div>
                                <div>
                                    <span className="mb-1.5 block text-xs font-semibold text-stone-600">What the customer sees</span>
                                    <p className="whitespace-pre-line rounded-2xl rounded-tl-sm bg-[#dcf8c6] px-4 py-3 text-sm leading-relaxed text-stone-800 shadow-sm">
                                        {preview(template).replace(/\*/g, '')}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card title="Delivery receipts (optional)" subtitle="Shows on each bill whether the message was delivered and read. In Meta → your app → WhatsApp → Configuration → Webhook.">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Callback URL"><CopyText value={`${API}/pos/whatsapp/webhook`} /></Field>
                        <Field label="Verify token" hint="Type the same into Meta">
                            <span className="flex gap-2">
                                <input className={`${inputClass} font-mono`} value={form.verifyToken} onChange={set('verifyToken')} spellCheck="false" />
                                <Button variant="secondary" onClick={() => setForm((current) => ({ ...current, verifyToken: randomToken() }))}><FiRefreshCw /> Generate</Button>
                            </span>
                        </Field>
                        <Field label="App secret" hint={saved.appSecretSaved ? 'Saved (hidden). Meta → App settings → Basic.' : 'Meta → App settings → Basic'}>
                            <input className={`${inputClass} font-mono`} type="password" value={form.appSecret} onChange={set('appSecret')} placeholder={saved.appSecretSaved ? '••••••••••••' : ''} autoComplete="new-password" spellCheck="false" />
                        </Field>
                        <div>
                            <span className="mb-1.5 block text-xs font-semibold text-stone-600">Webhook field to subscribe</span>
                            <code className="inline-block rounded-md bg-stone-100 px-2 py-1 font-mono text-xs">messages</code>
                        </div>
                    </div>
                </Card>

                <ErrorNote message={error} />
                <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={Boolean(busy)}>{busy === 'save' ? 'Checking with Meta…' : saved.enabled ? 'Save' : 'Save and turn on'}</Button>
                    {saved.enabled && (
                        <Button variant="secondary" disabled={Boolean(busy)} onClick={() => save({ enabled: false }, 'WhatsApp messages turned off')}>Turn off</Button>
                    )}
                </div>
            </form>

            <Card title="Send a test" subtitle="With Meta's free test number, add your phone under API Setup → To first (up to 5 numbers)." className="mt-4">
                <div className="flex flex-wrap items-end gap-3">
                    <Field label="Mobile number" className="w-full sm:w-56">
                        <input className={inputClass} value={testPhone} onChange={(event) => setTestPhone(event.target.value)} inputMode="numeric" placeholder="98765 43210" />
                    </Field>
                    <Button variant="secondary" disabled={!connected || Boolean(busy)} onClick={() => sendTest('hello')}><FiSend /> {busy === 'hello' ? 'Sending…' : 'Send “hello world”'}</Button>
                    <Button variant="secondary" disabled={!connected || Boolean(busy)} onClick={() => sendTest('receipt')}><FiSend /> {busy === 'receipt' ? 'Sending…' : 'Send a sample order message'}</Button>
                </div>
            </Card>
        </>
    );
}
