import { useRef } from 'react';
import PropTypes from 'prop-types';
import { useInView } from './hooks';

const MAX_ITEMS = 14;

const today = () => new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

/**
 * Today's live menu, printed as a thermal receipt that feeds out of a printer slot
 */
const LiveReceipt = ({ info, board }) => {
    const ref = useRef(null);
    const printed = useInView(ref);
    const restaurant = info?.restaurant;
    const menu = info?.menu || [];

    return (
        <div ref={ref} className={`mx-auto w-full max-w-[400px] ${printed ? 'is-visible' : ''}`}>
            <div className="relative z-10 h-6 rounded-full bg-ink shadow-[0_10px_30px_-10px_rgba(15,14,12,0.6)]">
                <span className="absolute inset-x-8 top-1/2 h-1 -translate-y-1/2 rounded-full bg-black" />
            </div>
            <div className="-mt-3 overflow-hidden px-3">
                <div className="receipt-print">
                    <div className="bg-white px-6 pb-5 pt-9 font-code text-[12px] leading-relaxed text-ink shadow-[0_30px_60px_-30px_rgba(15,14,12,0.35)] sm:px-8 sm:text-[13px]">
                        <p className="text-center text-base font-bold uppercase tracking-wide">{restaurant?.name || 'Sri Ganesh Restaurant'}</p>
                        {restaurant?.address && <p className="text-center text-[11px] text-stone-500">{restaurant.address}</p>}
                        {restaurant?.hours && <p className="text-center text-[11px] text-stone-500">Open {restaurant.hours}</p>}
                        <p className="mt-1 text-center text-[11px] text-stone-500">{today()}</p>

                        <p className="mt-4 border-y border-dashed border-ink/40 py-1.5 text-center tracking-[0.35em]">TODAY&apos;S MENU</p>

                        {menu.length > 0 ? (
                            <ul className="mt-3 space-y-1">
                                {menu.slice(0, MAX_ITEMS).map((item) => (
                                    <li key={item.name} className="flex items-baseline gap-2">
                                        <span className={`inline-block h-2 w-2 shrink-0 rounded-[2px] border ${item.isVeg === false ? 'border-red-600' : 'border-green-700'}`} title={item.isVeg === false ? 'Non-veg' : 'Veg'} />
                                        <span className="truncate">{item.name}</span>
                                        <span className="min-w-4 flex-1 translate-y-[-3px] border-b border-dotted border-ink/30" />
                                        <span className="tabular-nums">{Number(item.price).toFixed(2)}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="py-8 text-center text-stone-500">{info ? 'The menu prints here once the counter is online.' : 'Connecting to the counter…'}</p>
                        )}
                        {menu.length > MAX_ITEMS && <p className="mt-1 text-center text-[11px] text-stone-500">+ {menu.length - MAX_ITEMS} more at the counter</p>}

                        <div className="mt-4 border-t border-dashed border-ink/40 pt-2">
                            <p className="flex justify-between"><span>NOW PREPARING</span><span>{board ? board.preparing.length : '-'}</span></p>
                            <p className="flex justify-between font-bold"><span>READY TO COLLECT</span><span>{board ? board.ready.length : '-'}</span></p>
                        </div>
                        {restaurant?.pricesIncludeGst && <p className="mt-2 text-center text-[11px] text-stone-500">All prices include GST</p>}

                        <div className="mx-auto mt-5 h-10 w-48 bg-[repeating-linear-gradient(90deg,#0f0e0c_0_2px,transparent_2px_4px,#0f0e0c_4px_5px,transparent_5px_8px,#0f0e0c_8px_11px,transparent_11px_12px)]" aria-hidden="true" />
                        <p className="mt-2 text-center text-[11px] tracking-[0.3em]">THANK YOU</p>
                    </div>
                    <div className="receipt-edge" />
                </div>
            </div>
        </div>
    );
};

LiveReceipt.propTypes = {
    info: PropTypes.shape({
        restaurant: PropTypes.object,
        menu: PropTypes.arrayOf(PropTypes.shape({ name: PropTypes.string, price: PropTypes.number, isVeg: PropTypes.bool })),
    }),
    board: PropTypes.shape({
        preparing: PropTypes.array,
        ready: PropTypes.array,
    }),
};

export default LiveReceipt;
