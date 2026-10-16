/**
 * EasyFindBot — Vacancy Applicants Review Modal
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '@iconify/react';
import { api } from '../../services/api.js';
import { useTranslation } from '../../locales/index.jsx';
import {
  Modal,
  Badge,
  Button,
  EmptyState,
  Skeleton,
} from '../../components/common/index.js';

export function VacancyApplicantsModal({
  vacancy,
  isOpen,
  onClose,
}) {
  const { t } = useTranslation();
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchApplicants = useCallback(async () => {
    if (!vacancy) return;
    try {
      setLoading(true);
      const res = await api.getVacancyApplications({ vacancyId: vacancy.id });
      const list = res?.items || res?.applications || [];
      setApplicants(list);
    } catch (err) {
      console.error('Failed to load applicants:', err);
    } finally {
      setLoading(false);
    }
  }, [vacancy]);

  useEffect(() => {
    if (isOpen) {
      fetchApplicants();
    }
  }, [isOpen, fetchApplicants]);

  const handleUpdateStatus = async (appId, newStatus) => {
    try {
      await api.updateApplicationStatus({ id: appId, status: newStatus });
      setApplicants((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a))
      );
    } catch (err) {
      console.error('Failed to update applicant status:', err);
    }
  };

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${t('profile.applicants_title')} (${applicants.length})`}
    >
      {loading ? (
        <Skeleton type="card" count={2} />
      ) : applicants.length === 0 ? (
        <EmptyState
          icon="solar:users-group-two-rounded-bold"
          title={t('profile.no_applicants')}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {applicants.map((app) => (
            <div
              key={app.id}
              className="glass-card"
              style={{
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icon icon="solar:user-bold" width="18" height="18" style={{ color: 'var(--accent-primary)' }} />
                  <span style={{ fontWeight: 600 }}>Nomzod #{app.seekerTgId}</span>
                </div>
                {getStatusBadge(app.status)}
              </div>

              {app.coverLetter && (
                <div
                  style={{
                    background: 'var(--bg-input)',
                    padding: '10px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {app.coverLetter}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                {app.status !== 'rejected' && (
                  <Button
                    variant="outline"
                    size="sm"
                    icon="solar:close-circle-bold"
                    onClick={() => handleUpdateStatus(app.id, 'rejected')}
                  >
                    {t('profile.status_reject_btn')}
                  </Button>
                )}
                {app.status !== 'accepted' && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon="solar:check-circle-bold"
                    onClick={() => handleUpdateStatus(app.id, 'accepted')}
                  >
                    {t('profile.status_accept_btn')}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
