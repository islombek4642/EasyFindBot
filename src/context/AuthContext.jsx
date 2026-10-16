/**
 * EasyFindBot — Authentication & Session Context
 * Manages active user session, user role ('seeker' | 'employer' | 'admin'),
 * active resume, and role switching.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    if (typeof window !== 'undefined') {
      const u = window.Telegram?.WebApp?.initDataUnsafe?.user;
      if (u?.id) {
        return {
          id: u.id,
          tgId: u.id,
          first_name: u.first_name || '',
          last_name: u.last_name || '',
          firstName: u.first_name || '',
          lastName: u.last_name || '',
          username: u.username || '',
          photo_url: u.photo_url || null,
          role: 'seeker',
          language: u.language_code || 'uz',
        };
      }
      try {
        const cached = localStorage.getItem('easyfind_user');
        if (cached) return JSON.parse(cached);
      } catch (e) {}
    }
    return null;
  });
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSession = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getInitData();
      const tgUser = (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user) || {};
      const backendUser = (data && data.user) || {};

      setUser((prev) => {
        const updated = {
          ...(prev || {}),
          ...backendUser,
          first_name: backendUser.first_name || backendUser.firstName || tgUser.first_name || prev?.first_name || '',
          last_name: backendUser.last_name || backendUser.lastName || tgUser.last_name || prev?.last_name || '',
          firstName: backendUser.firstName || backendUser.first_name || tgUser.first_name || prev?.firstName || '',
          lastName: backendUser.lastName || backendUser.last_name || tgUser.last_name || prev?.lastName || '',
          username: backendUser.username || tgUser.username || prev?.username || '',
          photo_url: backendUser.photo_url || tgUser.photo_url || prev?.photo_url || null,
          role: backendUser.role || prev?.role || 'seeker',
        };
        try {
          if (updated.first_name || updated.firstName || updated.username) {
            localStorage.setItem('easyfind_user', JSON.stringify(updated));
          }
        } catch (e) {}
        return updated;
      });

      if (data && data.resume) {
        setResume(data.resume);
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
