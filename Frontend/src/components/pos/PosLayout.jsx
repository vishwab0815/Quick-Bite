import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { PiLockKeyDuotone, PiSparkleFill } from 'react-icons/pi';
import { Outlet, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import PosNav, { PosTabBar } from './PosNav';
import Skeleton from './Skeleton';
import { Button } from './ui';
import { PosContext } from '../../utils/posContext';
import { BLOCKED_EVENT, posApi, useStaffUser } from '../../utils/pos';
import { useCachedQuery } from '../../utils/useCachedQuery';

const fetchSettings = () => posApi.get('/settings').then((res) => res.data.settings);

/**
 * Shown instead of the counter when the platform owner has switched the hotel off or its subscription has lapsed
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
        <div className="pos-app flex h-[100dvh] items-center justify-center bg-canvas p-5">
            <div className="qb-sheet w-full max-w-md rounded-3xl border border-line bg-white p-8 text-center shadow-[var(--shadow-lift)]">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-3xl text-amber-700">
                    <PiLockKeyDuotone />
                </span>
                <h1 className="mt-5 font-display text-2xl font-bold tracking-tight">
                    {reason.code === 'SUBSCRIPTION_EXPIRED' ? 'Subscription expired' : 'Counter paused'}
                </h1>
                <p className="mt-2 text-[15px] leading-relaxed text-stone-500">{reason.message}</p>
                <p className="mt-1 text-sm text-stone-500">Your bills and menu are safe and will be here when you are back.</p>
                <Button onClick={signOut} className="mt-7">Sign out</Button>
            </div>
        </div>
    );
};

BlockedScreen.propTypes = {
    reason: PropTypes.shape({ code: PropTypes.string, message: PropTypes.string }).isRequired,
};

/**
 * Shell for all hotel screens: navigation, sign-in check and hotel settings stay mounted,
 * so switching Counter / Kitchen / Dashboard only swaps the content.
 */
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
            <div className="pos-app flex h-[100dvh] bg-canvas">
                <div className="hidden w-[88px] shrink-0 bg-ink md:block" />
                <div className="grid flex-1 auto-rows-min grid-cols-2 gap-4 p-6 sm:grid-cols-4">
                    {Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="h-40" />)}
                </div>
            </div>
        );
    }

    return (
        <PosContext.Provider value={context}>
            <div className="pos-app flex h-[100dvh] flex-col bg-canvas md:flex-row">
                <PosNav user={user} hotelName={settings.name} hotelSlug={settings.slug} />
                <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                    {settings.isDemo && (
                        <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 via-saffron to-amber-500 px-3 py-1.5 text-center text-xs font-semibold text-white">
                            <PiSparkleFill aria-hidden="true" />
                            <span className="truncate">Demo restaurant - try anything, it resets every few hours</span>
                        </div>
                    )}
                    <main className={`relative min-h-0 flex-1 ${isCounter ? 'overflow-hidden' : 'overflow-y-auto pb-20 [scrollbar-gutter:stable] md:pb-0'}`}>
                        <div key={location.pathname} className="pos-page h-full">
                            <Outlet />
                        </div>
                    </main>
                </div>
                <PosTabBar role={user.role} />
            </div>
        </PosContext.Provider>
    );
}
