import { NavLink, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import axios from 'axios';
import { FiShoppingBag, FiMonitor, FiBarChart2, FiTv, FiLogOut, FiList, FiUsers } from 'react-icons/fi';

const links = [
    { to: '/pos', label: 'Counter', icon: FiShoppingBag, end: true },
    { to: '/pos/kitchen', label: 'Kitchen', icon: FiMonitor },
    { to: '/pos/bills', label: 'Dashboard', icon: FiBarChart2 },
    { to: '/pos/menu', label: 'Menu', icon: FiList, adminOnly: true },
    { to: '/pos/staff', label: 'Staff', icon: FiUsers, adminOnly: true },
];

const navClass = ({ isActive }) =>
    `flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold transition-colors md:px-4 ${
        isActive ? 'bg-stone-900 text-white shadow-sm' : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'
    }`;

const PosHeader = ({ user, hotelName, hotelSlug }) => {
    const navigate = useNavigate();
    const name = hotelName || 'QuickBite';

    const handleLogout = async () => {
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/logout`, {}, { withCredentials: true });
        } finally {
            navigate('/signin');
        }
    };

    return (
        <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-white/85 backdrop-blur-md">
            <div className="flex items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-5">
                <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 text-sm font-extrabold text-white shadow-sm">
                        {name.trim().charAt(0).toUpperCase()}
                    </span>
                    <div className="hidden min-w-0 leading-tight lg:block">
                        <p className="max-w-[220px] truncate text-sm font-bold">{name}</p>
                        <p className="text-xs font-medium text-stone-400">Billing counter</p>
                    </div>
                </div>

                <nav className="flex flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none]">
                    {links.filter((link) => !link.adminOnly || user?.role === 'admin').map((link) => {
                        const Icon = link.icon;
                        return (
                            <NavLink key={link.to} to={link.to} end={link.end} className={navClass} title={link.label}>
                                <Icon className="text-base" />
                                <span className="hidden sm:inline">{link.label}</span>
                            </NavLink>
                        );
                    })}
                    <a
                        href={`/tv/${hotelSlug}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Token TV"
                        className="flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold text-stone-500 hover:bg-stone-100 hover:text-stone-900 md:px-4"
                    >
                        <FiTv className="text-base" />
                        <span className="hidden sm:inline">Token TV</span>
                    </a>
                </nav>

                <div className="flex items-center gap-1">
                    <span
                        className="hidden h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-xs font-bold text-stone-600 md:flex"
                        title={user?.name}
                    >
                        {user?.name?.charAt(0).toUpperCase()}
                    </span>
                    <button
                        onClick={handleLogout}
                        className="rounded-full p-2.5 text-stone-500 hover:bg-stone-100 hover:text-stone-900"
                        title="Sign out"
                    >
                        <FiLogOut />
                    </button>
                </div>
            </div>
        </header>
    );
};

PosHeader.propTypes = {
    user: PropTypes.object,
    hotelName: PropTypes.string,
    hotelSlug: PropTypes.string,
};

export default PosHeader;
