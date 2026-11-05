import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

export interface IUser {
  id: string;
  username: string;
  fullName: string;
  role: 'admin' | 'teacher' | 'principal';
  department: string;
  phone?: string;
  assignedClasses?: any[];
}

interface AuthContextType {
  user: IUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isTeacher: boolean;
  isPrincipal: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(() => {
    const saved = localStorage.getItem('gdc_auth_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.get('/auth/me');
        if (response.data.success && response.data.user) {
          setUser(response.data.user);
          localStorage.setItem('gdc_auth_user', JSON.stringify(response.data.user));
        }
      } catch {
        setUser(null);
        localStorage.removeItem('gdc_auth_user');
        localStorage.removeItem('gdc_auth_token');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    const response = await api.post('/auth/login', { username, password });
    if (response.data.success && response.data.user) {
      setUser(response.data.user);
      localStorage.setItem('gdc_auth_user', JSON.stringify(response.data.user));
      if (response.data.token) {
        localStorage.setItem('gdc_auth_token', response.data.token);
      }
      return true;
    }
    return false;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error(e);
    } finally {
      setUser(null);
      localStorage.removeItem('gdc_auth_user');
      localStorage.removeItem('gdc_auth_token');
      window.location.href = '/login';
    }
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'principal';
  const isTeacher = user?.role === 'teacher';
  const isPrincipal = user?.role === 'principal';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAdmin,
        isTeacher,
        isPrincipal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
