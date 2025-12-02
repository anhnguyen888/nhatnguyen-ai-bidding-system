import React from 'react';

const Footer: React.FC = () => {
    return (
        <footer className="bg-white border-t border-gem-mist py-6 px-8 mt-auto">
            <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
                <p>&copy; 2025 AI Bidding System. All rights reserved.</p>
                <div className="flex gap-6 mt-4 md:mt-0">
                    <a href="#" className="hover:text-gem-blue transition-colors">Chính sách bảo mật</a>
                    <a href="#" className="hover:text-gem-blue transition-colors">Điều khoản sử dụng</a>
                    <a href="#" className="hover:text-gem-blue transition-colors">Hỗ trợ</a>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
