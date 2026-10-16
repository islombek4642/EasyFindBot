/**
 * EasyFindBot — Floating Bottom Navigation Chrome
 */

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { ROUTES } from '../../constants/routes.js';
import { useTranslation } from '../../locales/index.jsx';

export function BottomNav({ activeTab, onTabChange }) {
  const { t } = useTranslation();
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;

    // Viewport-based keyboard detection (reliable on mobile iOS / Android WebView)
    const checkViewport = () => {
      if (vv && window.innerHeight) {
        const heightDiff = window.innerHeight - vv.height;
        // Virtual keyboard takes at least 120px when open
        if (heightDiff > 120) {
          setIsKeyboardOpen(true);
        } else {
          setIsKeyboardOpen(false);
        }
      }
    };

    if (vv) {
      vv.addEventListener('resize', checkViewport);
      vv.addEventListener('scroll', checkViewport);
    }

    // Safety fallback: when focus leaves input/textarea, always restore navigation
    const handleFocusOut = () => {
      setTimeout(() => {
        const active = document.activeElement;
        const tag = active?.tagName?.toLowerCase();
        if (tag !== 'input' && tag !== 'textarea') {
          setIsKeyboardOpen(false);
        }
      }, 50);
    };

    window.addEventListener('focusout', handleFocusOut);

    return () => {
      if (vv) {
        vv.removeEventListener('resize', checkViewport);
        vv.removeEventListener('scroll', checkViewport);
      }
      window.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

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
    <nav className={`floating-bottom-nav ${isKeyboardOpen ? 'keyboard-hidden' : ''}`}>
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
