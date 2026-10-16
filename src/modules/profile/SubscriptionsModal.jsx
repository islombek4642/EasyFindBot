/**
 * EasyFindBot — Category Subscriptions Modal
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '@iconify/react';
import { api } from '../../services/api.js';
import { useTranslation } from '../../locales/index.jsx';
import { CATEGORIES } from '../../constants/categories.js';
import { Modal, Skeleton } from '../../components/common/index.js';

export function SubscriptionsModal({ isOpen, onClose }) {
  const { t } = useTranslation();
  const [activeCategories, setActiveCategories] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const fetchSubscriptions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getSubscriptions();
      const list = res?.items || res?.subscriptions || [];
      setActiveCategories(new Set(list.map((s) => s.category)));
    } catch (err) {
      console.error('Failed to load subscriptions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchSubscriptions();
    }
  }, [isOpen, fetchSubscriptions]);

  const handleToggle = async (catId) => {
    try {
      const isCurrentlyActive = activeCategories.has(catId);
      // Optimistic update
      const nextSet = new Set(activeCategories);
      if (isCurrentlyActive) nextSet.delete(catId);
      else nextSet.add(catId);
      setActiveCategories(nextSet);

      await api.toggleSubscription({ category: catId });
    } catch (err) {
      console.error('Failed to toggle subscription:', err);
      fetchSubscriptions(); // rollback
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('profile.subscriptions')}>
      {loading ? (
        <Skeleton type="card" count={2} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {CATEGORIES.map((cat) => {
            const isSubscribed = activeCategories.has(cat.id);
            return (
              <div
                key={cat.id}
                className="glass-card"
                onClick={() => handleToggle(cat.id)}
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  borderColor: isSubscribed ? 'var(--accent-primary)' : 'var(--border-card)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Icon icon={cat.icon} width="20" height="20" style={{ color: 'var(--accent-primary)' }} />
                  <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>
                    {t(`categories.${cat.id}`) || cat.id}
                  </span>
                </div>

                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '9999px',
                    background: isSubscribed ? 'var(--accent-primary)' : 'var(--bg-input)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isSubscribed ? '#ffffff' : 'var(--text-muted)',
                    border: '1px solid var(--border-subtle)',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  {isSubscribed && <Icon icon="solar:check-read-bold" width="16" height="16" />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
