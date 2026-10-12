/**
 * Dish photos for the counter and menu screens.
 * Free-licence photos from Pexels (free for commercial use, no attribution needed),
 * cropped to 4:3 and stored as WebP in /public/food.
 *
 * A dish uses the photo its owner picked (item.image), otherwise the best match for its name,
 * otherwise its category - or no photo (the screens then show a clean placeholder).
 */

export const FOOD_PHOTOS = [
    { key: 'masala-dosa', label: 'Masala dosa' },
    { key: 'rava-dosa', label: 'Plain / set dosa' },
    { key: 'cone-dosa', label: 'Ghee roast / podi dosa' },
    { key: 'uttapam', label: 'Uttapam' },
    { key: 'idli', label: 'Idli' },
    { key: 'vada', label: 'Medu vada' },
    { key: 'idli-vada', label: 'Idli vada' },
    { key: 'upma', label: 'Upma / khara bath' },
    { key: 'poha', label: 'Poha / avalakki' },
    { key: 'appam', label: 'Appam / paddu' },
    { key: 'breakfast', label: 'Breakfast combo' },
    { key: 'meals', label: 'Full meals' },
    { key: 'chapati-meal', label: 'Mini meals / chapati' },
    { key: 'thali', label: 'Non-veg meals' },
    { key: 'sambar-rice', label: 'Sambar rice / bisi bele bath' },
    { key: 'curd-rice', label: 'Curd rice' },
    { key: 'lemon-rice', label: 'Lemon rice' },
    { key: 'tamarind-rice', label: 'Tamarind rice' },
    { key: 'biryani', label: 'Biryani / pulao' },
    { key: 'parotta', label: 'Parotta / paratha' },
    { key: 'poori', label: 'Poori' },
    { key: 'kesari', label: 'Kesari / sweets' },
    { key: 'ice-cream', label: 'Ice cream' },
    { key: 'filter-coffee', label: 'Filter coffee' },
    { key: 'tea', label: 'Tea / chai' },
    { key: 'badam-milk', label: 'Badam milk' },
    { key: 'lassi', label: 'Lassi / buttermilk' },
];

const PHOTO_KEYS = new Set(FOOD_PHOTOS.map((photo) => photo.key));

// Checked in order - the most specific names first
const NAME_RULES = [
    [/masala\s*dos/, 'masala-dosa'],
    [/(ghee|paper|podi|roast|cone|butter|benne).*dos|dos\w*.*roast/, 'cone-dosa'],
    [/dos(a|ai|e)/, 'rava-dosa'],
    [/utt?h?app?am|uttappa/, 'uttapam'],
    [/idl[iy].*(vada|wada)|(vada|wada).*idl[iy]/, 'idli-vada'],
    [/idl[iy]/, 'idli'],
    [/vada|vadai|wada|bonda|bajji/, 'vada'],
    [/kesari|halwa|sheera|sweet|laddu|mysore\s*pak|jamun|barfi|payasam|kheer|jalebi/, 'kesari'],
    [/upma|uppittu|khara\s*bath|pongal/, 'upma'],
    [/poha|avalakki|aval\b/, 'poha'],
    [/appam|paniyaram|paddu/, 'appam'],
    [/biryani|pulao|pulav|fried\s*rice/, 'biryani'],
    [/curd\s*rice|thayir|mosaranna|daddojanam/, 'curd-rice'],
    [/lemon\s*rice|chitranna|elumichai/, 'lemon-rice'],
    [/tamarind|puliyo?gare|pulihora|puli\s*sadam/, 'tamarind-rice'],
    [/bisi\s*bele|sambar\s*rice|rasam\s*rice|khichdi|sambar\s*sadam/, 'sambar-rice'],
    [/(fish|chicken|mutton|non.?veg).*(meal|thali)|(meal|thali).*(fish|chicken|mutton)/, 'thali'],
    [/mini\s*meal|chapat|chapath|roti|phulka|north\s*indian/, 'chapati-meal'],
    [/meal|thali|sadya|oota/, 'meals'],
    [/par[ao]tt?h?a|porotta/, 'parotta'],
    [/poori|puri\b|bhature/, 'poori'],
    [/coffee|kaapi|kapi\b/, 'filter-coffee'],
    [/chai|\btea\b/, 'tea'],
    [/lassi|buttermilk|majjige|chaas|neer\s*mor/, 'lassi'],
    [/badam|milk|horlicks|boost/, 'badam-milk'],
    [/ice\s*cream|sundae|kulfi|falooda|gadbad/, 'ice-cream'],
    [/combo|breakfast|tiffin/, 'breakfast'],
];

const CATEGORY_RULES = [
    [/dosa/, 'rava-dosa'],
    [/sweet|dessert/, 'kesari'],
    [/rice/, 'sambar-rice'],
    [/meal|lunch|thali/, 'meals'],
    [/breakfast|tiffin/, 'breakfast'],
];

const firstMatch = (rules, text) => rules.find(([pattern]) => pattern.test(text))?.[1] || null;

/** Photo key for a dish: owner's choice, else name match, else category match, else null */
export const dishPhotoKey = (item) => {
    if (!item) return null;
    if (item.image && PHOTO_KEYS.has(item.image)) return item.image;
    return firstMatch(NAME_RULES, String(item.name || '').toLowerCase())
        || firstMatch(CATEGORY_RULES, String(item.category || '').toLowerCase());
};

export const photoUrl = (key) => (key ? `/food/${key}.webp` : null);

export const dishPhoto = (item) => photoUrl(dishPhotoKey(item));
