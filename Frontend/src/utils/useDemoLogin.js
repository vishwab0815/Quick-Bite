import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL;
const ATTEMPTS = 4;
const RETRY_MS = 4000;

/**
 * One click into the sample restaurant ("Try the demo"). A sleeping free-plan server can take
 * up to a minute to wake, so connection failures are retried quietly before showing an error.
 * `demoRole` is the role being opened ('' when idle) and `waking` is true while retrying.
 */
export function useDemoLogin({ replace = false } = {}) {
    const navigate = useNavigate();
    const [busy, setBusy] = useState({ role: '', waking: false });
    const [error, setError] = useState('');

    const openDemo = async (role) => {
        setBusy({ role, waking: false });
        setError('');
        for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
            try {
                await axios.post(`${API}/api/auth/demo`, { role }, { withCredentials: true, timeout: 60000 });
                navigate('/pos', { replace });
                return;
            } catch (err) {
                const status = err.response?.status;
                const wakingUp = !err.response || status >= 502;
                if (wakingUp && attempt < ATTEMPTS) {
                    setBusy({ role, waking: true });
                    await new Promise((resolve) => setTimeout(resolve, RETRY_MS));
                    continue;
                }
                setError(
                    status === 429 ? 'Too many demo sign-ins from this network. Please wait a few minutes and try again.'
                        : !err.response ? 'Could not reach QuickBite. Check your internet connection and try again.'
                            : err.response.data?.message || 'Could not open the demo. Please try again.'
                );
            }
        }
        setBusy({ role: '', waking: false });
    };

    return { openDemo, demoRole: busy.role, waking: busy.waking, demoError: error, clearDemoError: () => setError('') };
}
