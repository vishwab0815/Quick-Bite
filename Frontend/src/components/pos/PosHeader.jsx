import { NavLink, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import axios from 'axios';
import { FiShoppingBag, FiMonitor, FiFileText, FiTv, FiLogOut, FiHome, FiList, FiUsers } from 'react-icons/fi';

const links = [
    { to: '/pos', label: 'Counter', icon: FiShoppingBag, end: true },
    { to: '/pos/kitchen', label: 'Kitchen', icon: FiMonitor },
    { to: '/pos/bills', label: "Today's Bills", icon: FiFileText },
    { to: '/pos/menu', label: 'Menu', icon: FiList, adminOnly: true },
    { to: '/pos/staff', label: 'Staff', icon: FiUsers, adminOnly: true },
];

const PosHeader = ({ user, hotelName }) => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/logout`, {}, { withCredentials: true });
        } finally {
            navigate('/signin');
        }
    };

    return (
        <header className="sticky top-0 z-40 bg-gray-900 text-white shadow-lg">
            <div className="flex items-center gap-2 px-3 py-2 sm:px-4">
                <div className="mr-2 flex items-center gap-2">
                    <span className="rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 px-2 py-1 text-sm font-black">QB</span>
                    <span className="hidden font-bold sm:inline">{hotelName || 'QuickBite'}</span>
                </div>

                <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
                    {links.filter((link) => !link.adminOnly || user?.role === 'admin').map((link) => {
                        const Icon = link.icon;
                        return (
                            <NavLink
                                key={link.to}
                                to={link.to}
                                end={link.end}
                                className={({ isActive }) =>
                                    `flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                                        isActive ? 'bg-gradient-to-r from-orange-500 to-pink-500' : 'text-gray-300 hover:bg-gray-800'
                                    }`
                                }
                            >
                                <Icon /> {link.label}
                            </NavLink>
                        );
                    })}
                    <a
                        href="/pos/display"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold text-gray-300 hover:bg-gray-800"
                    >
                        <FiTv /> Token TV
                    </a>
                </nav>

                <div className="flex items-center gap-1">
                    {user?.role === 'admin' && (
                        <button
                            onClick={() => navigate('/home')}
                            className="rounded-lg p-2 text-gray-300 hover:bg-gray-800"
                            title="Back to website"
                        >
                            <FiHome />
                        </button>
                    )}
                    <span className="hidden text-sm text-gray-300 md:inline">{user?.name}</span>
                    <button
                        onClick={handleLogout}
                        className="rounded-lg p-2 text-gray-300 hover:bg-gray-800"
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
};

export default PosHeader;
