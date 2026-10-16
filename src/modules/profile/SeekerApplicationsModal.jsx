/**
 * EasyFindBot — Seeker's Submitted Applications Modal
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '@iconify/react';
import { api } from '../../services/api.js';
import { useTranslation } from '../../locales/index.jsx';
import {
  Modal,
  Badge,
  EmptyState,
  Skeleton,
} from '../../components/common/index.js';

export function SeekerApplicationsModal({ isOpen, onClose }) {
  const { t } = useTranslation();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getMyApplications();
      const list = res?.items || res?.applications || [];
      setApplications(list);
    } catch (err) {
      console.error('Failed to load my applications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchApplications();
    }
  }, [isOpen, fetchApplications]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'accepted':
        return <Badge variant="success">{t('statuses.accepted')}</Badge>;
      case 'rejected':
        return <Badge variant="danger">{t('statuses.rejected')}</Badge>;
      case 'viewed':
        return <Badge variant="warning">{t('statuses.viewed')}</Badge>;
      default:
        return <Badge variant="primary">{t('statuses.applied')}</Badge>;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('profile.my_applications')}>
      {loading ? (
        <Skeleton type="card" count={2} />
      ) : applications.length === 0 ? (
        <EmptyState
          icon="solar:letter-opened-bold"
          title={t('profile.no_applications')}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {applications.map((app) => (
            <div
              key={app.id}
              className="glass-card"
              style={{
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ fontSize: '0.98rem', fontWeight: 700 }}>
                    {app.vacancy?.title || app.vacancyTitle || `Vakansiya #${app.vacancyId}`}
                  </h4>
                  {(app.vacancy?.companyName || app.vacancy?.company || app.company) && (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {app.vacancy?.companyName || app.vacancy?.company || app.company}
                    </div>
                  )}
                </div>
                {getStatusBadge(app.status)}
              </div>

              {app.coverLetter && (
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  "{app.coverLetter}"
                </p>
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.74rem',
                  color: 'var(--text-muted)',
                  borderTop: '1px solid var(--border-card)',
                  paddingTop: '6px',
                }}
              >
                <Icon icon="solar:calendar-bold" width="13" height="13" />
                <span>{new Date(app.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
