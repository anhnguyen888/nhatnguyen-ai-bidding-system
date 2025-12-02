import React, { ReactNode } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';

interface MainLayoutProps {
    children: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    return (
        <div className="min-h-screen bg-gem-onyx flex flex-col font-sans">
            <Header />
            <div className="flex flex-1">
                <Sidebar />
                <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6 md:p-8">
                        {children}
                    </div>
                    <Footer />
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
