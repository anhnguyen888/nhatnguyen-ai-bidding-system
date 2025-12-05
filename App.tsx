import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import BidManager from './components/BidManager';
import MainLayout from './components/Layout/MainLayout';
import Login from './components/Login';
import UserManagement from './components/UserManagement';
import ChangePassword from './components/ChangePassword';
import Reports from './components/Reports'; // Added import for Reports
import { NavigationProvider, useNavigation } from './contexts/NavigationContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
    const { isAuthenticated } = useAuth();
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    return children;
};

const AppContent: React.FC = () => {
    const { view } = useNavigation();
    const { isAdmin } = useAuth();

    return (
        <MainLayout>
            {view === 'settings' ? (
                <div className="text-center py-20">
                    <h2 className="text-2xl font-bold text-gray-400">Cài đặt</h2>
                    <p className="text-gray-500 mt-2">Tính năng đang được phát triển...</p>
                </div>
            ) : view === 'reports' ? (
                <Reports />
            ) : view === 'users' ? (
                isAdmin ? <UserManagement /> : <div className="text-center py-20 text-red-500">Bạn không có quyền truy cập.</div>
            ) : view === 'change-password' ? (
                <ChangePassword />
            ) : (
                <BidManager />
            )}
        </MainLayout>
    );
};

const App: React.FC = () => {
    return (
        <Router>
            <AuthProvider>
                <NavigationProvider>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route
                            path="/"
                            element={
                                <ProtectedRoute>
                                    <AppContent />
                                </ProtectedRoute>
                            }
                        />
                    </Routes>
                </NavigationProvider>
            </AuthProvider>
        </Router>
    );
};

export default App;
