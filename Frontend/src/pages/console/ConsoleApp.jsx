import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ConsoleLayout from '../../components/console/ConsoleLayout';
import Overview from './Overview';
import Hotels from './Hotels';
import HotelDetail from './HotelDetail';
import Payments from './Payments';
import Activity from './Activity';
import WhatsappSettings from './WhatsappSettings';
import { RESTAURANT } from '../../site/restaurant';

/**
 * Platform owner console. Only the platform owner gets past the sign-in check; everyone else
 * is sent to the sign-in page (and the server refuses the console API to them anyway).
 */
export default function ConsoleApp() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    useEffect(() => {
        document.title = `Console · ${RESTAURANT.word}`;
        let active = true;
        axios.get(`${import.meta.env.VITE_API_URL}/api/auth/profile`, { withCredentials: true })
            .then((res) => {
                if (!active) return;
                if (res.data.user?.role !== 'superadmin') {
                    navigate(res.data.user ? '/pos' : '/signin', { replace: true });
                    return;
                }
                setUser(res.data.user);
            })
            .catch(() => { if (active) navigate('/signin', { replace: true }); });
        return () => { active = false; };
    }, [navigate]);

    if (!user) {
        return (
            <div className="flex h-[100dvh] items-center justify-center bg-stone-100">
                <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-stone-900 border-t-transparent" />
            </div>
        );
    }

    return (
        <Routes>
            <Route element={<ConsoleLayout user={user} />}>
                <Route index element={<Overview />} />
                <Route path="hotels" element={<Hotels />} />
                <Route path="hotels/:id" element={<HotelDetail />} />
                <Route path="payments" element={<Payments />} />
                <Route path="whatsapp" element={<WhatsappSettings />} />
                <Route path="activity" element={<Activity />} />
                <Route path="*" element={<Navigate to="/console" replace />} />
            </Route>
        </Routes>
    );
}
