import axios from 'axios';

const API = import.meta.env.VITE_API_URL;

// Platform console API - the server answers only the platform owner (404 for anyone else)
export const consoleApi = axios.create({
    baseURL: `${API}/platform`,
    withCredentials: true,
});

// The console API hides itself with 404s, so a 404 on the overview / list means the session is gone
let leaving = false;
consoleApi.interceptors.response.use(undefined, async (error) => {
    if (error.response?.status === 404 && !leaving) {
        const signedIn = await axios.get(`${API}/api/auth/profile`, { withCredentials: true })
            .then((res) => res.data.user?.role === 'superadmin')
            .catch(() => false);
        if (!signedIn) {
            leaving = true;
            window.location.assign('/signin');
        }
    }
    return Promise.reject(error);
});

export const apiError = (error, fallback = 'Something went wrong') => error.response?.data?.message || fallback;

export const signOut = async () => {
    try {
        await axios.post(`${API}/api/auth/logout`, {}, { withCredentials: true });
    } finally {
        window.location.assign('/signin');
    }
};

/** Subscription states from the server, in display form */
export const STATES = {
    active: { label: 'Active', className: 'bg-emerald-50 text-emerald-800 ring-emerald-200', dot: 'bg-emerald-500' },
    expiring: { label: 'Renews soon', className: 'bg-amber-50 text-amber-800 ring-amber-200', dot: 'bg-amber-500' },
    grace: { label: 'Grace period', className: 'bg-orange-50 text-orange-800 ring-orange-200', dot: 'bg-orange-500' },
    expired: { label: 'Expired', className: 'bg-rose-50 text-rose-800 ring-rose-200', dot: 'bg-rose-500' },
    disabled: { label: 'Disabled', className: 'bg-stone-100 text-stone-700 ring-stone-300', dot: 'bg-stone-500' },
};

export const PLAN_LABELS = { trial: 'Free trial', monthly: 'Monthly', yearly: 'Yearly' };

export const formatDate = (date) => (date
    ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date))
    : '—');

export const formatDateTime = (date) => (date
    ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(date))
    : '—');

export const timeAgo = (date) => {
    if (!date) return 'Never';
    const minutes = Math.round((Date.now() - new Date(date).getTime()) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} h ago`;
    const days = Math.round(hours / 24);
    return days === 1 ? 'Yesterday' : `${days} days ago`;
};

export const daysLeftLabel = (daysLeft) => {
    if (daysLeft > 1) return `${daysLeft} days left`;
    if (daysLeft === 1) return '1 day left';
    if (daysLeft === 0) return 'Ends today';
    return `${Math.abs(daysLeft)} day${daysLeft === -1 ? '' : 's'} overdue`;
};

export const compactINR = (amount) => {
    const value = Number(amount || 0);
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2).replace(/\.?0+$/, '')}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2).replace(/\.?0+$/, '')}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1).replace(/\.0$/, '')}K`;
    return `₹${Math.round(value)}`;
};
