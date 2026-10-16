/**
 * EasyFindBot — Authentication & Session Context
 * Manages active user session, user role ('seeker' | 'employer' | 'admin'),
 * active resume, and role switching.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSession = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getInitData();
      if (data && data.user) {
        setUser(data.user);
        setResume(data.resume || null);
      }
    } catch (err) {
      console.error('[AuthContext] Failed to load session:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const switchRole = useCallback(async (newRole) => {
    if (!user || user.role === newRole) return;
    try {
      setUser((prev) => ({ ...prev, role: newRole }));
      await api.updateUser({ role: newRole });
    } catch (err) {
      console.error('[AuthContext] Failed to switch role:', err);
      // Rollback on failure
      fetchSession();
    }
  }, [user, fetchSession]);

  const updateLanguage = useCallback(async (newLang) => {
    if (!user || user.language === newLang) return;
    try {
      setUser((prev) => ({ ...prev, language: newLang }));
      await api.updateUser({ language: newLang });
    } catch (err) {
      console.error('[AuthContext] Failed to update language:', err);
    }
  }, [user]);

  const value = {
    user,
    role: user?.role || 'seeker',
    resume,
    setResume,
    loading,
    error,
    switchRole,
    updateLanguage,
    refetchSession: fetchSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
