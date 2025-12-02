import React from 'react';

const Header: React.FC = () => {
    return (
        <header className="bg-white border-b border-gem-mist h-16 flex items-center justify-between px-6 sticky top-0 z-20 shadow-sm">
            <div className="flex items-center gap-4">
                <div className="text-gem-blue font-bold text-2xl tracking-tight">
                    AI Bidding
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="relative">
                    <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
                    <button className="p-2 text-gem-offwhite hover:bg-gem-mist/20 rounded-full transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                    </button>
                </div>
                <div className="flex items-center gap-3 pl-4 border-l border-gem-mist">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-semibold text-gem-offwhite">Admin User</p>
                        <p className="text-xs text-gray-500">Quản trị viên</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gem-blue text-white flex items-center justify-center font-bold text-lg">
                        A
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
