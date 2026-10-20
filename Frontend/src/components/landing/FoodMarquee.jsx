import PropTypes from 'prop-types';
import { photoUrl } from '../../utils/foodPhotos';
import Reveal from './Reveal';

// A taste of the photo library every menu draws from
const ROWS = [
    [
        ['masala-dosa', 'Masala Dosa'], ['idli-vada', 'Idli Vada'], ['filter-coffee', 'Filter Coffee'], ['meals', 'South Indian Meals'],
        ['cone-dosa', 'Ghee Roast'], ['kesari', 'Kesari Bath'], ['poori', 'Poori'], ['lassi', 'Lassi'],
    ],
    [
        ['biryani', 'Chicken Biryani', false], ['uttapam', 'Onion Uttapam'], ['vada', 'Medu Vada'], ['tea', 'Masala Chai'],
        ['parotta', 'Parotta'], ['curd-rice', 'Curd Rice'], ['thali', 'Non-veg Meals', false], ['badam-milk', 'Badam Milk'],
    ],
];

const DishTile = ({ photo, name, isVeg }) => (
    <figure className="relative h-44 w-56 shrink-0 overflow-hidden rounded-[22px] bg-ink sm:h-52 sm:w-72">
        <img src={photoUrl(photo)} alt="" width={640} height={480} loading="lazy" decoding="async" className="h-full w-full object-cover" />
        <span className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/5 to-transparent" />
        <figcaption className="absolute inset-x-4 bottom-3.5 flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-white">
            <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border-[1.5px] bg-white ${isVeg ? 'border-green-700' : 'border-red-600'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${isVeg ? 'bg-green-700' : 'bg-red-600'}`} />
            </span>
            {name}
        </figcaption>
    </figure>
);

DishTile.propTypes = { photo: PropTypes.string.isRequired, name: PropTypes.string.isRequired, isVeg: PropTypes.bool };

/**
 * Two rows of dish photos drifting in opposite directions (paused on hover)
 */
const FoodMarquee = () => (
    <section className="overflow-hidden py-24 sm:py-28" aria-labelledby="food-heading">
        <Reveal className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-6 px-5 sm:px-8">
            <div>
                <p className="font-code text-xs uppercase tracking-[0.3em] text-saffron-deep">Made for South Indian counters</p>
                <h2 id="food-heading" className="mt-4 max-w-2xl font-display text-4xl font-bold leading-[1.02] tracking-[-0.03em] sm:text-6xl">
                    Every dish, <span className="font-accent font-normal italic">one tap away.</span>
                </h2>
            </div>
            <p className="max-w-sm text-lg leading-relaxed text-ink/60">
                Photos make a busy menu easy to scan. Pick one for each dish from our library, or let QuickBite match it by name.
            </p>
        </Reveal>

        <div className="marquee group mt-12 space-y-4 [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]" aria-hidden="true">
            {ROWS.map((row, index) => (
                <div key={index} className={`marquee-track flex w-max gap-4 ${index === 1 ? 'marquee-reverse' : ''}`}>
                    {[...row, ...row].map(([photo, name, isVeg = true], tile) => (
                        <DishTile key={tile} photo={photo} name={name} isVeg={isVeg} />
                    ))}
                </div>
            ))}
        </div>
    </section>
);

export default FoodMarquee;
