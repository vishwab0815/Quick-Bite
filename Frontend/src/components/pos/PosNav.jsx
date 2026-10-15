import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import PropTypes from 'prop-types';
import axios from 'axios';
import { RESTAURANT } from '../../site/restaurant';
import {
    PiStorefrontDuotone, PiCookingPotDuotone, PiChartLineUpDuotone, PiBowlFoodDuotone,
    PiUsersThreeDuotone, PiTelevisionSimpleDuotone, PiSignOutBold,
} from 'react-icons/pi';

const LINKS = [
    { to: '/pos', label: 'Counter', icon: PiStorefrontDuotone, end: true },
    { to: '/pos/kitchen', label: 'Kitchen', icon: PiCookingPotDuotone },
    { to: '/pos/bills', label: 'Dashboard', icon: PiChartLineUpDuotone },
    { to: '/pos/menu', label: 'Menu', icon: PiBowlFoodDuotone, ownerOnly: true },
    { to: '/pos/staff', label: 'Staff', icon: PiUsersThreeDuotone, ownerOnly: true },
];

const signOut = async () => {
    try {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/logout`, {}, { withCredentials: true });
    } finally {
        window.location.assign('/signin');
    }
};

const roleLabel = (role) => (role === 'admin' ? 'Owner' : 'Counter staff');
const initial = (text) => String(text || '?').trim().charAt(0).toUpperCase();

/** Signed-in person: avatar that opens a small card with their details and Sign out */
const AccountMenu = ({ user, placement }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        const close = (event) => { if (!ref.current?.contains(event.target)) setOpen(false); };
        const onKey = (event) => { if (event.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                aria-label="Account"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-stone-600 to-stone-800 text-sm font-bold text-white ring-2 ring-white/10 transition hover:ring-white/30"
            >
                {initial(user.name)}
            </button>
            {open && (
                <div className={`qb-pop absolute z-50 w-60 rounded-2xl border border-line bg-white p-2 text-stone-900 shadow-[var(--shadow-lift)] ${
                    placement === 'rail' ? 'bottom-0 left-full ml-3 origin-bottom-left' : 'right-0 top-full mt-2 origin-top-right'
                }`}>
                    <div className="px-3 py-2.5">
                        <p className="truncate text-sm font-semibold">{user.name}</p>
                        <p className="truncate text-xs text-stone-500">{user.email}</p>
                        <span className="mt-2 inline-flex rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-800">{roleLabel(user.role)}</span>
                    </div>
                    <button
                        type="button"
                        onClick={signOut}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-stone-700 hover:bg-stone-100"
                    >
                        <PiSignOutBold className="text-base" /> Sign out
                    </button>
                </div>
            )}
        </div>
    );
};

AccountMenu.propTypes = {
    user: PropTypes.object.isRequired,
    placement: PropTypes.oneOf(['rail', 'top']).isRequired,
};

/**
 * Navigation for the hotel app: a slim dark rail on tablets and laptops,
 * a top bar plus bottom tabs on phones.
 */
export default function PosNav({ user, hotelName, hotelSlug }) {
    const links = LINKS.filter((link) => !link.ownerOnly || user.role === 'admin');
    const name = hotelName || RESTAURANT.name;

    return (
        <>
            {/* Tablets & laptops: side rail */}
            <nav className="hidden w-[88px] shrink-0 flex-col items-center bg-ink py-4 text-white md:flex" aria-label="Main">
                <NavLink to="/pos" end className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-saffron font-display text-xl font-extrabold text-ink shadow-lg shadow-orange-600/30" title={name}>
                    {initial(name)}
                </NavLink>
                <div className="flex flex-1 flex-col gap-1.5">
                    {links.map((link) => {
                        const Icon = link.icon;
                        return (
                            <NavLink
                                key={link.to}
                                to={link.to}
                                end={link.end}
                                className={({ isActive }) => `group flex w-[72px] flex-col items-center gap-1 rounded-2xl py-2.5 text-[11px] font-semibold transition-colors ${
                                    isActive ? 'bg-white/[0.09] text-white' : 'text-stone-400 hover:bg-white/[0.05] hover:text-white'
                                }`}
                            >
                                {({ isActive }) => (
                                    <>
                                        <Icon className={`text-[26px] transition-colors ${isActive ? 'text-saffron' : ''}`} aria-hidden="true" />
                                        {link.label}
                                    </>
                                )}
                            </NavLink>
                        );
                    })}
                </div>
                <a
                    href={`/tv/${hotelSlug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mb-3 flex w-[72px] flex-col items-center gap-1 rounded-2xl py-2.5 text-[11px] font-semibold text-stone-400 transition-colors hover:bg-white/[0.05] hover:text-white"
                >
                    <PiTelevisionSimpleDuotone className="text-[26px]" aria-hidden="true" />
                    Token TV
                </a>
                <AccountMenu user={user} placement="rail" />
            </nav>

            {/* Phones: top bar */}
            <header className="flex items-center gap-3 border-b border-line bg-white/90 px-4 py-2.5 backdrop-blur-md md:hidden">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-saffron font-display text-base font-extrabold text-ink">{initial(name)}</span>
                <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-sm font-bold">{name}</p>
                    <p className="text-xs text-stone-500">{roleLabel(user.role)}</p>
                </div>
                <a href={`/tv/${hotelSlug}`} target="_blank" rel="noreferrer" className="flex h-10 w-10 items-center justify-center rounded-xl text-xl text-stone-600 hover:bg-stone-100" aria-label="Token TV">
                    <PiTelevisionSimpleDuotone />
                </a>
                <AccountMenu user={user} placement="top" />
            </header>
        </>
    );
}

PosNav.propTypes = {
    user: PropTypes.object.isRequired,
    hotelName: PropTypes.string,
    hotelSlug: PropTypes.string,
};

/** Phones: bottom tab bar */
export function PosTabBar({ role }) {
    const links = LINKS.filter((link) => !link.ownerOnly || role === 'admin');
    return (
        <nav
            className="fixed inset-x-0 bottom-0 z-40 grid border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
            style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }}
            aria-label="Main"
        >
            {links.map((link) => {
                const Icon = link.icon;
                return (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        end={link.end}
                        className={({ isActive }) => `flex h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors ${isActive ? 'text-stone-900' : 'text-stone-400'}`}
                    >
                        {({ isActive }) => (
                            <>
                                <Icon className={`text-2xl ${isActive ? 'text-saffron' : ''}`} aria-hidden="true" />
                                {link.label}
                            </>
                        )}
                    </NavLink>
                );
            })}
        </nav>
    );
}

PosTabBar.propTypes = { role: PropTypes.string };
