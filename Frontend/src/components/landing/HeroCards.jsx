import { PiBellRingingFill, PiChecksBold, PiQrCodeBold, PiWhatsappLogoFill } from 'react-icons/pi';
import { photoUrl } from '../../utils/foodPhotos';

// The same order the story section plays out further down the page
const ORDER = [
    { name: 'Masala Dosa', photo: 'masala-dosa', quantity: 2, amount: 160 },
    { name: 'Filter Coffee', photo: 'filter-coffee', quantity: 1, amount: 30 },
];

/**
 * Floating glimpses of one order over the hero photo: the bill, the token being called
 * and the receipt on WhatsApp. Decorative - the same story is told in text below.
 */
const HeroCards = () => (
    <div className="pointer-events-none relative h-full min-h-[560px] select-none" aria-hidden="true">
        {/* Token called on the TV */}
        <div className="hero-card absolute right-0 top-4 w-52 rounded-[26px] bg-ink/65 p-5 text-paper ring-1 ring-white/15 backdrop-blur-xl xl:right-6" style={{ '--enter': '700ms', '--float': '0s' }}>
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                <PiBellRingingFill className="text-sm" /> Ready to collect
            </p>
            <p className="mt-2 font-display text-[76px] font-extrabold leading-none tracking-[-0.04em] tabular-nums">42</p>
            <p className="mt-1 flex items-center gap-2 text-sm text-stone-300">
                <span className="h-2 w-2 animate-pulse rounded-full bg-leaf" /> Dosa Counter
            </p>
        </div>

        {/* The bill at the counter */}
        <div className="hero-card absolute bottom-[136px] left-0 w-[300px] rounded-[26px] bg-white p-4 text-ink shadow-[0_40px_80px_-24px_rgba(0,0,0,0.65)] xl:left-4" style={{ '--enter': '500ms', '--float': '-2s' }}>
            <div className="flex items-center justify-between px-1">
                <p className="font-display text-lg font-bold tracking-tight">Token #42</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                    <PiQrCodeBold /> UPI · Paid
                </span>
            </div>
            <ul className="mt-3 space-y-2">
                {ORDER.map((line) => (
                    <li key={line.name} className="flex items-center gap-3 rounded-2xl bg-stone-50 p-2 pr-3">
                        <img src={photoUrl(line.photo)} alt="" width={96} height={72} className="h-11 w-11 rounded-xl object-cover" />
                        <span className="min-w-0 flex-1 text-sm font-semibold">{line.name}<span className="block text-xs font-medium text-stone-500">× {line.quantity}</span></span>
                        <span className="text-sm font-bold tabular-nums">₹{line.amount}</span>
                    </li>
                ))}
            </ul>
            <p className="mt-3 flex items-baseline justify-between border-t border-dashed border-stone-200 px-1 pt-3">
                <span className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500">Total</span>
                <span className="font-display text-2xl font-extrabold tracking-tight tabular-nums">₹190</span>
            </p>
        </div>

        {/* Receipt on WhatsApp */}
        <div className="hero-card absolute -bottom-2 right-2 w-64 rounded-[22px] rounded-tr-md bg-[#dcf8c6] px-4 py-3 text-stone-800 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)] xl:right-10" style={{ '--enter': '900ms', '--float': '-4s' }}>
            <p className="flex items-center gap-1.5 text-xs font-bold text-[#128c4b]"><PiWhatsappLogoFill className="text-base" /> Bill on WhatsApp</p>
            <p className="mt-1 text-sm leading-snug">
                Token <b>#42</b> · <b>Total ₹190.00</b> (UPI)
                <span className="mt-0.5 block text-stone-600">Please show token #42 at the counter.</span>
            </p>
            <p className="mt-1 flex items-center justify-end gap-1 text-[11px] text-stone-500">12:41 <PiChecksBold className="text-sky-500" /></p>
        </div>
    </div>
);

export default HeroCards;
