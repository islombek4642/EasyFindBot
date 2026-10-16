/**
 * EasyFindBot — Shimmer Loading Skeleton Component
 */

import React from 'react';

export function Skeleton({
  type = 'line',
  width,
  height,
  count = 1,
  className = '',
  style = {},
}) {
  const items = Array.from({ length: count });

  if (type === 'card') {
    return (
      <>
        {items.map((_, i) => (
          <div
            key={i}
            className={`glass-card ${className}`}
            style={{
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              ...style,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <div
                  className="skeleton-shimmer"
                  style={{ width: '70%', height: '18px' }}
                />
                <div
                  className="skeleton-shimmer"
                  style={{ width: '40%', height: '14px' }}
                />
              </div>
              <div
                className="skeleton-shimmer"
                style={{ width: '60px', height: '24px', borderRadius: '9999px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div
                className="skeleton-shimmer"
                style={{ width: '80px', height: '22px', borderRadius: '9999px' }}
              />
              <div
                className="skeleton-shimmer"
                style={{ width: '70px', height: '22px', borderRadius: '9999px' }}
              />
            </div>
            <div
              className="skeleton-shimmer"
              style={{ width: '50%', height: '20px' }}
            />
          </div>
        ))}
      </>
    );
  }

  const defaultHeight = type === 'avatar' ? '40px' : '14px';
  const defaultWidth = type === 'avatar' ? '40px' : '100%';
  const borderRadius = type === 'avatar' ? '9999px' : 'var(--radius-sm)';

  return (
    <>
      {items.map((_, i) => (
        <div
          key={i}
          className={`skeleton-shimmer ${className}`}
          style={{
            width: width || defaultWidth,
            height: height || defaultHeight,
            borderRadius,
            ...style,
          }}
        />
      ))}
    </>
  );
}
