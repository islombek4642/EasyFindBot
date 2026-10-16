/**
 * EasyFindBot — Atomic Input Component
 */

import React from 'react';
import { Icon } from '@iconify/react';

export function Input({
  label,
  error,
  helperText,
  icon,
  rightIcon,
  onRightIconClick,
  required = false,
  multiline = false,
  rows = 3,
  className = '',
  id,
  ...props
}) {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className={`input-group ${className}`}>
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
          {required && <span className="required-star">*</span>}
        </label>
      )}

      <div className="input-wrapper">
        {icon && (
          <span className="input-icon-left">
            <Icon icon={icon} width="18" height="18" />
          </span>
        )}

        {multiline ? (
          <textarea
            id={inputId}
            rows={rows}
            className={`textarea-field ${icon ? 'has-left-icon' : ''} ${error ? 'error' : ''}`}
            {...props}
          />
        ) : (
          <input
            id={inputId}
            className={`input-field ${icon ? 'has-left-icon' : ''} ${rightIcon ? 'has-right-icon' : ''} ${error ? 'error' : ''}`}
            {...props}
          />
        )}

        {rightIcon && (
          <span className="input-icon-right" onClick={onRightIconClick}>
            <Icon icon={rightIcon} width="18" height="18" />
          </span>
        )}
      </div>

      {error && <span className="input-error-text">{error}</span>}
      {!error && helperText && <span className="input-helper-text">{helperText}</span>}
    </div>
  );
}
