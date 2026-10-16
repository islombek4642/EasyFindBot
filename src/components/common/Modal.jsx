/**
 * EasyFindBot — Atomic Bottom Sheet / Modal Component (Portaled to document.body)
 */

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer = null,
  showHandle = true,
  className = '',
  variant = 'bottom',
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  const isCenter = variant === 'center';

  const modalNode = (
    <div
      className={`modal-backdrop open ${isCenter ? 'modal-centered' : ''}`}
      onClick={handleBackdropClick}
    >
      <div className={`modal-sheet ${isCenter ? 'modal-sheet-center' : ''} ${className}`}>
        {!isCenter && showHandle && <div className="modal-sheet-handle" />}

        {(title || onClose) && (
          <div className="modal-header">
            <h3 className="modal-title">{title}</h3>
            {onClose && (
              <button
                type="button"
                className="modal-close-btn"
                onClick={onClose}
                aria-label="Close"
              >
                <Icon icon="solar:close-circle-bold" width="20" height="20" />
              </button>
            )}
          </div>
        )}

        <div className="modal-body">{children}</div>

        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalNode, document.body);
  }

  return modalNode;
}
