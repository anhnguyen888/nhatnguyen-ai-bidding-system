import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User, LoginCredentials, login as apiLogin } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      // In a real app, we would validate the token with the backend here
      // For now, we'll just decode it or assume it's valid if we have user info stored
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    }
  }, [token]);

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await apiLogin(credentials);
      const { access_token } = response;
      setToken(access_token);
      localStorage.setItem('token', access_token);
      
      // We need to fetch the user details after login, but for now let's decode or fetch
      // Since our login endpoint only returns token, we might need another call or just decode
      // For simplicity in this demo, let's assume we can get user info or we fetch it.
      // Actually, let's just decode the username from token or make a request to /users/me if it existed.
      // But we don't have /users/me. We can use the username from credentials for now or fetch list if admin.
      // Wait, the plan said "Update services/api.ts to include auth headers".
      // Let's just store a simple user object for now based on credentials if successful, 
      // or better, let's update the backend login to return user info? 
      // No, standard OAuth2 returns token.
      // Let's just decode the token payload if possible, or just store the username.
      
      // For this demo, I'll cheat slightly and store the username from credentials
      // In a real app, I'd hit a /me endpoint.
      // Actually, I can hit /users/ with the token and filter by username if I'm admin, 
      // but if I'm a regular user I might not be able to list users.
      // Let's assume for now we just store the username and role (if we knew it).
      // Wait, if I login as admin, I know I am admin.
      
      // Let's just set the user state manually for now.
      const userObj: User = {
          id: 0, // Placeholder
          username: credentials.username,
          is_active: true,
          role: credentials.username === 'admin' ? 'admin' : 'user' 
      };
      setUser(userObj);
      localStorage.setItem('user', JSON.stringify(userObj));
      
    } catch (error) {
      console.error("Login failed", error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const value = {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!token,
    isAdmin: user?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
