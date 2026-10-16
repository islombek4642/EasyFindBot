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
    // Record baseline height when keyboard is closed
    let baseHeight = typeof window !== 'undefined' ? window.innerHeight : 0;

    const isTextInput = (el) => {
      if (!el || !el.tagName) return false;
      const tag = el.tagName.toLowerCase();
      if (tag === 'textarea') return true;
      if (tag === 'input') {
        const type = (el.type || 'text').toLowerCase();
        return !['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'image'].includes(type);
      }
      return false;
    };

    const isTouch =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0);

    // 1. Focusin: as soon as user taps a text input on mobile, hide the bottom nav
    const handleFocusIn = (e) => {
      if (isTouch && isTextInput(e.target)) {
        setIsKeyboardOpen(true);
      }
    };

    // 2. Focusout: when user leaves input, restore bottom nav
    const handleFocusOut = () => {
      setTimeout(() => {
        const active = document.activeElement;
        if (!isTextInput(active)) {
          setIsKeyboardOpen(false);
          baseHeight = window.innerHeight;
        }
      }, 60);
    };

    // 3. Resize handler: accurately detects when keyboard opens/closes via height change
    const handleResize = () => {
      if (!isTouch) return;
      const currentHeight = window.innerHeight;
      const vvHeight = window.visualViewport ? window.visualViewport.height : currentHeight;
      const effectiveHeight = Math.min(currentHeight, vvHeight);

      // If viewport has expanded back to (or near) baseline height, keyboard is closed
      if (effectiveHeight >= baseHeight - 60) {
        setIsKeyboardOpen(false);
        baseHeight = Math.max(baseHeight, currentHeight);
      } else if (baseHeight - effectiveHeight > 100) {
        // If viewport shrank significantly, keyboard is open
        setIsKeyboardOpen(true);
      }
    };

    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('focusout', handleFocusOut);
    window.addEventListener('resize', handleResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }

    return () => {
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);
      window.removeEventListener('resize', handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
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
