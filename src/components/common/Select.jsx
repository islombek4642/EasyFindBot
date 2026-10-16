/**
 * EasyFindBot — Atomic Select Component
 */

import React from 'react';
import { Icon } from '@iconify/react';

export function Select({
  label,
  error,
  helperText,
  icon,
  required = false,
  options = [],
  value,
  onChange,
  placeholder,
  className = '',
  id,
  ...props
}) {
  const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className={`input-group ${className}`}>
      {label && (
        <label htmlFor={selectId} className="input-label">
          {label}
          {required && <span className="required-star">*</span>}
        </label>
      )}

      <div className="select-wrapper">
        {icon && (
          <span className="input-icon-left">
            <Icon icon={icon} width="18" height="18" />
          </span>
        )}

        <select
          id={selectId}
          value={value}
          onChange={onChange}
          className={`select-field ${icon ? 'has-left-icon' : ''} ${error ? 'error' : ''}`}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <span className="select-chevron">
          <Icon icon="solar:alt-arrow-down-linear" width="18" height="18" />
        </span>
      </div>

      {error && <span className="input-error-text">{error}</span>}
      {!error && helperText && <span className="input-helper-text">{helperText}</span>}
    </div>
  );
}
