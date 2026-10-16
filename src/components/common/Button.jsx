/**
 * EasyFindBot — Atomic Button Component
 */

import React from 'react';
import { Icon } from '@iconify/react';

export function Button({
  variant = 'primary',
  size = 'md',
  icon = null,
  iconRight = null,
  loading = false,
  disabled = false,
  children,
  onClick,
  type = 'button',
  className = '',
  haptic = true,
  ...props
}) {
  const handleClick = (e) => {
    if (disabled || loading) return;
    if (haptic && typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      try {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
      } catch (err) {
        // Ignore haptic errors outside supported clients
      }
    }
    if (onClick) onClick(e);
  };

  const classNames = [
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    loading ? 'btn-loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={classNames}
      onClick={handleClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Icon icon="solar:refresh-circle-bold" className="spin-icon" width="18" height="18" />
      ) : (
        icon && <Icon icon={icon} width="18" height="18" />
      )}
      {children}
      {!loading && iconRight && <Icon icon={iconRight} width="18" height="18" />}
    </button>
  );
}
