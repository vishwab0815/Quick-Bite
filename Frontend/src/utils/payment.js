/* Small helpers for the UPI payment screens */

/** UPI apps offered on a phone. Shown by name with a plain coloured initial - no brand logos. */
export const UPI_APPS = [
    { id: 'phonepe', name: 'PhonePe', color: '#5f259f' },
    { id: 'gpay', name: 'Google Pay', color: '#1a73e8' },
    { id: 'paytm', name: 'Paytm', color: '#00a3e0' },
    { id: 'bhim', name: 'BHIM', color: '#0f766e' },
];

export const appName = (id) => UPI_APPS.find((app) => app.id === id)?.name;

/** "Udupi Sri Krishna Naivedya" -> "US" */
export const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase();

/** "₹190" with the paise only when there are any */
export const rupees = (amount) => `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: Number(amount) % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

/** mm:ss left until a time */
export const timeLeft = (until, now) => {
    const seconds = Math.max(0, Math.round((new Date(until).getTime() - now) / 1000));
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};
