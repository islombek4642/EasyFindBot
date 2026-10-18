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
  iconSize,
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

  // Auto icon size: lg → 22, md → 18, sm → 16
  const autoSize = iconSize ?? (size === 'lg' ? 22 : size === 'sm' ? 16 : 18);

  return (
    <button
      type={type}
      className={classNames}
      onClick={handleClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Icon icon="solar:refresh-circle-bold" className="spin-icon" width={autoSize} height={autoSize} />
      ) : (
        icon && <Icon icon={icon} width={autoSize} height={autoSize} />
      )}
      {children}
      {!loading && iconRight && <Icon icon={iconRight} width={autoSize} height={autoSize} />}
    </button>
  );
}
