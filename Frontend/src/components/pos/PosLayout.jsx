import { useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import PosHeader from './PosHeader';
import Skeleton from './Skeleton';
import { PosContext } from '../../utils/posContext';
import { posApi, useStaffUser } from '../../utils/pos';
import { useCachedQuery } from '../../utils/useCachedQuery';

const fetchSettings = () => posApi.get('/settings').then((res) => res.data.settings);

/**
 * Shell for all counter screens: the header, sign-in check and hotel settings
 * stay mounted, so switching Counter / Kitchen / Dashboard only swaps the content.
 */
export default function PosLayout() {
    const user = useStaffUser();
    const { data: settings } = useCachedQuery(user ? 'settings' : null, fetchSettings, { staleTime: 5 * 60 * 1000 });
    const location = useLocation();
    const context = useMemo(() => ({ user, settings }), [user, settings]);

    // The counter fills the screen; every other screen scrolls (with a stable gutter so nothing shifts)
    const isCounter = location.pathname === '/pos';

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
                <PosHeader user={user} hotelName={settings.name} />
                <main className={`min-h-0 flex-1 ${isCounter ? 'overflow-hidden' : 'overflow-y-auto [scrollbar-gutter:stable]'}`}>
                    <div key={location.pathname} className="pos-page h-full">
                        <Outlet />
                    </div>
                </main>
            </div>
        </PosContext.Provider>
    );
}
