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
  const [updatingId, setUpdatingId] = useState(null);

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
      setUpdatingId(appId);
      const res = await api.updateApplicationStatus({
        id: appId,
        applicationId: appId,
        status: newStatus,
      });

      if (res && (res.success || res.ok)) {
        setApplicants((prev) =>
          prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a))
        );
      } else {
        const errorMsg = res?.error || t('common.error');
        if (typeof window !== 'undefined' && window.Telegram?.WebApp?.showAlert) {
          window.Telegram.WebApp.showAlert(errorMsg);
        } else {
          alert(errorMsg);
        }
      }
    } catch (err) {
      console.error('Failed to update applicant status:', err);
      const errorMsg = err.message || t('common.error');
      if (typeof window !== 'undefined' && window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert(errorMsg);
      } else {
        alert(errorMsg);
      }
    } finally {
      setUpdatingId(null);
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {applicants.map((app) => {
            const candidateName =
              [app.user?.firstName, app.user?.lastName].filter(Boolean).join(' ') ||
              `Nomzod #${app.seekerTgId}`;
            const candidateUsername = app.user?.username;

            return (
              <div
                key={app.id}
                className="glass-card"
                style={{
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-card)',
                }}
              >
                {/* Candidate Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'var(--accent-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--accent-primary)',
                        }}
                      >
                        <Icon icon="solar:user-bold" width="18" height="18" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{candidateName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                          ID: #{app.seekerTgId}
                        </div>
                      </div>
                    </div>

                    {candidateUsername && (
                      <div style={{ marginTop: '4px', marginLeft: '40px' }}>
                        <a
                          href={`https://t.me/${candidateUsername}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.8rem',
                            color: 'var(--accent-primary)',
                            textDecoration: 'none',
                            background: 'var(--accent-subtle)',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontWeight: 500,
                          }}
                        >
                          <Icon icon="solar:plain-bold" width="13" height="13" />
                          <span>@{candidateUsername}</span>
                        </a>
                      </div>
                    )}
                  </div>

                  <div>{getStatusBadge(app.status)}</div>
                </div>

                {/* Resume information if attached */}
                {app.resume && (
                  <div
                    style={{
                      background: 'var(--bg-input)',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      fontSize: '0.85rem',
                      borderLeft: '3px solid var(--accent-primary)',
                    }}
                  >
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {app.resume.title}
                    </div>
                    {app.resume.skills && (
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        {app.resume.skills}
                      </div>
                    )}
                  </div>
                )}

                {/* Candidate Cover Letter / Note */}
                {app.coverLetter && (
                  <div
                    style={{
                      background: 'var(--bg-input)',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.85rem',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--text-tertiary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      <Icon icon="solar:chat-round-line-bold" width="14" height="14" />
                      <span>{t('profile.candidate_message')}</span>
                    </div>
                    <div style={{ lineHeight: 1.4 }}>{app.coverLetter}</div>
                  </div>
                )}

                {/* Action Buttons */}
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    marginTop: '4px',
                    paddingTop: '8px',
                    borderTop: '1px solid var(--border-subtle)',
                  }}
                >
                  {candidateUsername && (
                    <a
                      href={`https://t.me/${candidateUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: 'none' }}
                    >
                      <Button
                        variant="secondary"
                        size="sm"
                        icon="solar:chat-round-dots-bold"
                      >
                        {t('profile.contact_candidate')}
                      </Button>
                    </a>
                  )}

                  {app.status !== 'rejected' && (
                    <Button
                      variant="outline"
                      size="sm"
                      icon="solar:close-circle-bold"
                      loading={updatingId === app.id}
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
                      loading={updatingId === app.id}
                      onClick={() => handleUpdateStatus(app.id, 'accepted')}
                    >
                      {t('profile.status_accept_btn')}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
