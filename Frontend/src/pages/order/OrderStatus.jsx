import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PiBellRingingFill, PiCheckBold, PiLinkSimpleBold, PiNotePencilDuotone, PiReceiptDuotone, PiWhatsappLogoDuotone } from 'react-icons/pi';
import { RESTAURANT } from '../../site/restaurant';
import { formatPrice, posApi } from '../../utils/pos';

const POLL_MS = 4000;
const SLOW_AFTER_MS = 90 * 1000;
const KIOSK_RESET_MS = 30 * 1000;

const STEPS = ['Confirmed', 'Preparing', 'Ready', 'Collected'];
const STAGE = { preparing: 1, ready: 2, served: 3 };
const STATION_LABEL = { preparing: 'Preparing', ready: 'Ready', served: 'Collected' };
const METHOD_LABEL = { upi: 'UPI', card: 'Card', netbanking: 'Net banking', wallet: 'Wallet' };

const timeOf = (date) => (date ? new Date(date).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '');

/** Two soft notes when the order is ready (the customer has already tapped on this page) */
const chime = () => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const context = new AudioContext();
        [[880, 0], [1320, 0.18]].forEach(([frequency, at]) => {
            const tone = context.createOscillator();
            const volume = context.createGain();
            tone.type = 'sine';
            tone.frequency.value = frequency;
            volume.gain.setValueAtTime(0.0001, context.currentTime + at);
            volume.gain.exponentialRampToValueAtTime(0.25, context.currentTime + at + 0.02);
            volume.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + at + 0.5);
            tone.connect(volume).connect(context.destination);
            tone.start(context.currentTime + at);
            tone.stop(context.currentTime + at + 0.55);
        });
        setTimeout(() => context.close(), 1200);
    } catch {
        // Sound is a nicety - the banner and the buzz still show it
    }
};

/** Confirmed → Preparing → Ready → Collected, filled up to where the order is */
const Progress = ({ stage }) => (
    <ol className="relative grid grid-cols-4" aria-label="Order progress">
        <span className="absolute left-[12.5%] right-[12.5%] top-[13px] h-[3px] rounded-full bg-ink/10" aria-hidden="true" />
        <span
            className="absolute left-[12.5%] top-[13px] h-[3px] rounded-full bg-gold transition-[width] duration-700 ease-out"
            style={{ width: `${(Math.min(stage, 3) / 3) * 75}%` }}
            aria-hidden="true"
        />
        {STEPS.map((label, index) => {
            const done = index < stage || stage === 3;
            const current = index === stage && stage < 3;
            return (
                <li key={label} className="relative flex flex-col items-center gap-2 text-center" aria-current={current ? 'step' : undefined}>
                    <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors duration-500 ${
                            done ? 'bg-gold text-ink' : current ? 'bg-ink text-paper ring-4 ring-gold/30' : 'bg-white text-ink/30 ring-1 ring-ink/15'
                        }`}
                    >
                        {done ? <PiCheckBold /> : index + 1}
                        {current && <span className="absolute h-7 w-7 animate-ping rounded-full bg-gold/30" aria-hidden="true" />}
                    </span>
                    <span className={`text-[11px] font-semibold sm:text-xs ${done || current ? 'text-ink' : 'text-ink/40'}`}>{label}</span>
                </li>
            );
        })}
    </ol>
);

Progress.propTypes = { stage: PropTypes.number.isRequired };

/**
 * The customer's own order page (its link is unique to this order): confirms the payment,
 * then shows the token and the kitchen's progress live. When it is ready, the page says so
 * loudly - banner, buzz and a chime. On a self-order kiosk it returns to a new order.
 */
export default function OrderStatus() {
    const { publicId } = useParams();
    const [params] = useSearchParams();
    const kiosk = params.get('kiosk') === '1';
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [missing, setMissing] = useState(false);
    const [slow, setSlow] = useState(false);
    const [copied, setCopied] = useState(false);
    const notified = useRef(false);

    useEffect(() => {
        let alive = true;
        const load = () => posApi.get(`/public/orders/${encodeURIComponent(publicId)}`)
            .then((res) => alive && setOrder(res.data.order))
            .catch((error) => alive && error.response?.status === 404 && setMissing(true));
        load();
        const poll = setInterval(() => {
            if (document.visibilityState === 'visible') load();
        }, POLL_MS);
        // Coming back to the tab: check at once
        const onVisible = () => document.visibilityState === 'visible' && load();
        document.addEventListener('visibilitychange', onVisible);
        const slowTimer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
        return () => {
            alive = false;
            clearInterval(poll);
            clearTimeout(slowTimer);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [publicId]);

    const bill = order?.bill;
    const status = bill?.status;
    const ready = status === 'ready';
    const served = status === 'served';

    useEffect(() => {
        document.title = !bill
            ? `Your order · ${RESTAURANT.word}`
            : ready ? `🔔 Token ${bill.tokenNumber} is ready · ${RESTAURANT.word}` : `Token ${bill.tokenNumber} · ${RESTAURANT.word}`;
        if (ready && !notified.current) {
            notified.current = true;
            navigator.vibrate?.([250, 120, 250, 120, 400]);
            chime();
        }
    }, [bill, ready]);

    useEffect(() => {
        if (!kiosk || !bill) return undefined;
        const timer = setTimeout(() => navigate('/order?kiosk=1', { replace: true }), KIOSK_RESET_MS);
        return () => clearTimeout(timer);
    }, [kiosk, bill, navigate]);

    const shareLink = async () => {
        const url = window.location.href.replace(/\?kiosk=1$/, '');
        try {
            if (navigator.share) {
                await navigator.share({ title: `Token ${bill?.tokenNumber} · ${RESTAURANT.name}`, url });
                return;
            }
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Share sheet closed - nothing to do
        }
    };

    if (missing) {
        return (
            <div className="qb-site flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-paper px-6 text-center text-ink">
                <p className="font-accent text-5xl">We couldn&apos;t find this order.</p>
                <p className="max-w-sm text-ink/60">The link may be incomplete. If you paid, show your payment message at the counter.</p>
                <Link to="/order" className="site-button bg-ink text-paper">Start a new order</Link>
            </div>
        );
    }

    const stage = !bill ? 0 : STAGE[status] ?? 1;
    const readyAt = bill?.stations.filter((station) => station.status === 'ready').map((station) => station.counter) || [];

    return (
        <div className={`qb-site min-h-[100dvh] text-ink transition-colors duration-700 ${ready ? 'bg-emerald-50' : 'bg-paper'}`}>
            <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-5 pb-10 pt-5">
                <header className="flex items-center justify-between">
                    <Link to={kiosk ? '/order?kiosk=1' : '/'} className="font-accent text-2xl">{RESTAURANT.word}</Link>
                    {order && <span className="font-code text-[11px] text-ink/50">Ordered {timeOf(order.createdAt)}</span>}
                </header>

                {!bill ? (
                    <div className="my-auto text-center">
                        <span className="mx-auto block h-12 w-12 animate-spin rounded-full border-2 border-gold border-t-transparent" aria-hidden="true" />
                        <h1 className="mt-8 font-accent text-5xl leading-none">Confirming your payment…</h1>
                        <p className="mt-4 text-ink/60">This takes a few seconds. Please don&apos;t pay again.</p>
                        {slow && (
                            <p className="mt-6 rounded-2xl bg-white p-4 text-sm text-ink/70 ring-1 ring-ink/10">
                                Taking longer than usual. If money left your account it will be confirmed here automatically,
                                or returned by your bank. You can show this page at the counter.
                            </p>
                        )}
                    </div>
                ) : (
                    <main className="mt-6 flex flex-col gap-4">
                        {ready && (
                            <div className="qb-pop flex items-start gap-3 rounded-3xl bg-emerald-600 p-5 text-white shadow-[0_20px_40px_-20px_rgba(5,150,105,0.8)]" role="status">
                                <PiBellRingingFill className="mt-0.5 shrink-0 animate-bounce text-3xl" />
                                <div>
                                    <p className="text-xl font-bold">Your order is ready!</p>
                                    <p className="mt-1 text-sm text-white/85">
                                        Show token <b>{bill.tokenNumber}</b> at {readyAt.length ? readyAt.join(' & ') : 'the counter'} to collect it.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* The token, as a ticket */}
                        <section className="relative overflow-hidden rounded-[28px] bg-white shadow-[0_24px_50px_-30px_rgba(15,14,12,0.45)] ring-1 ring-ink/5">
                            <div className="px-6 pb-6 pt-5 text-center">
                                <p className="font-code text-[10px] uppercase tracking-[0.35em] text-ink/50">Your token</p>
                                <p
                                    className={`mt-1 font-display text-[clamp(5.5rem,30vw,8rem)] font-extrabold leading-none tracking-tight tabular-nums ${ready ? 'qb-pop text-emerald-600' : 'text-ink'}`}
                                    aria-live="polite"
                                >
                                    {bill.tokenNumber}
                                </p>
                                <p className="mt-2 text-sm font-medium text-ink/60">
                                    {served ? 'Collected - enjoy your meal 🙏' : ready ? 'Ready at the counter' : 'Being prepared in the kitchen'}
                                </p>
                            </div>
                            {/* Tear line */}
                            <div className="relative flex items-center" aria-hidden="true">
                                <span className={`absolute -left-3 h-6 w-6 rounded-full transition-colors duration-700 ${ready ? 'bg-emerald-50' : 'bg-paper'}`} />
                                <span className="mx-5 w-full border-t-2 border-dashed border-ink/10" />
                                <span className={`absolute -right-3 h-6 w-6 rounded-full transition-colors duration-700 ${ready ? 'bg-emerald-50' : 'bg-paper'}`} />
                            </div>
                            <div className="px-5 pb-5 pt-5">
                                <Progress stage={stage} />
                            </div>
                        </section>

                        {bill.stations.length > 1 && !served && (
                            <ul className="grid gap-2">
                                {bill.stations.map((station) => (
                                    <li key={station.counter} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-ink/5">
                                        <span className="font-medium">{station.counter}</span>
                                        <span className={`flex items-center gap-2 font-semibold ${station.status === 'preparing' ? 'text-saffron-deep' : 'text-emerald-600'}`}>
                                            <span className={`h-2 w-2 rounded-full ${station.status === 'preparing' ? 'animate-pulse bg-gold' : 'bg-emerald-500'}`} />
                                            {STATION_LABEL[station.status]}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {!served && !ready && !kiosk && (
                            <p className="flex items-start gap-2.5 rounded-2xl bg-white px-4 py-3 text-sm text-ink/70 ring-1 ring-ink/5">
                                <PiWhatsappLogoDuotone className="mt-0.5 shrink-0 text-lg text-[#25d366]" />
                                <span>
                                    This page updates by itself.{order.phoneEnding && <> We&apos;ll also WhatsApp you on ••••{order.phoneEnding} when it&apos;s ready.</>}
                                </span>
                            </p>
                        )}

                        {/* What was ordered */}
                        <section className="rounded-3xl bg-white p-5 ring-1 ring-ink/5">
                            <h2 className="font-code text-[10px] uppercase tracking-[0.35em] text-ink/50">Your order</h2>
                            <ul className="mt-3 space-y-1.5">
                                {order.items.map((item) => (
                                    <li key={item.name} className="flex justify-between gap-4 text-sm">
                                        <span><b className="tabular-nums">{item.quantity}</b> × {item.name}</span>
                                        <span className="tabular-nums text-ink/70">{formatPrice(item.amount)}</span>
                                    </li>
                                ))}
                            </ul>
                            {order.note && (
                                <p className="mt-3 flex items-start gap-2 rounded-xl bg-paper px-3 py-2 text-sm text-ink/70">
                                    <PiNotePencilDuotone className="mt-0.5 shrink-0 text-gold" /> {order.note}
                                </p>
                            )}
                            <p className="mt-3 flex items-baseline justify-between border-t border-ink/10 pt-3">
                                <span className="text-sm font-semibold">
                                    {order.demo ? 'Demo order · no payment taken' : `Paid${METHOD_LABEL[order.paymentMethod] ? ` · ${METHOD_LABEL[order.paymentMethod]}` : ''}`}
                                </span>
                                <span className="font-display text-xl font-bold tabular-nums">{formatPrice(order.total)}</span>
                            </p>
                        </section>

                        <div className="mt-2 grid grid-cols-2 gap-3">
                            <Link to={`/receipt/${bill.publicId}`} className="flex items-center justify-center gap-2 rounded-full bg-white py-3.5 text-sm font-semibold ring-1 ring-ink/15">
                                <PiReceiptDuotone className="text-lg" /> View bill
                            </Link>
                            {kiosk ? (
                                <Link to="/order?kiosk=1" className="flex items-center justify-center rounded-full bg-ink py-3.5 text-sm font-semibold text-paper">Next order</Link>
                            ) : (
                                <button type="button" onClick={shareLink} className="flex items-center justify-center gap-2 rounded-full bg-white py-3.5 text-sm font-semibold ring-1 ring-ink/15">
                                    {copied ? <><PiCheckBold /> Link copied</> : <><PiLinkSimpleBold /> Save link</>}
                                </button>
                            )}
                        </div>
                        {!kiosk && (
                            <Link to={served ? '/order' : '/'} className="text-center text-sm font-semibold text-ink/60 underline-offset-4 hover:underline">
                                {served ? 'Order again' : `Back to ${RESTAURANT.word}`}
                            </Link>
                        )}
                    </main>
                )}
            </div>
        </div>
    );
}
