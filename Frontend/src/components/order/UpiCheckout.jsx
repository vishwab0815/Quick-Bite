import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import QRCode from 'qrcode';
import { PiArrowRightBold, PiClockCountdownDuotone, PiFlaskDuotone, PiQrCodeDuotone, PiShieldCheckDuotone, PiXBold } from 'react-icons/pi';
import { posApi } from '../../utils/pos';
import { AppMark, PaidTick } from './PaymentBits';
import { UPI_APPS, initials, rupees, timeLeft } from '../../utils/payment';

const POLL_MS = 2000;
const DONE_AFTER_MS = 2200;

/**
 * Pay for an order by UPI (simulated - no money moves). Each order has its own payment link:
 * on a computer or kiosk it is shown as a UPI QR code to scan with any phone; on a phone the
 * customer picks their UPI app, which opens the same link. Either way this screen watches the
 * link and turns to "Payment successful" the moment it is paid, then moves on to the order.
 */
const UpiCheckout = ({ payment, kiosk = false, onDone, onClose }) => {
    const link = `${window.location.origin}/pay/${payment.id}`;
    const onPhone = useMemo(() => !kiosk && window.matchMedia('(pointer: coarse)').matches && window.innerWidth < 768, [kiosk]);
    const [view, setView] = useState(onPhone ? 'apps' : 'qr');
    const [qr, setQr] = useState('');
    const [state, setState] = useState({ status: 'pending' });
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        QRCode.toDataURL(link, { margin: 1, width: 520, errorCorrectionLevel: 'M', color: { dark: '#0f0e0c', light: '#ffffff' } })
            .then(setQr)
            .catch(() => setQr(''));
    }, [link]);

    // Watch the payment link until it is paid (or runs out)
    useEffect(() => {
        if (state.status !== 'pending') return undefined;
        let alive = true;
        const check = () => posApi.get(`/public/pay/${payment.id}`)
            .then((res) => alive && res.data.payment.status !== 'pending' && setState(res.data.payment))
            .catch(() => {});
        const poll = setInterval(() => document.visibilityState === 'visible' && check(), POLL_MS);
        const tick = setInterval(() => setNow(Date.now()), 1000);
        const onVisible = () => document.visibilityState === 'visible' && check();
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            alive = false;
            clearInterval(poll);
            clearInterval(tick);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [payment.id, state.status]);

    const expired = state.status === 'expired' || (state.status === 'pending' && new Date(payment.expiresAt).getTime() <= now);

    useEffect(() => {
        if (state.status !== 'paid') return undefined;
        navigator.vibrate?.([60, 40, 120]);
        const timer = setTimeout(onDone, DONE_AFTER_MS);
        return () => clearTimeout(timer);
    }, [state.status, onDone]);

    const openApp = (appId) => {
        window.location.assign(`/pay/${payment.id}?via=${appId}&back=1`);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/70 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-label="Pay by UPI">
            <div className="qb-sheet relative max-h-[96dvh] w-full max-w-md overflow-y-auto rounded-t-[28px] bg-white text-ink shadow-2xl sm:rounded-[28px]">
                {state.status === 'paid' ? (
                    <div className="flex flex-col items-center px-6 pb-10 pt-10 text-center">
                        <PaidTick size={96} />
                        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">Payment successful</p>
                        <p className="mt-2 font-display text-5xl font-extrabold tabular-nums">{rupees(state.amount)}</p>
                        <p className="mt-2 text-sm text-ink/60">paid to {state.payee}</p>
                        {state.reference && <p className="mt-4 rounded-full bg-stone-100 px-4 py-1.5 font-code text-xs text-ink/60">UPI Ref {state.reference}</p>}
                        <p className="mt-8 flex items-center gap-2 text-sm text-ink/50">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" /> Taking you to your order…
                        </p>
                    </div>
                ) : (
                    <>
                        <header className="flex items-center gap-3 border-b border-stone-100 px-5 py-4">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold font-bold text-ink">{initials(payment.payee)}</span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold leading-tight">{payment.payee}</p>
                                <p className="flex items-center gap-1 text-xs text-ink/50"><PiShieldCheckDuotone className="text-emerald-600" /> Secure UPI payment</p>
                            </div>
                            <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-ink/60 ring-1 ring-stone-200 hover:text-ink" aria-label="Cancel payment">
                                <PiXBold />
                            </button>
                        </header>

                        <div className="px-6 pb-6 pt-5 text-center">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">Amount to pay</p>
                            <p className="mt-1 font-display text-5xl font-extrabold tabular-nums">{rupees(payment.amount)}</p>

                            {expired ? (
                                <div className="mt-8 rounded-2xl bg-rose-50 p-5 text-sm text-rose-800 ring-1 ring-rose-200">
                                    <p className="font-semibold">This payment request has expired.</p>
                                    <p className="mt-1">No money was taken. Your dishes are still in your order - start the payment again.</p>
                                    <button type="button" onClick={onClose} className="mt-4 rounded-full bg-ink px-5 py-2.5 font-semibold text-paper">Try again</button>
                                </div>
                            ) : view === 'qr' ? (
                                <>
                                    <div className="relative mx-auto mt-5 w-[min(72vw,260px)] rounded-3xl bg-white p-3 shadow-[0_18px_40px_-20px_rgba(15,14,12,0.45)] ring-1 ring-stone-200">
                                        {qr ? <img src={qr} alt="UPI QR code for this payment" className="aspect-square w-full" /> : <div className="aspect-square w-full animate-pulse rounded-2xl bg-stone-100" />}
                                        <span className="pay-scan-line" aria-hidden="true" />
                                    </div>
                                    <p className="mt-4 font-semibold">Scan with any UPI app</p>
                                    <div className="mt-3 flex items-center justify-center gap-2">
                                        {UPI_APPS.map((app) => <AppMark key={app.id} app={app} size={28} />)}
                                    </div>
                                </>
                            ) : (
                                <div className="mt-6 text-left">
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">Pay with</p>
                                    <ul className="overflow-hidden rounded-2xl ring-1 ring-stone-200">
                                        {UPI_APPS.map((app) => (
                                            <li key={app.id} className="border-b border-stone-100 last:border-b-0">
                                                <button type="button" onClick={() => openApp(app.id)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-stone-50 active:bg-stone-100">
                                                    <AppMark app={app} />
                                                    <span className="flex-1 font-semibold">{app.name}</span>
                                                    <PiArrowRightBold className="text-ink/40" />
                                                </button>
                                            </li>
                                        ))}
                                        <li>
                                            <button type="button" onClick={() => openApp('upi')} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-stone-50 active:bg-stone-100">
                                                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-xs font-bold text-ink/60">UPI</span>
                                                <span className="flex-1 font-semibold">Other UPI apps</span>
                                                <PiArrowRightBold className="text-ink/40" />
                                            </button>
                                        </li>
                                    </ul>
                                </div>
                            )}

                            {!expired && (
                                <>
                                    <p className="mt-5 flex items-center justify-center gap-2 text-sm text-ink/60">
                                        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" /> Waiting for payment
                                        <span className="flex items-center gap-1 font-code text-xs text-ink/45"><PiClockCountdownDuotone /> {timeLeft(payment.expiresAt, now)}</span>
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setView(view === 'qr' ? 'apps' : 'qr')}
                                        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink/60 underline-offset-4 hover:text-ink hover:underline"
                                    >
                                        {view === 'qr' ? 'Paying on this phone? Choose your UPI app' : <><PiQrCodeDuotone /> Pay from another phone - show QR code</>}
                                    </button>
                                </>
                            )}
                        </div>

                        <p className="flex items-center justify-center gap-1.5 border-t border-stone-100 bg-stone-50 px-5 py-3 text-[11px] font-medium text-ink/50">
                            <PiFlaskDuotone className="text-sm text-amber-600" /> Test payment · no money is moved
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

UpiCheckout.propTypes = {
    payment: PropTypes.shape({ id: PropTypes.string.isRequired, amount: PropTypes.number.isRequired, payee: PropTypes.string, expiresAt: PropTypes.string.isRequired }).isRequired,
    kiosk: PropTypes.bool,
    onDone: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
};

export default UpiCheckout;
