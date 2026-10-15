import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { formatPrice } from '../../utils/pos';

const FIRST_VIEW = 14;

const VegMark = ({ isVeg }) => (
    <span
        className={`flex h-3 w-3 shrink-0 items-center justify-center rounded-[2px] border ${isVeg === false ? 'border-red-700' : 'border-green-700'}`}
        title={isVeg === false ? 'Non-veg' : 'Veg'}
    >
        <span className={`h-1.5 w-1.5 rounded-full ${isVeg === false ? 'bg-red-700' : 'bg-green-700'}`} />
    </span>
);

VegMark.propTypes = { isVeg: PropTypes.bool };

/**
 * Today's menu, live from the restaurant's counter (only dishes that are available right now)
 */
const MenuSection = ({ menu, pricesIncludeGst }) => {
    const [all, setAll] = useState(false);

    const groups = useMemo(() => {
        const shown = all ? menu : menu.slice(0, FIRST_VIEW);
        const byCategory = new Map();
        for (const item of shown) {
            const key = item.category || 'Menu';
            if (!byCategory.has(key)) byCategory.set(key, []);
            byCategory.get(key).push(item);
        }
        return [...byCategory.entries()];
    }, [menu, all]);

    return (
        <section id="menu" data-chapter="Menu" className="scroll-mt-0 bg-paper px-5 py-28 text-ink sm:px-10 lg:py-40">
            <div className="mx-auto max-w-6xl">
                <div className="flex flex-wrap items-end justify-between gap-6">
                    <div>
                        <p className="font-code text-[11px] uppercase tracking-[0.4em] text-saffron-deep">04</p>
                        <h2 className="mt-6 font-accent text-[clamp(3.5rem,8vw,8.5rem)] leading-[0.85]">
                            Today’s <em>menu.</em>
                        </h2>
                    </div>
                    <p className="flex items-center gap-2 font-code text-[11px] uppercase tracking-[0.3em] text-ink/50">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-leaf" /> Live from our counter
                    </p>
                </div>

                <div className="mt-16 grid gap-x-16 gap-y-14 md:grid-cols-2">
                    {groups.map(([category, items]) => (
                        <div key={category} className="break-inside-avoid">
                            <h3 className="border-b border-ink/15 pb-3 font-code text-[11px] uppercase tracking-[0.35em] text-ink/50">{category}</h3>
                            <ul className="mt-2">
                                {items.map((item) => (
                                    <li key={item.name} className="flex items-baseline gap-3 py-3">
                                        <VegMark isVeg={item.isVeg} />
                                        <span className="font-accent text-2xl leading-tight sm:text-[28px]">{item.name}</span>
                                        <span className="mb-1.5 min-w-6 flex-1 border-b border-dotted border-ink/25" />
                                        <span className="font-code text-sm tabular-nums text-ink/80">{formatPrice(item.price)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="mt-14 flex flex-wrap items-center justify-between gap-4 text-sm text-ink/50">
                    {pricesIncludeGst ? <p>All prices include GST.</p> : <span />}
                    {menu.length > FIRST_VIEW && (
                        <button type="button" onClick={() => setAll((value) => !value)} className="site-link font-semibold text-ink">
                            {all ? 'Show less' : `See all ${menu.length} dishes`}
                        </button>
                    )}
                </div>
            </div>
        </section>
    );
};

MenuSection.propTypes = {
    menu: PropTypes.arrayOf(PropTypes.shape({
        name: PropTypes.string,
        price: PropTypes.number,
        category: PropTypes.string,
        isVeg: PropTypes.bool,
    })).isRequired,
    pricesIncludeGst: PropTypes.bool,
};

export default MenuSection;
