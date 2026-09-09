import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const AUTH_KEY = 'MEGATHON_ADMIN_AUTH_TOKEN';
// Default Admin Credentials
export const DEFAULT_ADMIN_USER = 'admin';
export const DEFAULT_ADMIN_PASS = 'megathon2026';

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      const stored = localStorage.getItem(AUTH_KEY);
      if (!stored) return false;
      const parsed = JSON.parse(stored);
      return parsed && parsed.authenticated === true;
    } catch {
      return false;
    }
  });

  const [adminUser, setAdminUser] = useState(() => {
    try {
      const stored = localStorage.getItem(AUTH_KEY);
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      return parsed.user || 'admin';
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === AUTH_KEY) {
        if (!e.newValue) {
          setIsAuthenticated(false);
          setAdminUser(null);
        } else {
          try {
            const parsed = JSON.parse(e.newValue);
            setIsAuthenticated(parsed.authenticated === true);
            setAdminUser(parsed.user || 'admin');
          } catch {
            setIsAuthenticated(false);
          }
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const login = (username, password) => {
    // Validate credentials (case insensitive for username)
    if (username.trim().toLowerCase() === DEFAULT_ADMIN_USER.toLowerCase() && password === DEFAULT_ADMIN_PASS) {
      const authData = {
        authenticated: true,
        user: username.trim(),
        loginTime: Date.now()
      };
      localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
      setIsAuthenticated(true);
      setAdminUser(username.trim());
      return { success: true };
    }
    return { success: false, error: 'Invalid Admin ID or Password' };
  };

  const logout = () => {
    localStorage.removeItem(AUTH_KEY);
    setIsAuthenticated(false);
    setAdminUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, adminUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
