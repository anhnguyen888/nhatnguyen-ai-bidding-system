import React from 'react';
import { useNavigation } from '../../contexts/NavigationContext';
import HomeIcon from '../icons/HomeIcon';
import BriefcaseIcon from '../icons/BriefcaseIcon';
import SettingsIcon from '../icons/SettingsIcon';
import ChartIcon from '../icons/ChartIcon';
import UserIcon from '../icons/UserIcon';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar: React.FC = () => {
    const { view, setView } = useNavigation();
    const { isAdmin, logout } = useAuth();

    const menuItems = [
        { id: 'packages', label: 'Gói thầu', icon: <BriefcaseIcon /> },
        { id: 'reports', label: 'Báo cáo', icon: <ChartIcon /> },
        { id: 'settings', label: 'Cài đặt', icon: <SettingsIcon /> },
    ];

    if (isAdmin) {
        menuItems.push({ id: 'users', label: 'Người dùng', icon: <UserIcon /> });
    }

    return (
        <aside className="w-64 bg-gem-offwhite text-white flex-shrink-0 hidden md:flex flex-col h-[calc(100vh-4rem)] sticky top-16">
            <div className="p-6">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Menu Chính</p>
                <nav className="space-y-2">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setView(item.id as any)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                                view === item.id || (view === 'contractors' && item.id === 'packages') || (view === 'evaluate' && item.id === 'packages')
                                    ? 'bg-gem-blue text-white shadow-lg shadow-gem-blue/30'
                                    : 'text-gray-400 hover:bg-white/10 hover:text-white'
                            }`}
                        >
                            {item.icon}
                            <span className="font-medium">{item.label}</span>
                        </button>
                    ))}
                </nav>
            </div>
            
            <div className="p-4 border-t border-gray-700 space-y-2">
                <button
                    onClick={() => setView('change-password')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                        view === 'change-password'
                            ? 'bg-gem-blue text-white shadow-lg shadow-gem-blue/30'
                            : 'text-gray-400 hover:bg-white/10 hover:text-white'
                    }`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    <span className="font-medium">Đổi mật khẩu</span>
                </button>
                <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-white/10 hover:text-red-300 transition-all duration-200"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="font-medium">Đăng xuất</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
