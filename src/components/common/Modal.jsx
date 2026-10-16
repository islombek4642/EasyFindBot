/**
 * EasyFindBot — Atomic Bottom Sheet / Modal Component (Portaled to document.body with Swipe-Down Gesture)
 */

import React, { useState, useEffect, useRef } from 'react';
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
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setDragY(0);
      setIsDragging(false);
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

  // Swipe-down touch event handlers
  const handleTouchStart = (e) => {
    if (isCenter) return;
    const touch = e.touches[0];
    startYRef.current = touch.clientY;
    currentYRef.current = touch.clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging || isCenter) return;
    const touch = e.touches[0];
    currentYRef.current = touch.clientY;
    const deltaY = currentYRef.current - startYRef.current;

    // Only allow dragging downward
    if (deltaY > 0) {
      if (e.cancelable) e.preventDefault();
      setDragY(deltaY);
    } else {
      setDragY(0);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging || isCenter) return;
    setIsDragging(false);
    const deltaY = currentYRef.current - startYRef.current;

    // If dragged downward more than 80px, dismiss modal
    if (deltaY > 80) {
      if (onClose) {
        onClose();
      }
    } else {
      // Spring back up
      setDragY(0);
    }
  };

  const modalNode = (
    <div
      className={`modal-backdrop open ${isCenter ? 'modal-centered' : ''}`}
      onClick={handleBackdropClick}
    >
      <div
        className={`modal-sheet ${isCenter ? 'modal-sheet-center' : ''} ${className}`}
        style={
          !isCenter && dragY > 0
            ? {
                transform: `translateY(${dragY}px)`,
                transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              }
            : undefined
        }
      >
        {!isCenter && showHandle && (
          <div
            className="modal-sheet-handle-zone"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="modal-sheet-handle" />
          </div>
        )}

        {(title || onClose) && (
          <div
            className="modal-header"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
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

        <div
          ref={bodyRef}
          className="modal-body"
          onTouchStart={(e) => {
            // Initiate drag only if body is at the very top
            if (bodyRef.current && bodyRef.current.scrollTop <= 0) {
              handleTouchStart(e);
            }
          }}
          onTouchMove={(e) => {
            if (isDragging) {
              handleTouchMove(e);
            }
          }}
          onTouchEnd={handleTouchEnd}
        >
          {children}
        </div>

        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalNode, document.body);
  }

  return modalNode;
}
