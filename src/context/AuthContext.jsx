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
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash);
        const uid = urlParams.get('uid') || hashParams.get('uid');
        const fn = urlParams.get('first_name') || hashParams.get('first_name');
        const ln = urlParams.get('last_name') || hashParams.get('last_name');
        const un = urlParams.get('username') || hashParams.get('username');
        if (fn || un || uid) {
          return {
            id: uid ? Number(uid) : 99887766,
            tgId: uid ? Number(uid) : 99887766,
            first_name: fn ? decodeURIComponent(fn) : '',
            last_name: ln ? decodeURIComponent(ln) : '',
            firstName: fn ? decodeURIComponent(fn) : '',
            lastName: ln ? decodeURIComponent(ln) : '',
            username: un ? decodeURIComponent(un) : '',
            photo_url: null,
            role: 'seeker',
            language: 'uz',
          };
        }
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
      let tgUser = (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user) || {};
      if (!tgUser.id && typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) {
        try {
          const initParams = new URLSearchParams(window.Telegram.WebApp.initData);
          const uRaw = initParams.get('user');
          if (uRaw) tgUser = JSON.parse(uRaw);
        } catch (e) {}
      }
      const backendUser = (data && data.user) || {};
      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const urlFn = urlParams?.get('first_name') ? decodeURIComponent(urlParams.get('first_name')) : '';
      const urlLn = urlParams?.get('last_name') ? decodeURIComponent(urlParams.get('last_name')) : '';
      const urlUn = urlParams?.get('username') ? decodeURIComponent(urlParams.get('username')) : '';

      setUser((prev) => {
        const fn = backendUser.first_name || backendUser.firstName || tgUser.first_name || urlFn || prev?.first_name || prev?.firstName || '';
        const ln = backendUser.last_name || backendUser.lastName || tgUser.last_name || urlLn || prev?.last_name || prev?.lastName || '';
        const un = backendUser.username || tgUser.username || urlUn || prev?.username || '';
        const photo = backendUser.photo_url || tgUser.photo_url || prev?.photo_url || null;

        const updated = {
          ...(prev || {}),
          ...backendUser,
          first_name: fn,
          last_name: ln,
          firstName: fn,
          lastName: ln,
          username: un,
          photo_url: photo,
          role: backendUser.role || prev?.role || 'seeker',
        };
        try {
          if (updated.first_name || updated.firstName || updated.username) {
            localStorage.setItem('easyfind_user', JSON.stringify(updated));
          }
        } catch (e) {}
        return updated;
      });

      if (data && (data.resume || data.hasResume)) {
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
