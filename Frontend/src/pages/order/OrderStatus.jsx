import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PiBellRingingDuotone, PiCheckCircleFill, PiCookingPotDuotone, PiReceiptDuotone, PiWhatsappLogoDuotone } from 'react-icons/pi';
import { RESTAURANT } from '../../site/restaurant';
import { formatPrice, posApi } from '../../utils/pos';

const POLL_MS = 4000;
const SLOW_AFTER_MS = 90 * 1000;
const KIOSK_RESET_MS = 30 * 1000;

const STATION_LABEL = { preparing: 'Being prepared', ready: 'Ready', served: 'Collected' };

/**
 * After paying: confirms the payment, then shows the token and the kitchen's progress live.
 * On a self-order kiosk it returns to a fresh order after a short while.
 */
export default function OrderStatus() {
    const { publicId } = useParams();
    const [params] = useSearchParams();
    const kiosk = params.get('kiosk') === '1';
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [missing, setMissing] = useState(false);
    const [slow, setSlow] = useState(false);
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
        const slowTimer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
        return () => {
            alive = false;
            clearInterval(poll);
            clearTimeout(slowTimer);
        };
    }, [publicId]);

    const bill = order?.bill;
    const status = bill?.status;

    useEffect(() => {
        document.title = bill ? `Token ${bill.tokenNumber} · ${RESTAURANT.word}` : `Your order · ${RESTAURANT.word}`;
        // A buzz the moment it's ready
        if (status === 'ready' && !notified.current) {
            notified.current = true;
            navigator.vibrate?.([200, 100, 200]);
        }
    }, [bill, status]);

    useEffect(() => {
        if (!kiosk || !bill) return undefined;
        const timer = setTimeout(() => navigate('/order?kiosk=1', { replace: true }), KIOSK_RESET_MS);
        return () => clearTimeout(timer);
    }, [kiosk, bill, navigate]);

    if (missing) {
        return (
            <div className="qb-site flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-ink px-6 text-center text-paper">
                <p className="font-accent text-5xl">We couldn&apos;t find this order.</p>
                <Link to="/order" className="site-button bg-gold text-ink">Start a new order</Link>
            </div>
        );
    }

    const ready = status === 'ready';
    const served = status === 'served';

    return (
        <div className="qb-site relative min-h-[100dvh] overflow-hidden bg-ink text-paper">
            <img src={ready ? '/site/hero-m.webp' : '/site/morning-m.webp'} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30 transition-opacity duration-700" />
            <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/80 to-ink" />

            <div className="relative mx-auto flex min-h-[100dvh] max-w-xl flex-col px-5 pb-10 pt-6">
                <Link to={kiosk ? '/order?kiosk=1' : '/'} className="font-accent text-2xl">{RESTAURANT.word}</Link>

                {!bill ? (
                    <div className="my-auto text-center">
                        <span className="mx-auto block h-12 w-12 animate-spin rounded-full border-2 border-gold border-t-transparent" aria-hidden="true" />
                        <h1 className="mt-8 font-accent text-5xl">Confirming your payment…</h1>
                        <p className="mt-3 text-paper/65">This takes a few seconds. Please don&apos;t pay again.</p>
                        {slow && (
                            <p className="mt-6 rounded-2xl bg-white/5 p-4 text-sm text-paper/70 ring-1 ring-white/10">
                                Taking longer than usual. If money left your account it will be confirmed here automatically,
                                or returned by your bank. You can show this page at the counter.
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="my-auto py-10">
                        <p className={`flex items-center gap-2 font-code text-[11px] uppercase tracking-[0.35em] ${ready ? 'text-emerald-300' : 'text-gold'}`}>
                            {ready ? <PiBellRingingDuotone className="text-lg" /> : served ? <PiCheckCircleFill className="text-lg" /> : <PiCookingPotDuotone className="text-lg" />}
                            {ready ? 'Ready - please collect' : served ? 'Collected - enjoy!' : 'Paid · being prepared'}
                        </p>
                        <p className="mt-4 text-sm uppercase tracking-[0.3em] text-paper/50">Token</p>
                        <p className={`font-accent text-[clamp(8rem,40vw,13rem)] leading-[0.8] tabular-nums ${ready ? 'qb-pop text-emerald-300' : 'text-paper'}`} aria-live="polite">
                            {bill.tokenNumber}
                        </p>

                        <ul className="mt-8 space-y-2">
                            {bill.stations.map((station) => (
                                <li key={station.counter} className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
                                    <span>{station.counter}</span>
                                    <span className={`flex items-center gap-2 text-sm ${station.status === 'preparing' ? 'text-gold' : 'text-emerald-300'}`}>
                                        <span className={`h-2 w-2 rounded-full ${station.status === 'preparing' ? 'animate-pulse bg-gold' : 'bg-emerald-300'}`} />
                                        {STATION_LABEL[station.status]}
                                    </span>
                                </li>
                            ))}
                        </ul>

                        <div className="mt-8 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                            {order.items.map((item) => (
                                <p key={item.name} className="flex justify-between py-1 text-sm text-paper/80">
                                    <span>{item.quantity} × {item.name}</span>
                                    <span className="font-code tabular-nums">{formatPrice(item.amount)}</span>
                                </p>
                            ))}
                            <p className="mt-2 flex justify-between border-t border-white/10 pt-3 font-semibold">
                                <span>Paid</span><span className="font-code tabular-nums">{formatPrice(order.total)}</span>
                            </p>
                        </div>

                        {!served && (
                            <p className="mt-6 flex items-start gap-2 text-sm text-paper/65">
                                <PiWhatsappLogoDuotone className="mt-0.5 shrink-0 text-lg text-[#25d366]" />
                                Keep this page open, or watch WhatsApp - we&apos;ll tell you when token {bill.tokenNumber} is ready.
                            </p>
                        )}

                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link to={`/receipt/${bill.publicId}`} className="site-button bg-paper text-ink"><PiReceiptDuotone /> View bill</Link>
                            {kiosk
                                ? <Link to="/order?kiosk=1" className="site-button border border-paper/25">Next order</Link>
                                : <Link to="/" className="site-button border border-paper/25">Back to {RESTAURANT.word}</Link>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
