import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import PropTypes from 'prop-types';
import PosLayout from '../../components/pos/PosLayout';
import PosCounter from './PosCounter';
import KitchenScreen from './KitchenScreen';
import PosBills from './PosBills';
import PosMenu from './PosMenu';
import PosStaff from './PosStaff';
import TokenDisplay from './TokenDisplay';
import { usePos } from '../../utils/posContext';
import { showToast } from '../../utils/toast';

const AdminOnly = ({ children }) => {
    const { user } = usePos();
    const allowed = user.role === 'admin';

    useEffect(() => {
        if (!allowed) showToast.error('Only the owner (admin) can open this page');
    }, [allowed]);

    return allowed ? children : <Navigate to="/pos" replace />;
};

AdminOnly.propTypes = {
    children: PropTypes.node.isRequired,
};

/**
 * All counter screens in one bundle, so switching tabs never waits for code to load
 */
export default function PosApp() {
    return (
        <Routes>
            {/* Public token TV - no login, no header */}
            <Route path="display" element={<TokenDisplay />} />

            <Route element={<PosLayout />}>
                <Route index element={<PosCounter />} />
                <Route path="kitchen" element={<KitchenScreen />} />
                <Route path="bills" element={<PosBills />} />
                <Route path="menu" element={<AdminOnly><PosMenu /></AdminOnly>} />
                <Route path="staff" element={<AdminOnly><PosStaff /></AdminOnly>} />
                <Route path="*" element={<Navigate to="/pos" replace />} />
            </Route>
        </Routes>
    );
}
