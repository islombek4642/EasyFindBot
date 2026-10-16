/**
 * EasyFindBot — Unified Reusable ResumeCard Component
 */

import React from 'react';
import { Icon } from '@iconify/react';
import { useTranslation } from '../../locales/index.jsx';
import { Badge } from './Badge.jsx';

export function ResumeCard({
  resume,
  onClick,
  onActionClick = null,
  actionLabel = null,
  actionIcon = null,
  className = '',
}) {
  const { t } = useTranslation();

  if (!resume) return null;

  const {
    fullName,
    title,
    category,
    region,
    experienceYears = 0,
    skills,
    expectedSalary,
    salaryCurrency = 'USD',
    bio,
    contacts,
  } = resume;

  const skillsList = Array.isArray(skills)
    ? skills
    : typeof skills === 'string' && skills.trim()
      ? skills.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

  return (
    <div className={`glass-card resume-card ${className}`} onClick={onClick}>
      <div className="card-top">
        <div className="card-title-group">
          <h4 className="card-job-title">{title || fullName || t('roles.seeker')}</h4>
          <span className="card-company-name">
            <Icon icon="solar:user-bold" width="15" height="15" />
            {fullName || t(`categories.${category}`) || category}
          </span>
        </div>

        {expectedSalary && (
          <div className="card-salary-box" style={{ fontSize: '0.95rem' }}>
            {Number(expectedSalary) ? `${Number(expectedSalary).toLocaleString()} ${salaryCurrency}` : expectedSalary}
          </div>
        )}
      </div>

      <div className="card-meta-row">
        <Badge variant="primary" icon="solar:user-bold">
          {experienceYears} {t('common.experience_years')}
        </Badge>
        <Badge variant="neutral" icon="solar:map-point-bold">
          {t(`regions.${region}`) || region}
        </Badge>
      </div>

      {bio && (
        <p
          style={{
            fontSize: '0.85rem',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {bio}
        </p>
      )}

      {skillsList.length > 0 && (
        <div className="skills-wrap">
          {skillsList.slice(0, 5).map((skill, idx) => (
            <span key={idx} className="skill-tag">
              {skill}
            </span>
          ))}
          {skillsList.length > 5 && (
            <span className="skill-tag">+{skillsList.length - 5}</span>
          )}
        </div>
      )}

      <div className="card-footer-row">
        <div className="card-footer-item">
          <Icon icon="solar:phone-calling-bold" width="14" height="14" />
          <span>{contacts}</span>
        </div>

        {onActionClick && actionLabel && (
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={(e) => {
              e.stopPropagation();
              onActionClick(resume);
            }}
          >
            {actionIcon && <Icon icon={actionIcon} width="14" height="14" />}
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
