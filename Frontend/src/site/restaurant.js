/**
 * The restaurant this website is for. Address, phone and hours are not written here:
 * they come live from the restaurant's own settings in the billing system, so the
 * site never shows details the owner has not entered.
 *
 * The site belongs to this one restaurant, so its record (token TV address /tv/<slug>) is
 * built in. VITE_RESTAURANT_SLUG can still point a build at another record, e.g. for testing.
 */
const DEFAULT_SLUG = 'udupi-sri-krishna-naivedya';
const slug = String(import.meta.env.VITE_RESTAURANT_SLUG || DEFAULT_SLUG).trim();

export const RESTAURANT = {
    name: 'Udupi Sri Krishna Naivedya',
    nameKn: 'ಉಡುಪಿ ಶ್ರೀ ಕೃಷ್ಣ ನೈವೇದ್ಯ',
    lead: 'Udupi Sri Krishna',
    leadKn: 'ಉಡುಪಿ ಶ್ರೀ ಕೃಷ್ಣ',
    word: 'Naivedya',
    wordKn: 'ನೈವೇದ್ಯ',
    area: 'Yelahanka',
    city: 'Bengaluru',
    slug,
    // The restaurant's website (the root of the site is the QuickBite product page)
    path: '/naivedya',
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Udupi Sri Krishna Naivedya, Yelahanka, Bengaluru')}`,
};

/**
 * Google Maps links for the restaurant. The owner's address (from settings) makes the search
 * exact; until then the name and area are used.
 */
export const mapLinks = (address) => {
    const place = `${RESTAURANT.name}, ${address || `${RESTAURANT.area}, ${RESTAURANT.city}`}`;
    const query = encodeURIComponent(place);
    return {
        place,
        open: `https://www.google.com/maps/search/?api=1&query=${query}`,
        directions: `https://www.google.com/maps/dir/?api=1&destination=${query}`,
        embed: `https://www.google.com/maps?q=${query}&z=16&output=embed`,
    };
};

/**
 * Public endpoints for this restaurant (menu, contact details, live tokens).
 * Until that record exists the requests simply find nothing and the site shows its own story only.
 */
export const publicPaths = slug
    ? { info: `/public/${encodeURIComponent(slug)}/info`, display: `/public/${encodeURIComponent(slug)}/display` }
    : null;
