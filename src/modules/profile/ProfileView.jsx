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
  const { user, role, resume, switchRole } = useAuth();
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

  const handleRoleToggle = () => {
    const nextRole = isEmployer ? 'seeker' : 'employer';
    switchRole(nextRole);
  };

  const displayName = user
    ? `${user.first_name || user.firstName || ''} ${user.last_name || user.lastName || ''}`.trim() || user.username || 'Foydalanuvchi'
    : 'Foydalanuvchi';

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
        {user?.photo_url ? (
          <img
            src={user.photo_url}
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
          {user?.username && (
            <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              @{user.username}
            </div>
          )}
          <div style={{ marginTop: '6px' }}>
            <Badge variant={isEmployer ? 'primary' : 'neutral'} icon={isEmployer ? 'solar:buildings-bold' : 'solar:user-bold'}>
              {isEmployer ? t('profile.role_employer') : t('profile.role_seeker')}
            </Badge>
          </div>
        </div>
      </div>

      {/* Role Switch Banner */}
      <div
        className="glass-card"
        style={{
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Icon icon="solar:refresh-circle-bold" width="22" height="22" style={{ color: 'var(--accent-primary)' }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{t('profile.switch_role')}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              {isEmployer ? t('profile.role_employer') : t('profile.role_seeker')}
            </div>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={handleRoleToggle}>
          {isEmployer ? t('profile.role_seeker') : t('profile.role_employer')}
        </Button>
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
          <div style={{ display: 'flex', gap: '6px' }}>
            {['uz', 'ru', 'en'].map((l) => (
              <button
                key={l}
                type="button"
                className={`badge-pill ${lang === l ? 'badge-primary' : 'badge-neutral'}`}
                onClick={() => setLang(l)}
                style={{ cursor: 'pointer', textTransform: 'uppercase', border: 'none' }}
              >
                {l}
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
