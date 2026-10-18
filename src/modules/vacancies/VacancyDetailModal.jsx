/**
 * EasyFindBot — Vacancy Detail & Application Modal
 */

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { useTranslation } from '../../locales/index.jsx';
import { Modal, Badge, Button, Input } from '../../components/common/index.js';

export function VacancyDetailModal({
  vacancy: rawVacancy,
  isOpen,
  onClose,
  hasApplied,
  onApply,
  applying = false,
}) {
  const { t } = useTranslation();
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');

  const vacancy = rawVacancy?.vacancy || rawVacancy;
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
    description,
    requirements,
    contacts,
    viewsCount = 0,
  } = vacancy;

  const displayCompany = companyName || company || '';
  const displayCurrency = salaryCurrency || currency || 'UZS';

  const renderSalary = () => {
    if (salaryType === 'negotiable') {
      return (
        <span className="card-salary-box" style={{ fontSize: '1.1rem' }}>
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
        <span className="card-salary-box" style={{ fontSize: '1.1rem' }}>
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

  const handleSubmitApply = async () => {
    await onApply(vacancy.id, coverLetter);
    setShowApplyForm(false);
    setCoverLetter('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setShowApplyForm(false);
        onClose();
      }}
      title={t('vacancies.details_title')}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>{title}</h2>
          <div className="card-company-name" style={{ fontSize: '0.95rem' }}>
            <Icon icon="solar:buildings-2-bold" width="16" height="16" />
            {displayCompany}
          </div>
        </div>

        <div className="card-meta-row">
          <Badge variant="primary" icon="solar:widget-bold">
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

        <div
          style={{
            background: 'var(--bg-input)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            {t('common.salary')}
          </div>
          {renderSalary()}
        </div>

        {description && (
          <div>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '6px' }}>{t('common.description')}</h4>
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{description}</p>
          </div>
        )}

        {requirements && (
          <div>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '6px' }}>{t('common.requirements')}</h4>
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{requirements}</p>
          </div>
        )}

        {contacts && (
          <div>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '6px' }}>{t('common.contacts')}</h4>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--accent-primary)',
                fontWeight: 600,
              }}
            >
              <Icon icon="solar:phone-calling-bold" width="18" height="18" />
              <span>{contacts}</span>
            </div>
          </div>
        )}

        {/* Action / Apply Section */}
        <div style={{ marginTop: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          {hasApplied ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--success)' }}>
              <Icon icon="solar:check-circle-bold" width="22" height="22" />
              <span style={{ fontWeight: 600 }}>{t('vacancies.applied_btn')}</span>
            </div>
          ) : showApplyForm ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Input
                multiline
                rows={3}
                placeholder={t('post_job.desc_placeholder')}
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setShowApplyForm(false)}
                  style={{ flex: 1 }}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  icon="solar:plain-bold"
                  loading={applying}
                  onClick={handleSubmitApply}
                  style={{ flex: 2 }}
                >
                  {t('common.apply')}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="primary"
              size="lg"
              icon="solar:letter-bold"
              onClick={() => setShowApplyForm(true)}
            >
              {t('vacancies.apply_btn')}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
