/**
 * EasyFindBot — Resume Detail Modal
 */

import React from 'react';
import { Icon } from '@iconify/react';
import { useTranslation } from '../../locales/index.jsx';
import { Modal, Badge, Button } from '../../components/common/index.js';

export function ResumeDetailModal({ resume, isOpen, onClose }) {
  const { t } = useTranslation();

  if (!resume) return null;

  const {
    title,
    fullName,
    candidateName,
    category,
    region,
    experienceYears = 0,
    expectedSalary,
    salaryCurrency = 'USD',
    skills,
    bio,
    contacts,
    phone,
    username,
    seekerTgId,
  } = resume;

  const userFullName = resume.user ? [resume.user.firstName, resume.user.lastName].filter(Boolean).join(' ') : '';
  const displayName = candidateName || fullName || userFullName || '';
  const displayContacts = contacts || phone || (username ? `@${username}` : '');

  const skillsList = Array.isArray(skills)
    ? skills
    : typeof skills === 'string' && skills.trim()
      ? skills.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

  const handleOpenTelegram = () => {
    const url = username ? `https://t.me/${username}` : `tg://user?id=${seekerTgId}`;
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('resumes.details_title')}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Candidate & Position Header */}
        <div>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '4px', fontWeight: 700 }}>
            {title}
          </h2>
          {displayName && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.92rem',
                color: 'var(--text-secondary)',
                fontWeight: 500,
              }}
            >
              <Icon icon="solar:user-bold" width="16" height="16" style={{ color: 'var(--accent-primary)' }} />
              <span>{displayName}</span>
            </div>
          )}
        </div>

        {/* Badges Row */}
        <div className="card-meta-row">
          <Badge variant="primary" icon="solar:user-bold">
            {experienceYears} {t('common.experience_years')}
          </Badge>
          <Badge variant="neutral" icon="solar:widget-bold">
            {t(`categories.${category}`) || category}
          </Badge>
          <Badge variant="neutral" icon="solar:map-point-bold">
            {t(`regions.${region}`) || region}
          </Badge>
        </div>

        {/* Expected Salary Box (if specified) */}
        {expectedSalary && (
          <div
            style={{
              background: 'var(--bg-input)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              {t('common.expected_salary')}
            </div>
            <div className="card-salary-box" style={{ fontSize: '1.1rem' }}>
              <span>{Number(expectedSalary) ? Number(expectedSalary).toLocaleString() : expectedSalary}</span>
              <span className="card-salary-unit"> {salaryCurrency}</span>
            </div>
          </div>
        )}

        {/* Skills Section */}
        {skillsList.length > 0 && (
          <div>
            <h4 style={{ fontSize: '0.92rem', marginBottom: '8px', fontWeight: 600 }}>
              {t('resumes.skills_header')}
            </h4>
            <div className="skills-wrap">
              {skillsList.map((skill, idx) => (
                <span key={idx} className="skill-tag" style={{ fontSize: '0.82rem', padding: '4px 10px' }}>
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Bio / About Section */}
        {bio && (
          <div>
            <h4 style={{ fontSize: '0.92rem', marginBottom: '6px', fontWeight: 600 }}>
              {t('resumes.bio_header')}
            </h4>
            <div
              style={{
                background: 'var(--bg-input)',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.88rem',
                lineHeight: 1.5,
                color: 'var(--text-secondary)',
                whiteSpace: 'pre-wrap',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {bio}
            </div>
          </div>
        )}

        {/* Contacts Section */}
        {displayContacts && (
          <div>
            <h4 style={{ fontSize: '0.92rem', marginBottom: '6px', fontWeight: 600 }}>
              {t('common.contacts')}
            </h4>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                }}
              >
                <Icon icon="solar:phone-calling-bold" width="16" height="16" style={{ color: 'var(--accent-primary)' }} />
                <span>{displayContacts}</span>
              </div>

              {(username || seekerTgId) && (
                <button
                  type="button"
                  onClick={handleOpenTelegram}
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
                  <Icon icon="solar:plain-bold" width="13" height="13" />
                  <span>{username ? `@${username}` : t('profile.contact_via_tg')}</span>
                  <Icon icon="solar:arrow-right-up-linear" width="11" height="11" style={{ opacity: 0.7 }} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Footer Button */}
        <div style={{ marginTop: '8px' }}>
          <Button
            variant="secondary"
            size="md"
            onClick={onClose}
            style={{ width: '100%' }}
          >
            {t('common.close')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
