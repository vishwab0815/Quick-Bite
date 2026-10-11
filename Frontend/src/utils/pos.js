import axios from 'axios';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { showToast } from './toast';

// Axios instance for the counter billing (POS) API
export const posApi = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL}/pos`,
    withCredentials: true,
});

// Session ended (24h login expired or staff removed) - send the screen back to sign in once
let redirectingToSignin = false;
posApi.interceptors.response.use(undefined, (error) => {
    if (error.response?.status === 401 && !redirectingToSignin && window.location.pathname !== '/signin') {
        redirectingToSignin = true;
        showToast.error('Session expired - please sign in again');
        window.location.assign('/signin');
    }
    return Promise.reject(error);
});

export const STAFF_ROLES = ['admin', 'staff'];

export const formatINR = (amount) =>
    `₹${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Bill totals preview - mirrors Backend/utils/billing.js (the server is the source of truth)
 */
export const computeTotals = (lines, { gstScheme, gstRate, pricesIncludeGst }) => {
    const subtotal = round2(lines.reduce((sum, line) => sum + line.price * line.quantity, 0));

    let taxableAmount = subtotal;
    let cgst = 0;
    let sgst = 0;

    if (gstScheme === 'regular' && gstRate > 0) {
        if (pricesIncludeGst) {
            taxableAmount = round2((subtotal * 100) / (100 + gstRate));
            const tax = round2(subtotal - taxableAmount);
            cgst = round2(tax / 2);
            sgst = round2(tax - cgst);
        } else {
            cgst = round2((taxableAmount * gstRate) / 200);
            sgst = cgst;
        }
    }

    const gross = round2(taxableAmount + cgst + sgst);
    const total = Math.round(gross);
    return { subtotal, taxableAmount, cgst, sgst, roundOff: round2(total - gross), total };
};

/**
 * UPI deep link with the exact amount - rendered as a QR at the counter
 */
export const buildUpiLink = ({ vpa, payeeName, amount, note }) =>
    `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(payeeName)}` +
    `&am=${Number(amount).toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`;

export const isValidIndianMobile = (phone) => {
    let digits = String(phone || '').replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
    if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    return /^[6-9]\d{9}$/.test(digits);
};

export const formatDateTime = (date, timeZone = 'Asia/Kolkata') =>
    new Intl.DateTimeFormat('en-IN', {
        timeZone,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(date));

export const formatTime = (date, timeZone = 'Asia/Kolkata') =>
    new Intl.DateTimeFormat('en-IN', { timeZone, hour: '2-digit', minute: '2-digit' }).format(new Date(date));

/**
 * Today's date (YYYY-MM-DD) in the hotel's time zone
 */
export const todayInTimeZone = (timeZone = 'Asia/Kolkata') =>
    new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

export const receiptUrl = (settings, publicId) =>
    `${(settings?.receiptBaseUrl || window.location.origin).replace(/\/+$/, '')}/receipt/${publicId}`;

// localStorage can be unavailable (private mode) - device preferences are best-effort
export const loadPref = (key, fallback) => {
    try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : JSON.parse(value);
    } catch {
        return fallback;
    }
};

export const savePref = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // ignore
    }
};

/**
 * Short beep for new kitchen tickets / ready tokens
 */
export const playBeep = (frequency = 880, duration = 0.15) => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContext();
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start();
        oscillator.stop(ctx.currentTime + duration);
        oscillator.onended = () => ctx.close();
    } catch {
        // audio not available
    }
};

/**
 * Ensures the current user has one of the allowed roles (default: counter staff or admin);
 * redirects otherwise
 */
export const useStaffUser = (allowedRoles = STAFF_ROLES) => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const rolesKey = allowedRoles.join(',');

    useEffect(() => {
        let active = true;
        const roles = rolesKey.split(',');

        axios.get(`${import.meta.env.VITE_API_URL}/api/auth/profile`, { withCredentials: true })
            .then((res) => {
                if (!active) return;
                const role = res.data.user?.role;
                if (!roles.includes(role)) {
                    showToast.error(roles.includes('staff') ? 'Counter access is for staff only' : 'Only the owner (admin) can open this page');
                    navigate(STAFF_ROLES.includes(role) ? '/pos' : '/home');
                    return;
                }
                setUser(res.data.user);
            })
            .catch(() => {
                if (!active) return;
                showToast.error('Please sign in with your staff account');
                navigate('/signin');
            });

        return () => { active = false; };
    }, [navigate, rolesKey]);

    return user;
};

/**
 * Loads POS settings (hotel details, GST, UPI, counters)
 */
export const usePosSettings = (enabled = true) => {
    const [settings, setSettings] = useState(null);

    useEffect(() => {
        if (!enabled) return;
        posApi.get('/settings')
            .then((res) => setSettings(res.data.settings))
            .catch(() => showToast.error('Failed to load counter settings'));
    }, [enabled]);

    return settings;
};
