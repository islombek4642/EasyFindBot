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
import { ResumeDetailModal } from '../resumes/ResumeDetailModal.jsx';

export function VacancyApplicantsModal({
  vacancy,
  isOpen,
  onClose,
}) {
  const { t } = useTranslation();
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [viewingResume, setViewingResume] = useState(null);

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
    <>
      <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${t('profile.applicants_title')} (${applicants.length})`}
    >
      {vacancy?.status === 'closed' && (
        <div
          style={{
            marginBottom: '12px',
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.82rem',
            color: 'var(--danger)',
            lineHeight: 1.4,
          }}
        >
          <Icon icon="solar:lock-bold" width="16" height="16" style={{ flexShrink: 0 }} />
          <span>{t('profile.vacancy_closed_applicants_hint')}</span>
        </div>
      )}

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
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'var(--accent-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--accent-primary)',
                          flexShrink: 0,
                        }}
                      >
                        <Icon icon="solar:user-bold" width="20" height="20" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '1rem', lineHeight: 1.3 }}>{candidateName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                          ID: #{app.seekerTgId}
                        </div>
                      </div>
                    </div>

                    {candidateUsername ? (
                      <div style={{ marginTop: '6px' }}>
                        <a
                          href={`https://t.me/${candidateUsername}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            if (window.Telegram?.WebApp?.openTelegramLink) {
                              e.preventDefault();
                              window.Telegram.WebApp.openTelegramLink(`https://t.me/${candidateUsername}`);
                            }
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '0.82rem',
                            color: 'var(--accent-primary)',
                            textDecoration: 'none',
                            background: 'var(--accent-subtle)',
                            padding: '4px 10px',
                            borderRadius: '16px',
                            fontWeight: 500,
                            border: '1px solid rgba(var(--accent-primary-rgb, 59, 130, 246), 0.25)',
                          }}
                        >
                          <Icon icon="solar:plain-bold" width="13" height="13" />
                          <span>@{candidateUsername}</span>
                          <Icon icon="solar:arrow-right-up-linear" width="11" height="11" style={{ opacity: 0.7 }} />
                        </a>
                      </div>
                    ) : (
                      <div style={{ marginTop: '6px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            const url = `tg://user?id=${app.seekerTgId}`;
                            if (window.Telegram?.WebApp?.openTelegramLink) {
                              window.Telegram.WebApp.openTelegramLink(url);
                            } else {
                              window.open(url, '_blank');
                            }
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '0.82rem',
                            color: 'var(--accent-primary)',
                            background: 'var(--accent-subtle)',
                            padding: '4px 10px',
                            borderRadius: '16px',
                            fontWeight: 500,
                            border: '1px solid rgba(var(--accent-primary-rgb, 59, 130, 246), 0.25)',
                            cursor: 'pointer',
                          }}
                        >
                          <Icon icon="solar:chat-round-dots-bold" width="13" height="13" />
                          <span>{t('profile.contact_via_tg')}</span>
                          <Icon icon="solar:arrow-right-up-linear" width="11" height="11" style={{ opacity: 0.7 }} />
                        </button>
                      </div>
                    )}

                    {(app.user?.phone || app.resume?.contacts) && (
                      <div
                        style={{
                          marginTop: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.8rem',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <Icon icon="solar:phone-bold" width="13" height="13" style={{ color: 'var(--accent-primary)' }} />
                        <span>{app.user?.phone || app.resume?.contacts}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ flexShrink: 0 }}>{getStatusBadge(app.status)}</div>
                </div>

                {/* Resume information: full card with view action or no-resume indicator */}
                {app.resume ? (
                  <div
                    onClick={() => {
                      setViewingResume({
                        ...app.resume,
                        candidateName,
                        username: candidateUsername,
                        phone: app.user?.phone,
                        seekerTgId: app.seekerTgId,
                      });
                    }}
                    style={{
                      background: 'var(--bg-input)',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      fontSize: '0.85rem',
                      borderLeft: '3px solid var(--accent-primary)',
                      border: '1px solid rgba(var(--accent-primary-rgb, 59, 130, 246), 0.25)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Icon icon="solar:document-text-bold" width="16" height="16" style={{ color: 'var(--accent-primary)' }} />
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {app.resume.title}
                        </span>
                      </div>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '0.78rem',
                          color: 'var(--accent-primary)',
                          fontWeight: 500,
                        }}
                      >
                        <span>{t('resumes.view_resume_btn')}</span>
                        <Icon icon="solar:arrow-right-linear" width="12" height="12" />
                      </div>
                    </div>
                    {app.resume.skills && (
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        {Array.isArray(app.resume.skills) ? app.resume.skills.join(', ') : app.resume.skills}
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      background: 'var(--bg-input)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem',
                      color: 'var(--text-tertiary)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      border: '1px dashed var(--border-subtle)',
                    }}
                  >
                    <Icon icon="solar:document-cross-linear" width="15" height="15" />
                    <span>{t('profile.no_resume_attached')}</span>
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

                {/* Action Buttons: 2 equal-width buttons in one row */}
                <div
                  style={{
                    display: 'flex',
                    gap: '10px',
                    width: '100%',
                    marginTop: '4px',
                    paddingTop: '10px',
                    borderTop: '1px solid var(--border-subtle)',
                  }}
                >
                  {app.status !== 'rejected' && (
                    <Button
                      variant="outline"
                      size="md"
                      icon="solar:close-circle-bold"
                      loading={updatingId === app.id}
                      onClick={() => handleUpdateStatus(app.id, 'rejected')}
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      {t('profile.status_reject_btn')}
                    </Button>
                  )}

                  {app.status !== 'accepted' && (
                    <Button
                      variant="primary"
                      size="md"
                      icon="solar:check-circle-bold"
                      loading={updatingId === app.id}
                      onClick={() => handleUpdateStatus(app.id, 'accepted')}
                      style={{ flex: 1, justifyContent: 'center' }}
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

    <ResumeDetailModal
      resume={viewingResume}
      isOpen={Boolean(viewingResume)}
      onClose={() => setViewingResume(null)}
    />
  </>
);
}
