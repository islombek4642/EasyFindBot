/**
 * EasyFindBot — User Profile & Role Dashboard
 */

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useAuth } from '../../hooks/useAuth.js';
import { useTheme } from '../../hooks/useTheme.js';
import { useTranslation } from '../../locales/index.jsx';
import { Badge, Button } from '../../components/common/index.js';
import { EmployerVacanciesModal } from './EmployerVacanciesModal.jsx';
import { VacancyApplicantsModal } from './VacancyApplicantsModal.jsx';
import { SeekerApplicationsModal } from './SeekerApplicationsModal.jsx';
import { SubscriptionsModal } from './SubscriptionsModal.jsx';
import { CreateResumeModal } from '../resumes/CreateResumeModal.jsx';

export function ProfileView({ initialModal = null, onClearInitialModal = null }) {
  const { user, role, resume, switchRole, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t } = useTranslation();

  // Modals state
  const [showEmployerVacancies, setShowEmployerVacancies] = useState(false);
  const [selectedVacancyForApplicants, setSelectedVacancyForApplicants] = useState(null);
  const [showSeekerApplications, setShowSeekerApplications] = useState(false);
  const [showSubscriptions, setShowSubscriptions] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);

  // Deep Link Modal Handler
  useEffect(() => {
    if (initialModal === 'my_applications') {
      setShowSeekerApplications(true);
      if (onClearInitialModal) onClearInitialModal();
    } else if (initialModal === 'my_vacancies') {
      setShowEmployerVacancies(true);
      if (onClearInitialModal) onClearInitialModal();
    }
  }, [initialModal, onClearInitialModal]);

  const isEmployer = role === 'employer';

  const handleRoleSelect = (targetRole) => {
    if (role === targetRole) return;
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      try {
        window.Telegram.WebApp.HapticFeedback.selectionChanged();
      } catch (err) {}
    }
    switchRole(targetRole);
  };

  const tgUser = typeof window !== 'undefined' ? window.Telegram?.WebApp?.initDataUnsafe?.user : null;

  let cachedUser = null;
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('easyfind_user') : null;
    if (raw) cachedUser = JSON.parse(raw);
  } catch {}

  const displayName = (() => {
    // 1. From context user state
    const userFull = `${user?.first_name || user?.firstName || ''} ${user?.last_name || user?.lastName || ''}`.trim();
    if (userFull) return userFull;
    if (user?.username) return `@${user.username}`;

    // 2. From Telegram WebApp directly
    if (tgUser) {
      const tgFull = `${tgUser.first_name || ''} ${tgUser.last_name || ''}`.trim();
      if (tgFull) return tgFull;
      if (tgUser.username) return `@${tgUser.username}`;
    }

    // 3. From cached user in localStorage
    if (cachedUser) {
      const cFull = `${cachedUser.first_name || cachedUser.firstName || ''} ${cachedUser.last_name || cachedUser.lastName || ''}`.trim();
      if (cFull) return cFull;
      if (cachedUser.username) return `@${cachedUser.username}`;
    }

    // 4. From URL search params
    if (typeof window !== 'undefined') {
      try {
        const p = new URLSearchParams(window.location.search);
        const fn = p.get('first_name');
        const ln = p.get('last_name');
        const un = p.get('username');
        const uFull = `${fn ? decodeURIComponent(fn) : ''} ${ln ? decodeURIComponent(ln) : ''}`.trim();
        if (uFull) return uFull;
        if (un) return `@${decodeURIComponent(un)}`;
      } catch {}
    }

    return isEmployer ? t('profile.role_employer') : t('profile.role_seeker');
  })();

  const displayUsername = user?.username || tgUser?.username || cachedUser?.username || '';
  const displayPhoto = user?.photo_url || tgUser?.photo_url || cachedUser?.photo_url || null;

  return (
    <div className="page-content">
      {/* User Header Profile Card */}
      <div
        className="glass-card"
        style={{
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        {loading && !user ? (
          <>
            <div
              className="skeleton"
              style={{
                width: '56px',
                height: '56px',
                borderRadius: 'var(--radius-full)',
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="skeleton" style={{ width: '140px', height: '20px', borderRadius: '4px' }} />
              <div className="skeleton" style={{ width: '90px', height: '14px', borderRadius: '4px' }} />
            </div>
          </>
        ) : (
          <>
            {displayPhoto ? (
              <img
                src={displayPhoto}
                alt={displayName}
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: 'var(--radius-full)',
                  objectFit: 'cover',
                  flexShrink: 0,
                  boxShadow: 'var(--shadow-glow)',
                }}
              />
            ) : (
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--accent-gradient)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  flexShrink: 0,
                  boxShadow: 'var(--shadow-glow)',
                }}
              >
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ fontSize: '1.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {displayName}
              </h3>
              {displayUsername && (
                <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                  @{displayUsername.replace(/^@/, '')}
                </div>
              )}
              <div style={{ marginTop: '6px' }}>
                <Badge variant={isEmployer ? 'primary' : 'neutral'} icon={isEmployer ? 'solar:buildings-bold' : 'solar:user-bold'}>
                  {isEmployer ? t('profile.role_employer') : t('profile.role_seeker')}
                </Badge>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Role Switcher Segmented Card */}
      <div
        className="glass-card"
        style={{
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '28px',
                height: '28px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--accent-subtle)',
                color: 'var(--accent-primary)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon icon="solar:user-speak-rounded-bold" width="16" height="16" />
            </span>
            <span style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
              {t('profile.switch_role')}
            </span>
          </div>

          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {isEmployer ? t('profile.role_employer_short') : t('profile.role_seeker_short')}
          </span>
        </div>

        {/* Modern Segmented Control */}
        <div className="role-segmented-control">
          <button
            type="button"
            className={`role-segment-btn ${!isEmployer ? 'active' : ''}`}
            onClick={() => handleRoleSelect('seeker')}
          >
            <Icon
              icon="solar:user-bold"
              width="18"
              height="18"
              className="role-segment-icon"
            />
            <span className="role-segment-text">
              {t('profile.role_seeker_short')}
            </span>
          </button>

          <button
            type="button"
            className={`role-segment-btn ${isEmployer ? 'active' : ''}`}
            onClick={() => handleRoleSelect('employer')}
          >
            <Icon
              icon="solar:buildings-2-bold"
              width="18"
              height="18"
              className="role-segment-icon"
            />
            <span className="role-segment-text">
              {t('profile.role_employer_short')}
            </span>
          </button>
        </div>
      </div>

      {/* Role-Specific Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {isEmployer ? (
          <div
            className="glass-card"
            onClick={() => setShowEmployerVacancies(true)}
            style={{
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Icon icon="solar:documents-minimalistic-bold" width="22" height="22" style={{ color: 'var(--accent-primary)' }} />
              <span style={{ fontWeight: 600 }}>{t('profile.my_vacancies')}</span>
            </div>
            <Icon icon="solar:alt-arrow-right-linear" width="18" height="18" style={{ color: 'var(--text-muted)' }} />
          </div>
        ) : (
          <>
            <div
              className="glass-card"
              onClick={() => setShowSeekerApplications(true)}
              style={{
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Icon icon="solar:letter-opened-bold" width="22" height="22" style={{ color: 'var(--accent-primary)' }} />
                <span style={{ fontWeight: 600 }}>{t('profile.my_applications')}</span>
              </div>
              <Icon icon="solar:alt-arrow-right-linear" width="18" height="18" style={{ color: 'var(--text-muted)' }} />
            </div>

            <div
              className="glass-card"
              onClick={() => setShowResumeModal(true)}
              style={{
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Icon icon="solar:user-hand-up-bold" width="22" height="22" style={{ color: 'var(--accent-primary)' }} />
                <span style={{ fontWeight: 600 }}>
                  {resume ? t('resumes.edit_btn') : t('resumes.create_btn')}
                </span>
              </div>
              <Icon icon="solar:alt-arrow-right-linear" width="18" height="18" style={{ color: 'var(--text-muted)' }} />
            </div>

            <div
              className="glass-card"
              onClick={() => setShowSubscriptions(true)}
              style={{
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Icon icon="solar:bell-bing-bold" width="22" height="22" style={{ color: 'var(--accent-primary)' }} />
                <span style={{ fontWeight: 600 }}>{t('profile.subscriptions')}</span>
              </div>
              <Icon icon="solar:alt-arrow-right-linear" width="18" height="18" style={{ color: 'var(--text-muted)' }} />
            </div>
          </>
        )}
      </div>

      {/* App Settings Card */}
      <div
        className="glass-card"
        style={{
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <h4 style={{ fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
          {t('profile.language')} & {t('profile.theme')}
        </h4>

        {/* Language Selection */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{t('profile.language')}</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { code: 'uz', icon: 'circle-flags:uz', label: 'UZ' },
              { code: 'ru', icon: 'circle-flags:ru', label: 'RU' },
              { code: 'en', icon: 'circle-flags:us', label: 'EN' },
            ].map((item) => (
              <button
                key={item.code}
                type="button"
                className={`lang-pill-btn ${lang === item.code ? 'active' : ''}`}
                onClick={() => {
                  setLang(item.code);
                  if (updateLanguage) updateLanguage(item.code);
                }}
              >
                <Icon
                  icon={item.icon}
                  width="18"
                  height="18"
                  style={{ borderRadius: '50%', flexShrink: 0 }}
                />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Theme Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-card)', paddingTop: '10px' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{t('profile.theme')}</span>
          <Button
            variant="secondary"
            size="sm"
            icon={theme === 'dark' ? 'solar:sun-2-bold' : 'solar:moon-stars-bold'}
            onClick={toggleTheme}
          >
            {theme === 'dark' ? t('profile.theme_light') : t('profile.theme_dark')}
          </Button>
        </div>
      </div>

      {/* Sub-Modals */}
      <EmployerVacanciesModal
        isOpen={showEmployerVacancies}
        onClose={() => setShowEmployerVacancies(false)}
        onViewApplicants={(vac) => {
          setSelectedVacancyForApplicants(vac);
        }}
      />

      <VacancyApplicantsModal
        vacancy={selectedVacancyForApplicants}
        isOpen={Boolean(selectedVacancyForApplicants)}
        onClose={() => setSelectedVacancyForApplicants(null)}
      />

      <SeekerApplicationsModal
        isOpen={showSeekerApplications}
        onClose={() => setShowSeekerApplications(false)}
      />

      <SubscriptionsModal
        isOpen={showSubscriptions}
        onClose={() => setShowSubscriptions(false)}
      />

      <CreateResumeModal
        isOpen={showResumeModal}
        existingResume={resume}
        onClose={() => setShowResumeModal(false)}
      />
    </div>
  );
}
