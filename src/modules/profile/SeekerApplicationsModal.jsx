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

  const formatDate = (val) => {
    if (!val) return '';
    try {
      let d = null;
      const num = Number(val);
      if (!isNaN(num) && num > 0) {
        const ms = num < 1e11 ? num * 1000 : num;
        d = new Date(ms);
      } else if (typeof val === 'string') {
        d = new Date(val.replace(' ', 'T'));
      }
      if (!d || isNaN(d.getTime())) return '';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}.${month}.${year}, ${hours}:${minutes}`;
    } catch {
      return '';
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
                  {app.vacancy?.status === 'closed' && (
                    <div
                      style={{
                        marginTop: '4px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.74rem',
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      <Icon icon="solar:lock-bold" width="12" height="12" />
                      <span>{t('vacancies.closed_badge')}</span>
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

              {formatDate(app.createdAt) && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '0.76rem',
                    color: 'var(--text-tertiary)',
                    borderTop: '1px solid var(--border-card)',
                    paddingTop: '6px',
                  }}
                >
                  <Icon icon="solar:clock-circle-bold" width="13" height="13" style={{ color: 'var(--accent-primary)', opacity: 0.85 }} />
                  <span>{formatDate(app.createdAt)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
