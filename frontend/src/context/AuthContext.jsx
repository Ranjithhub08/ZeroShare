import React, { createContext, useContext, useState, useCallback } from 'react';
import api from '@/services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('zs_user')); } catch { return null; }
  });

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token, user } = res.data.data;
    localStorage.setItem('zs_token', token);
    localStorage.setItem('zs_user', JSON.stringify(user));
    setUser(user);
    return user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    const { token, user } = res.data.data;
    localStorage.setItem('zs_token', token);
    localStorage.setItem('zs_user', JSON.stringify(user));
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('zs_token');
    localStorage.removeItem('zs_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      login, register, logout,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin',
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
