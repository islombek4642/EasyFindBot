/**
 * EasyFindBot — Unified Reusable EmptyState Component
 */

import React from 'react';
import { Icon } from '@iconify/react';
import { Button } from './Button.jsx';

export function EmptyState({
  icon = 'solar:box-minimalistic-bold',
  title,
  description,
  actionLabel = null,
  actionIcon = null,
  onAction = null,
  className = '',
}) {
  return (
    <div className={`empty-state ${className}`}>
      <div className="empty-state-icon-box">
        <Icon icon={icon} width="34" height="34" />
      </div>
      {title && <h3 className="empty-state-title">{title}</h3>}
      {description && <p className="empty-state-desc">{description}</p>}
      {actionLabel && onAction && (
        <div style={{ marginTop: '8px' }}>
          <Button variant="primary" size="md" icon={actionIcon} onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
