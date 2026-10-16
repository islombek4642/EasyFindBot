/**
 * EasyFindBot — Atomic Badge / Pill Component
 */

import React from 'react';
import { Icon } from '@iconify/react';

export function Badge({
  variant = 'neutral',
  icon = null,
  children,
  className = '',
  onClick,
  ...props
}) {
  const classNames = [
    'badge-pill',
    `badge-${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      className={classNames}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
      {...props}
    >
      {icon && <Icon icon={icon} width="14" height="14" />}
      {children}
    </span>
  );
}
