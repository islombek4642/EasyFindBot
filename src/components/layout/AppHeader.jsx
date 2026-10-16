/**
 * EasyFindBot — App Header Chrome
 */

import React from 'react';
import { Icon } from '@iconify/react';
import { useAuth } from '../../hooks/useAuth.js';
import { useTranslation } from '../../locales/index.jsx';
import { ThemeToggle } from '../common/ThemeToggle.jsx';

export function AppHeader({ onSwitchRole }) {
  const { role, switchRole } = useAuth();
  const { lang, setLang, t } = useTranslation();

  const handleRoleToggle = () => {
    if (onSwitchRole) {
      onSwitchRole();
      return;
    }
    const nextRole = role === 'employer' ? 'seeker' : 'employer';
    switchRole(nextRole);
  };

  const cycleLanguage = () => {
    const langs = ['uz', 'ru', 'en'];
    const nextIdx = (langs.indexOf(lang) + 1) % langs.length;
    setLang(langs[nextIdx]);
  };

  const isEmployer = role === 'employer';

  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="header-brand">
          <div className="brand-icon-box" title="EasyFind">
            <Icon icon="solar:magnifer-bold" width="18" height="18" />
          </div>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="role-badge-btn"
            onClick={handleRoleToggle}
            title={t('profile.switch_role')}
          >
            <Icon
              icon={isEmployer ? 'solar:buildings-bold' : 'solar:user-bold'}
              width="14"
              height="14"
            />
            <span className="role-badge-text">
              {isEmployer
                ? (t('profile.role_employer_short') || t('profile.role_employer'))
                : (t('profile.role_seeker_short') || t('profile.role_seeker'))}
            </span>
          </button>

          <button
            type="button"
            className="lang-btn"
            onClick={cycleLanguage}
            title="Switch Language"
          >
            {lang}
          </button>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
