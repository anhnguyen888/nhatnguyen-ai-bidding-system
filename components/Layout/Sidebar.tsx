import React from 'react';
import { useNavigation } from '../../contexts/NavigationContext';
import HomeIcon from '../icons/HomeIcon';
import BriefcaseIcon from '../icons/BriefcaseIcon';
import SettingsIcon from '../icons/SettingsIcon';
import ChartIcon from '../icons/ChartIcon';

const Sidebar: React.FC = () => {
    const { view, setView } = useNavigation();

    const menuItems = [
        { id: 'packages', label: 'Gói thầu', icon: <BriefcaseIcon /> },
        { id: 'reports', label: 'Báo cáo', icon: <ChartIcon /> },
        { id: 'settings', label: 'Cài đặt', icon: <SettingsIcon /> },
    ];

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
            

        </aside>
    );
};

export default Sidebar;
