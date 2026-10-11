import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { FiLock } from 'react-icons/fi';
import { Outlet, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import PosHeader from './PosHeader';
import Skeleton from './Skeleton';
import { PosContext } from '../../utils/posContext';
import { BLOCKED_EVENT, posApi, useStaffUser } from '../../utils/pos';
import { useCachedQuery } from '../../utils/useCachedQuery';

const fetchSettings = () => posApi.get('/settings').then((res) => res.data.settings);

/**
 * Shell for all counter screens: the header, sign-in check and hotel settings
 * stay mounted, so switching Counter / Kitchen / Dashboard only swaps the content.
 */
/**
 * Shown instead of the counter when QuickBite has switched the hotel off or its subscription has lapsed
 */
const BlockedScreen = ({ reason }) => {
    const signOut = async () => {
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/logout`, {}, { withCredentials: true });
        } finally {
            window.location.assign('/signin');
        }
    };

    return (
        <div className="pos-app flex h-[100dvh] items-center justify-center bg-stone-100 p-5">
            <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-stone-200">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-2xl text-amber-700">
                    <FiLock />
                </span>
                <h1 className="mt-5 text-xl font-bold">
                    {reason.code === 'SUBSCRIPTION_EXPIRED' ? 'Subscription expired' : 'Counter paused'}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-stone-500">{reason.message}</p>
                <p className="mt-1 text-sm text-stone-500">Your bills and menu are safe and will be here when you are back.</p>
                <button onClick={signOut} className="mt-6 rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-stone-700">
                    Sign out
                </button>
            </div>
        </div>
    );
};

BlockedScreen.propTypes = {
    reason: PropTypes.shape({ code: PropTypes.string, message: PropTypes.string }).isRequired,
};

export default function PosLayout() {
    const user = useStaffUser();
    const [blocked, setBlocked] = useState(null);

    useEffect(() => {
        const onBlocked = (event) => setBlocked(event.detail);
        window.addEventListener(BLOCKED_EVENT, onBlocked);
        return () => window.removeEventListener(BLOCKED_EVENT, onBlocked);
    }, []);
    const { data: settings } = useCachedQuery(user ? 'settings' : null, fetchSettings, { staleTime: 5 * 60 * 1000 });
    const location = useLocation();
    const context = useMemo(() => ({ user, settings }), [user, settings]);

    // The counter fills the screen; every other screen scrolls (with a stable gutter so nothing shifts).
    // `relative` makes <main> the containing block, so absolutely positioned bits inside it
    // (e.g. screen-reader-only labels) can never stretch the page and add a second scrollbar.
    const isCounter = location.pathname === '/pos';

    if (blocked) return <BlockedScreen reason={blocked} />;

    if (!user || !settings) {
        return (
            <div className="pos-app flex h-[100dvh] flex-col bg-stone-100">
                <div className="h-14 border-b border-stone-200/80 bg-white" />
                <div className="grid flex-1 grid-cols-2 gap-3 p-5 sm:grid-cols-4">
                    {Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="h-24" />)}
                </div>
            </div>
        );
    }

    return (
        <PosContext.Provider value={context}>
            <div className="pos-app flex h-[100dvh] flex-col bg-stone-100">
                <PosHeader user={user} hotelName={settings.name} hotelSlug={settings.slug} />
                <main className={`relative min-h-0 flex-1 ${isCounter ? 'overflow-hidden' : 'overflow-y-auto [scrollbar-gutter:stable]'}`}>
                    <div key={location.pathname} className="pos-page h-full">
                        <Outlet />
                    </div>
                </main>
            </div>
        </PosContext.Provider>
    );
}
