import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
    PiArrowLeftBold, PiBankDuotone, PiCaretDownBold, PiCheckBold, PiCheckCircleFill, PiCopyBold, PiFlaskDuotone,
    PiLockSimpleFill, PiSealCheckFill, PiWarningCircleDuotone,
} from 'react-icons/pi';
import { posApi } from '../../utils/pos';
import { PaidTick } from '../../components/order/PaymentBits';
import { appName, initials, rupees, timeLeft } from '../../utils/payment';

const CART_KEY = 'naivedya-cart';
const PROCESSING_MS = 1600;

const when = (date) => new Date(date).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

/**
 * A UPI payment request, opened by scanning the order's QR code or from the customer's UPI app
 * choice. Simulated: the Pay button completes the payment without moving money (no PIN is asked
 * for). Each order has its own link; once paid it shows the receipt, once expired it says so.
 */
export default function PayPage() {
    const { linkId } = useParams();
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const via = appName(params.get('via'));
    const backToOrder = params.get('back') === '1';
    const [payment, setPayment] = useState(null);
    const [error, setError] = useState('');
    const [paying, setPaying] = useState(false);
    const [showItems, setShowItems] = useState(false);
    const [copied, setCopied] = useState(false);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        document.title = 'UPI payment';
        posApi.get(`/public/pay/${encodeURIComponent(linkId)}`)
            .then((res) => setPayment(res.data.payment))
            .catch((err) => setError(err.response?.data?.message || 'This payment link could not be opened.'));
        const tick = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(tick);
    }, [linkId]);

    useEffect(() => {
        if (payment?.status !== 'paid') return;
        document.title = `Paid ${rupees(payment.amount)} · UPI`;
        // Paid on the same phone that ordered: the basket is done with
        if (backToOrder) {
            try {
                localStorage.removeItem(CART_KEY);
            } catch {
                // Storage blocked - nothing to clear
            }
        }
    }, [payment, backToOrder]);

    const expired = payment && (payment.status === 'expired' || (payment.status === 'pending' && new Date(payment.expiresAt).getTime() <= now));

    const pay = async () => {
        setPaying(true);
        setError('');
        const started = Date.now();
        try {
            const res = await posApi.post(`/public/pay/${encodeURIComponent(linkId)}`);
            // A real payment takes a moment; so does this one, so it reads as one
            await new Promise((resolve) => setTimeout(resolve, Math.max(0, PROCESSING_MS - (Date.now() - started))));
            setPayment(res.data.payment);
            navigator.vibrate?.([60, 40, 120]);
        } catch (err) {
            setError(err.response?.data?.message || 'The payment could not be completed. No money was taken - please try again.');
            if (err.response?.status === 410) setPayment((current) => current && { ...current, status: 'expired' });
        } finally {
            setPaying(false);
        }
    };

    const copyReference = async () => {
        try {
            await navigator.clipboard.writeText(payment.reference);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // Clipboard blocked
        }
    };

    const shell = (children) => (
        <div className="min-h-[100dvh] bg-stone-100 font-pos text-stone-900">
            <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col bg-white shadow-[0_0_60px_-30px_rgba(0,0,0,0.35)]">{children}</div>
        </div>
    );

    if (error && !payment) {
        return shell(
            <div className="m-auto px-8 text-center">
                <PiWarningCircleDuotone className="mx-auto text-5xl text-rose-500" />
                <p className="mt-4 text-lg font-bold">Payment link not found</p>
                <p className="mt-2 text-sm text-stone-500">{error}</p>
            </div>,
        );
    }

    if (!payment) {
        return shell(<span className="m-auto h-10 w-10 animate-spin rounded-full border-[3px] border-emerald-600 border-t-transparent" aria-label="Loading" />);
    }

    /* ---------- Paid: the receipt ---------- */
    if (payment.status === 'paid') {
        return shell(
            <>
                <section className="pay-success flex flex-col items-center bg-emerald-600 px-6 pb-10 pt-14 text-center text-white">
                    <PaidTick size={96} />
                    <p className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-white/85">Payment successful</p>
                    <p className="mt-2 font-display text-[3.4rem] font-extrabold leading-none tabular-nums">{rupees(payment.amount)}</p>
                    <p className="mt-3 text-white/85">paid to <b>{payment.payee}</b></p>
                </section>
                <section className="-mt-5 flex-1 rounded-t-3xl bg-white px-5 pt-6">
                    <dl className="divide-y divide-stone-100 rounded-2xl ring-1 ring-stone-200">
                        {[
                            ['UPI transaction ID', (
                                <button key="ref" type="button" onClick={copyReference} className="flex items-center gap-1.5 font-code text-sm font-semibold">
                                    {payment.reference} {copied ? <PiCheckBold className="text-emerald-600" /> : <PiCopyBold className="text-stone-400" />}
                                </button>
                            )],
                            ['To', <span key="to" className="text-right"><span className="block font-semibold">{payment.payee}</span><span className="text-xs text-stone-500">{payment.upiId}</span></span>],
                            ['From', 'Test bank account •• 4321'],
                            ['Order', `#${payment.orderCode} · ${payment.items.reduce((sum, item) => sum + item.quantity, 0)} items`],
                            ['Date & time', when(payment.paidAt || Date.now())],
                        ].map(([label, value]) => (
                            <div key={label} className="flex items-center justify-between gap-4 px-4 py-3.5 text-sm">
                                <dt className="text-stone-500">{label}</dt>
                                <dd className="text-right font-medium">{value}</dd>
                            </div>
                        ))}
                    </dl>
                    <p className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        <PiCheckCircleFill className="shrink-0 text-lg" /> The restaurant has your order - it&apos;s being prepared.
                    </p>
                </section>
                <footer className="sticky bottom-0 grid gap-2 bg-white px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3">
                    <Link to={`/order/${payment.orderPublicId}`} className="flex items-center justify-center rounded-2xl bg-emerald-600 py-4 font-semibold text-white">Track your order</Link>
                    {!backToOrder && <p className="text-center text-xs text-stone-500">You can also go back to the screen you scanned - it shows your token.</p>}
                    <p className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-stone-400"><PiFlaskDuotone className="text-amber-500" /> Test payment · no money was moved</p>
                </footer>
            </>,
        );
    }

    /* ---------- Waiting to be paid ---------- */
    const count = payment.items.reduce((sum, item) => sum + item.quantity, 0);
    return shell(
        <>
            <header className="flex items-center gap-3 px-4 py-4">
                <button type="button" onClick={() => (backToOrder ? navigate('/order') : window.history.back())} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-stone-100" aria-label="Back">
                    <PiArrowLeftBold className="text-lg" />
                </button>
                <div className="flex-1">
                    <p className="font-bold leading-tight">UPI payment</p>
                    {via && <p className="text-xs text-stone-500">via {via}</p>}
                </div>
                <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"><PiLockSimpleFill /> Secure</span>
            </header>

            <main className="flex-1 px-5 pb-6">
                {/* Who is being paid */}
                <section className="flex flex-col items-center pt-4 text-center">
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gold text-xl font-bold text-ink shadow-[0_10px_24px_-12px_rgba(201,145,46,0.9)]">{initials(payment.payee)}</span>
                    <p className="mt-3 flex items-center gap-1.5 text-lg font-bold">{payment.payee} <PiSealCheckFill className="text-sky-600" aria-label="Verified merchant" /></p>
                    <p className="text-sm text-stone-500">{payment.upiId}</p>
                </section>

                {/* How much */}
                <section className="mt-7 text-center">
                    <p className="font-display text-[3.6rem] font-extrabold leading-none tabular-nums">{rupees(payment.amount)}</p>
                    <button type="button" onClick={() => setShowItems((open) => !open)} className="mx-auto mt-3 flex items-center gap-1.5 rounded-full bg-stone-100 px-3.5 py-1.5 text-sm text-stone-600">
                        Order #{payment.orderCode} · {count} item{count === 1 ? '' : 's'}
                        <PiCaretDownBold className={`text-xs transition-transform ${showItems ? 'rotate-180' : ''}`} />
                    </button>
                    {showItems && (
                        <ul className="mx-auto mt-3 max-w-xs space-y-1 text-sm text-stone-600">
                            {payment.items.map((item) => <li key={item.name}>{item.quantity} × {item.name}</li>)}
                        </ul>
                    )}
                </section>

                {expired ? (
                    <section className="mt-8 rounded-2xl bg-rose-50 p-5 text-center text-sm text-rose-800 ring-1 ring-rose-200">
                        <p className="font-semibold">This payment request has expired.</p>
                        <p className="mt-1">No money was taken. Please place the order again.</p>
                    </section>
                ) : (
                    <section className="mt-8">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Pay from</p>
                        <div className="flex items-center gap-3 rounded-2xl px-4 py-3.5 ring-2 ring-emerald-600">
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-xl text-emerald-700"><PiBankDuotone /></span>
                            <span className="flex-1">
                                <span className="block font-semibold">Test bank account</span>
                                <span className="text-xs text-stone-500">Savings •• 4321</span>
                            </span>
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] text-white"><PiCheckBold /></span>
                        </div>
                        <p className="mt-3 text-center font-code text-xs text-stone-400">Request expires in {timeLeft(payment.expiresAt, now)}</p>
                    </section>
                )}
                {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
            </main>

            {!expired && (
                <footer className="sticky bottom-0 bg-white px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_30px_-24px_rgba(0,0,0,0.5)]">
                    <button type="button" onClick={pay} disabled={paying} className="w-full rounded-2xl bg-emerald-600 py-4 text-lg font-bold text-white transition-transform active:scale-[0.99] disabled:opacity-80">
                        Pay {rupees(payment.amount)}
                    </button>
                    <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-stone-400"><PiFlaskDuotone className="text-amber-500" /> Test payment · no money will be debited</p>
                </footer>
            )}

            {paying && (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/95 text-center" role="status">
                    <span className="pay-processing" aria-hidden="true" />
                    <p className="mt-6 text-lg font-bold">Processing payment…</p>
                    <p className="mt-1 text-sm text-stone-500">Please don&apos;t press back or close this page</p>
                </div>
            )}
        </>,
    );
}
