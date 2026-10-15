/**
 * The restaurant this website is for. Address, phone and hours are not written here:
 * they come live from the restaurant's own QuickBite settings (owner → settings), so the
 * site never shows details the owner has not entered.
 *
 * VITE_RESTAURANT_SLUG picks the restaurant's QuickBite record (its token TV address).
 */
const slug = String(import.meta.env.VITE_RESTAURANT_SLUG || '').trim();

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
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Udupi Sri Krishna Naivedya, Yelahanka, Bengaluru')}`,
};

/**
 * Public QuickBite endpoints for this restaurant (menu, contact details, live tokens).
 * Null until VITE_RESTAURANT_SLUG is set, so the site never shows another restaurant's data.
 */
export const publicPaths = slug
    ? { info: `/public/${encodeURIComponent(slug)}/info`, display: `/public/${encodeURIComponent(slug)}/display` }
    : null;
