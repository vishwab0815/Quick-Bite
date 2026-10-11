import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { FiActivity, FiCreditCard, FiGrid, FiHome, FiLogOut, FiMenu, FiShield, FiX } from 'react-icons/fi';
import { signOut } from '../../utils/console';

const NAV = [
    { to: '/console', label: 'Overview', icon: FiGrid, end: true },
    { to: '/console/hotels', label: 'Hotels', icon: FiHome },
    { to: '/console/payments', label: 'Payments', icon: FiCreditCard },
    { to: '/console/activity', label: 'Activity log', icon: FiActivity },
];

const Sidebar = ({ user, onNavigate }) => (
    <div className="flex h-full flex-col bg-stone-950 text-stone-300">
        <div className="flex items-center gap-2.5 px-5 py-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-sm font-extrabold text-stone-950">Q</span>
            <div className="leading-tight">
                <p className="text-sm font-bold text-white">QuickBite</p>
                <p className="flex items-center gap-1 text-[11px] font-medium text-stone-500"><FiShield /> Platform console</p>
            </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2" aria-label="Console">
            {NAV.map((item) => {
                const Icon = item.icon;
                return (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        onClick={onNavigate}
                        className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                            isActive ? 'bg-white/10 text-white' : 'text-stone-400 hover:bg-white/5 hover:text-white'
                        }`}
                    >
                        <Icon className="text-base" /> {item.label}
                    </NavLink>
                );
            })}
        </nav>

        <div className="border-t border-white/10 p-3">
            <div className="flex items-center gap-3 rounded-xl px-2 py-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">
                    {user.name?.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-sm font-semibold text-white">{user.name}</p>
                    <p className="truncate text-[11px] text-stone-500">{user.email}</p>
                </div>
                <button onClick={signOut} className="rounded-lg p-2 text-stone-400 hover:bg-white/10 hover:text-white" title="Sign out" aria-label="Sign out">
                    <FiLogOut />
                </button>
            </div>
        </div>
    </div>
);

Sidebar.propTypes = {
    user: PropTypes.shape({ name: PropTypes.string, email: PropTypes.string }).isRequired,
    onNavigate: PropTypes.func,
};

/**
 * Console shell: fixed sidebar on desktop, slide-in drawer on phones
 */
export default function ConsoleLayout({ user }) {
    const [open, setOpen] = useState(false);
    const location = useLocation();

    useEffect(() => { setOpen(false); }, [location.pathname]);

    return (
        <div className="pos-app flex h-[100dvh] bg-stone-100">
            <aside className="hidden w-64 shrink-0 lg:block">
                <Sidebar user={user} />
            </aside>

            {open && (
                <div className="fixed inset-0 z-40 lg:hidden">
                    <div className="absolute inset-0 bg-stone-950/50" onClick={() => setOpen(false)} />
                    <aside className="relative h-full w-72 max-w-[85vw]">
                        <button onClick={() => setOpen(false)} className="absolute right-3 top-5 z-10 rounded-lg p-2 text-stone-400 hover:text-white" aria-label="Close menu">
                            <FiX />
                        </button>
                        <Sidebar user={user} onNavigate={() => setOpen(false)} />
                    </aside>
                </div>
            )}

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="flex items-center gap-3 border-b border-stone-200 bg-white px-4 py-3 lg:hidden">
                    <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-stone-600 hover:bg-stone-100" aria-label="Open menu">
                        <FiMenu />
                    </button>
                    <span className="text-sm font-bold">QuickBite console</span>
                </header>
                <main className="relative min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
                    <div key={location.pathname} className="pos-page mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}

ConsoleLayout.propTypes = {
    user: PropTypes.shape({ name: PropTypes.string, email: PropTypes.string }).isRequired,
};
