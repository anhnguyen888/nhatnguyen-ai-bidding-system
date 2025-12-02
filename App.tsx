/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import BidManager from './components/BidManager';
import MainLayout from './components/Layout/MainLayout';
import { NavigationProvider, useNavigation } from './contexts/NavigationContext';

const AppContent: React.FC = () => {
    const { view } = useNavigation();

    return (
        <MainLayout>
            {view === 'settings' ? (
                <div className="text-center py-20">
                    <h2 className="text-2xl font-bold text-gray-400">Cài đặt</h2>
                    <p className="text-gray-500 mt-2">Tính năng đang được phát triển...</p>
                </div>
            ) : view === 'reports' ? (
                <div className="text-center py-20">
                    <h2 className="text-2xl font-bold text-gray-400">Báo cáo</h2>
                    <p className="text-gray-500 mt-2">Tính năng đang được phát triển...</p>
                </div>
            ) : (
                <BidManager />
            )}
        </MainLayout>
    );
};

const App: React.FC = () => {
    return (
        <NavigationProvider>
            <AppContent />
        </NavigationProvider>
    );
};

export default App;
