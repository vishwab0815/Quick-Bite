// "Book a demo" opens a WhatsApp chat with QuickBite sales (VITE_SALES_WHATSAPP, e.g. 919876543210).
// Without it the button scrolls to the questions on the landing page.
const salesNumber = String(import.meta.env.VITE_SALES_WHATSAPP || '').replace(/\D/g, '');

export const DEMO_MESSAGE = 'Hi! I would like a QuickBite demo for my restaurant.';

export const demoHref = salesNumber
    ? `https://wa.me/${salesNumber}?text=${encodeURIComponent(DEMO_MESSAGE)}`
    : '/#faq';

export const demoIsExternal = Boolean(salesNumber);
