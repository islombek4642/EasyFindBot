/**
 * EasyFindBot — Floating Bottom Navigation Chrome
 */

import React from 'react';
import { Icon } from '@iconify/react';
import { ROUTES } from '../../constants/routes.js';
import { useTranslation } from '../../locales/index.jsx';

export function BottomNav({ activeTab, onTabChange }) {
  const { t } = useTranslation();

  const tabs = [
    {
      key: ROUTES.VACANCIES,
      label: t('nav.vacancies'),
      icon: 'solar:suitcase-tag-bold',
      iconOutline: 'solar:suitcase-tag-linear',
    },
    {
      key: ROUTES.POST_JOB,
      label: t('nav.post_job'),
      icon: 'solar:add-circle-bold',
      iconOutline: 'solar:add-circle-linear',
    },
    {
      key: ROUTES.RESUMES,
      label: t('nav.resumes'),
      icon: 'solar:users-group-rounded-bold',
      iconOutline: 'solar:users-group-rounded-linear',
    },
    {
      key: ROUTES.PROFILE,
      label: t('nav.profile'),
      icon: 'solar:user-circle-bold',
      iconOutline: 'solar:user-circle-linear',
    },
  ];

  const handleTabClick = (key) => {
    if (activeTab === key) return;
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      try {
        window.Telegram.WebApp.HapticFeedback.selectionChanged();
      } catch (err) {
        // Ignore haptic outside supported clients
      }
    }
    onTabChange(key);
  };

  return (
    <nav className="floating-bottom-nav">
      <div className="nav-inner">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              className={`nav-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => handleTabClick(tab.key)}
            >
              <span className="nav-icon">
                <Icon
                  icon={isActive ? tab.icon : tab.iconOutline}
                  width="22"
                  height="22"
                />
              </span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
