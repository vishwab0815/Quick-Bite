import { createContext, useContext } from 'react';

/**
 * Signed-in staff user + hotel settings, loaded once by the POS layout
 * and shared by every counter screen (no reload when switching tabs)
 */
export const PosContext = createContext(null);

export const usePos = () => {
    const value = useContext(PosContext);
    if (!value) throw new Error('usePos must be used inside the POS layout');
    return value;
};
