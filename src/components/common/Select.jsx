/**
 * EasyFindBot — Atomic Select & Modal Picker Component
 */

import React, { useState, useMemo } from 'react';
import { Icon } from '@iconify/react';
import { Modal } from './Modal.jsx';
import { useTranslation } from '../../locales/index.jsx';

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
  disabled = false,
  modalVariant = 'center',
  modalTitle = null,
  id,
  name,
  ...props
}) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Find currently selected option
  const selectedOption = useMemo(() => {
    return options.find((opt) => String(opt.value) === String(value));
  }, [options, value]);

  // Filter options when search query is entered
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase().trim();
    return options.filter((opt) =>
      opt.label && opt.label.toLowerCase().includes(query)
    );
  }, [options, searchQuery]);

  const handleSelect = (val) => {
    if (onChange) {
      onChange({ target: { value: val, name: name || id } });
    }
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleOpen = () => {
    if (!disabled) {
      setIsOpen(true);
      setSearchQuery('');
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setSearchQuery('');
  };

  const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
  const resolvedModalTitle = modalTitle || label || placeholder || t('common.select');

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

        <button
          type="button"
          id={selectId}
          disabled={disabled}
          onClick={handleOpen}
          className={`select-field select-trigger-btn ${icon ? 'has-left-icon' : ''} ${error ? 'error' : ''} ${disabled ? 'disabled' : ''}`}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          {...props}
        >
          <span className={`select-trigger-label ${!selectedOption ? 'placeholder' : ''}`}>
            {selectedOption ? selectedOption.label : (placeholder || t('common.select') || 'Tanlang...')}
          </span>
        </button>

        <span className="select-chevron">
          <Icon icon="solar:alt-arrow-down-linear" width="18" height="18" />
        </span>
      </div>

      {error && <span className="input-error-text">{error}</span>}
      {!error && helperText && <span className="input-helper-text">{helperText}</span>}

      {/* Modern Center Modal Picker */}
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={resolvedModalTitle}
        variant={modalVariant}
        className="select-picker-modal"
      >
        <div className="select-modal-container">
          {/* Quick search input for lists with more than 6 items */}
          {options.length > 6 && (
            <div className="select-modal-search">
              <span className="select-modal-search-icon">
                <Icon icon="solar:magnifer-linear" width="18" height="18" />
              </span>
              <input
                type="text"
                className="select-modal-search-input"
                placeholder={t('common.search') || 'Qidirish...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  className="select-modal-search-clear"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  <Icon icon="solar:close-circle-bold" width="16" height="16" />
                </button>
              )}
            </div>
          )}

          {/* Scrollable Options List */}
          <div className="select-modal-options-list">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`select-modal-option-row ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelect(opt.value)}
                  >
                    <div className="select-modal-option-left">
                      {opt.icon && (
                        <Icon icon={opt.icon} width="20" height="20" className="select-modal-option-icon" />
                      )}
                      <span className="select-modal-option-text">{opt.label}</span>
                    </div>

                    {isSelected && (
                      <span className="select-modal-option-check">
                        <Icon icon="solar:check-circle-bold" width="20" height="20" />
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="select-modal-empty">
                <Icon icon="solar:magnifer-broken" width="32" height="32" className="select-modal-empty-icon" />
                <span>{t('common.not_found') || 'Hech narsa topilmadi'}</span>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
