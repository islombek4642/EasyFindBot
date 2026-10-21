/**
 * EasyFindBot — App Header Chrome
 */

import React from 'react';
import { Icon } from '@iconify/react';
import { useAuth } from '../../hooks/useAuth.js';
import { useTranslation } from '../../locales/index.jsx';
import { ThemeToggle } from '../common/ThemeToggle.jsx';
import botAvatar from '../../../assets/bot_avatar.png';

const LANG_FLAGS = {
  uz: 'circle-flags:uz',
  ru: 'circle-flags:ru',
  en: 'circle-flags:us',
};

export function AppHeader({ onSwitchRole }) {
  const { role, switchRole, updateLanguage } = useAuth();
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
    const current = lang || 'uz';
    const nextIdx = (langs.indexOf(current) + 1) % langs.length;
    const nextLang = langs[nextIdx];
    setLang(nextLang);
    if (updateLanguage) {
      updateLanguage(nextLang);
    }
  };

  const isEmployer = role === 'employer';
  const currentFlag = LANG_FLAGS[lang] || 'circle-flags:uz';

  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="header-brand">
          <div className="brand-icon-box" title="EasyFind Bot">
            <img
              src={botAvatar}
              alt="EasyFind"
              className="brand-avatar-img"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
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
            title={t('profile.language') || "Tilni o'zgartirish"}
            aria-label="Switch Language"
          >
            <Icon
              icon={currentFlag}
              width="16"
              height="16"
              style={{ borderRadius: '50%', flexShrink: 0 }}
            />
            <span>{(lang || 'uz').toUpperCase()}</span>
          </button>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
