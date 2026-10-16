/**
 * EasyFindBot — Unified Reusable VacancyCard Component
 */

import React from 'react';
import { Icon } from '@iconify/react';
import { useTranslation } from '../../locales/index.jsx';
import { Badge } from './Badge.jsx';

export function VacancyCard({
  vacancy,
  onClick,
  hasApplied = false,
  showStatus = false,
  onActionClick = null,
  actionLabel = null,
  actionIcon = null,
  className = '',
}) {
  const { t } = useTranslation();

  if (!vacancy) return null;

  const {
    title,
    company,
    category,
    region,
    employmentType,
    salaryType,
    salaryMin,
    salaryMax,
    currency = 'UZS',
    status,
    viewsCount = 0,
    createdAt,
  } = vacancy;

  // Format Salary Display
  const renderSalary = () => {
    if (salaryType === 'negotiable') {
      return (
        <span className="card-salary-box" style={{ fontSize: '0.95rem' }}>
          {t('salary_types.negotiable')}
        </span>
      );
    }
    if (salaryType === 'fixed') {
      return (
        <div className="card-salary-box">
          <span>{Number(salaryMin).toLocaleString()}</span>
          <span className="card-salary-unit">
            {currency} {t('vacancies.per_month')}
          </span>
        </div>
      );
    }
    return (
      <div className="card-salary-box">
        <span>
          {Number(salaryMin).toLocaleString()} - {Number(salaryMax).toLocaleString()}
        </span>
        <span className="card-salary-unit">
          {currency} {t('vacancies.per_month')}
        </span>
      </div>
    );
  };

  const getStatusBadgeVariant = (st) => {
    switch (st) {
      case 'approved':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
      case 'closed':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  return (
    <div className={`glass-card vacancy-card ${className}`} onClick={onClick}>
      <div className="card-top">
        <div className="card-title-group">
          <h4 className="card-job-title">{title}</h4>
          <span className="card-company-name">
            <Icon icon="solar:buildings-2-bold" width="15" height="15" />
            {company}
          </span>
        </div>

        {hasApplied && (
          <Badge variant="primary" icon="solar:check-circle-bold">
            {t('vacancies.applied_btn')}
          </Badge>
        )}

        {showStatus && status && (
          <Badge variant={getStatusBadgeVariant(status)}>
            {t(`statuses.${status}`) || status}
          </Badge>
        )}
      </div>

      <div className="card-meta-row">
        <Badge variant="neutral" icon="solar:widget-bold">
          {t(`categories.${category}`) || category}
        </Badge>
        <Badge variant="neutral" icon="solar:map-point-bold">
          {t(`regions.${region}`) || region}
        </Badge>
        {employmentType && (
          <Badge variant="neutral" icon="solar:clock-circle-bold">
            {t(`employment_types.${employmentType}`) || employmentType}
          </Badge>
        )}
      </div>

      {renderSalary()}

      <div className="card-footer-row">
        <div className="card-footer-item">
          <Icon icon="solar:eye-bold" width="14" height="14" />
          <span>
            {viewsCount} {t('common.views')}
          </span>
        </div>

        {onActionClick && actionLabel ? (
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={(e) => {
              e.stopPropagation();
              onActionClick(vacancy);
            }}
          >
            {actionIcon && <Icon icon={actionIcon} width="14" height="14" />}
            {actionLabel}
          </button>
        ) : (
          <div className="card-footer-item">
            <Icon icon="solar:calendar-bold" width="14" height="14" />
            <span>
              {createdAt ? new Date(createdAt).toLocaleDateString() : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
