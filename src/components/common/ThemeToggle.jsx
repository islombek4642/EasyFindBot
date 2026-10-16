/**
 * EasyFindBot — Theme Toggle Button
 */

import React from 'react';
import { Icon } from '@iconify/react';
import { useTheme } from '../../hooks/useTheme.js';

export function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className={`theme-toggle-btn ${className}`}
      onClick={toggleTheme}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle visual theme"
    >
      <Icon
        icon={isDark ? 'solar:sun-2-bold' : 'solar:moon-stars-bold'}
        width="18"
        height="18"
        style={{ color: isDark ? 'var(--warning)' : 'var(--accent-primary)' }}
      />
    </button>
  );
}
