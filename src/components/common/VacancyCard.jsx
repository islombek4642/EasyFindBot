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
    companyName,
    category,
    region,
    employmentType,
    salaryType,
    salaryMin,
    salaryMax,
    currency,
    salaryCurrency,
    status,
    viewsCount = 0,
    createdAt,
  } = vacancy;

  const displayCompany = companyName || company || '';
  const displayCurrency = salaryCurrency || currency || 'UZS';

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
          <span>{Number(salaryMin || 0).toLocaleString()}</span>
          <span className="card-salary-unit">
            {displayCurrency} {t('vacancies.per_month')}
          </span>
        </div>
      );
    }
    if (!Number(salaryMin) && !Number(salaryMax)) {
      return (
        <span className="card-salary-box" style={{ fontSize: '0.95rem' }}>
          {t('salary_types.negotiable')}
        </span>
      );
    }
    return (
      <div className="card-salary-box">
        <span>
          {Number(salaryMin || 0).toLocaleString()} - {Number(salaryMax || 0).toLocaleString()}
        </span>
        <span className="card-salary-unit">
          {displayCurrency} {t('vacancies.per_month')}
        </span>
      </div>
    );
  };

  const formatDate = (val) => {
    if (!val) return '';
    try {
      const num = Number(val);
      if (!isNaN(num) && num > 0) {
        const ms = num < 1e11 ? num * 1000 : num;
        const d = new Date(ms);
        return isNaN(d.getTime()) ? '' : d.toLocaleDateString();
      }
      const iso = typeof val === 'string' ? val.replace(' ', 'T') : val;
      const d = new Date(iso);
      return isNaN(d.getTime()) ? '' : d.toLocaleDateString();
    } catch {
      return '';
    }
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
            {displayCompany}
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
              {formatDate(createdAt)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
