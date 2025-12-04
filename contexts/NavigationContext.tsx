import React, { createContext, useContext, useState, ReactNode } from 'react';
import { BidPackage, Contractor } from '../services/api';

type ViewType = 'packages' | 'contractors' | 'evaluate' | 'settings' | 'reports' | 'users' | 'change-password';

interface NavigationContextType {
    view: ViewType;
    setView: (view: ViewType) => void;
    selectedPackage: BidPackage | null;
    setSelectedPackage: (pkg: BidPackage | null) => void;
    selectedContractor: Contractor | null;
    setSelectedContractor: (contractor: Contractor | null) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [view, setView] = useState<ViewType>('packages');
    const [selectedPackage, setSelectedPackage] = useState<BidPackage | null>(null);
    const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null);

    return (
        <NavigationContext.Provider value={{
            view,
            setView,
            selectedPackage,
            setSelectedPackage,
            selectedContractor,
            setSelectedContractor
        }}>
            {children}
        </NavigationContext.Provider>
    );
};

export const useNavigation = () => {
    const context = useContext(NavigationContext);
    if (context === undefined) {
        throw new Error('useNavigation must be used within a NavigationProvider');
    }
    return context;
};
