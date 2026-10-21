/**
 * EasyFindBot — 4-Step Job Posting Wizard
 */

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { api } from '../../services/api.js';
import { useTranslation } from '../../locales/index.jsx';
import { CATEGORIES } from '../../constants/categories.js';
import { REGIONS } from '../../constants/regions.js';
import { SALARY_TYPES } from '../../constants/salaryTypes.js';
import {
  Input,
  Select,
  Button,
  Badge,
} from '../../components/common/index.js';

const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'remote', 'internship'];

export function PostJobWizard({ onSuccess }) {
  const { t } = useTranslation();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    category: 'it',
    region: 'tashkent',
    employmentType: 'full_time',
    salaryType: 'range',
    salaryMin: '',
    salaryMax: '',
    currency: 'UZS',
    description: '',
    requirements: '',
    contacts: '',
  });

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validateStep = (currentStep) => {
    const errs = {};
    if (currentStep === 1) {
      if (!formData.title.trim()) errs.title = t('common.required_field');
      if (!formData.company.trim()) errs.company = t('common.required_field');
    } else if (currentStep === 2) {
      if (formData.salaryType === 'fixed' && !formData.salaryMin) {
        errs.salaryMin = t('common.required_field');
      } else if (formData.salaryType === 'range') {
        if (!formData.salaryMin) errs.salaryMin = t('common.required_field');
        if (!formData.salaryMax) errs.salaryMax = t('common.required_field');
      }
    } else if (currentStep === 3) {
      if (!formData.description.trim()) errs.description = t('common.required_field');
      if (!formData.requirements.trim()) errs.requirements = t('common.required_field');
    } else if (currentStep === 4) {
      if (!formData.contacts.trim()) errs.contacts = t('common.required_field');
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        companyName: formData.company,
        salaryCurrency: formData.currency,
      };
      const res = await api.createVacancy(payload);
      if (res && res.success === false) {
        setErrors({ submit: res.error || t('common.error') });
        return;
      }
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to create vacancy:', err);
      setErrors({ submit: err.message || t('common.error') });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="page-content" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div
          className="glass-card"
          style={{
            padding: '32px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            maxWidth: '420px',
            width: '100%',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '9999px',
              background: 'var(--success-subtle)',
              color: 'var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon icon="solar:check-circle-bold" width="36" height="36" />
          </div>
          <h2 style={{ fontSize: '1.25rem' }}>{t('post_job.success_title')}</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {t('post_job.success_desc')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: '8px' }}>
            <Button
              variant="primary"
              size="md"
              icon="solar:check-read-bold"
              onClick={() => {
                if (onSuccess) onSuccess();
              }}
              style={{ width: '100%' }}
            >
              {t('post_job.view_vacancies')}
            </Button>
            <Button
              variant="secondary"
              size="md"
              icon="solar:add-circle-bold"
              onClick={() => {
                setFormData({
                  title: '',
                  company: '',
                  category: 'it',
                  region: 'tashkent',
                  employmentType: 'full_time',
                  salaryType: 'range',
                  salaryMin: '',
                  salaryMax: '',
                  currency: 'UZS',
                  description: '',
                  requirements: '',
                  contacts: '',
                });
                setSubmitted(false);
                setStep(1);
              }}
              style={{ width: '100%' }}
            >
              {t('nav.post_job')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const categoryOptions = CATEGORIES.map((c) => ({
    value: c.id,
    label: t(`categories.${c.id}`) || c.id,
    icon: c.icon,
  }));

  const regionOptions = REGIONS.map((r) => ({
    value: r,
    label: t(`regions.${r}`) || r,
    icon: r === 'remote' ? 'solar:global-bold' : 'solar:map-point-bold',
  }));

  const employmentOptions = EMPLOYMENT_TYPES.map((et) => ({
    value: et,
    label: t(`employment_types.${et}`) || et,
    icon:
      et === 'full_time'
        ? 'solar:case-round-bold'
        : et === 'part_time'
        ? 'solar:clock-circle-bold'
        : et === 'remote'
        ? 'solar:laptop-bold'
        : 'solar:diploma-bold',
  }));

  const salaryTypeOptions = (Array.isArray(SALARY_TYPES) ? SALARY_TYPES : Object.values(SALARY_TYPES)).map((st) => ({
    value: st,
    label: t(`salary_types.${st}`) || st,
    icon:
      st === 'fixed'
        ? 'solar:tag-price-bold'
        : st === 'range'
        ? 'solar:chart-2-bold'
        : 'solar:hand-shake-bold',
  }));

  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2>{t('post_job.wizard_title')}</h2>
        <Badge variant="primary">
          {step} / 4
        </Badge>
      </div>

      {/* Progress Track */}
      <div
        style={{
          width: '100%',
          height: '4px',
          background: 'var(--bg-input)',
          borderRadius: '9999px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${(step / 4) * 100}%`,
            height: '100%',
            background: 'var(--accent-gradient)',
            transition: 'width var(--transition-normal)',
          }}
        />
      </div>

      <div
        className="glass-card"
        style={{
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Step 1: Basic Information */}
        {step === 1 && (
          <>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--accent-primary)' }}>
              {t('post_job.step_basic')}
            </h3>

            <Input
              label={t('post_job.title_label')}
              placeholder={t('post_job.title_placeholder')}
              icon="solar:pen-bold"
              required
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
              error={errors.title}
            />

            <Input
              label={t('post_job.company_label')}
              placeholder={t('post_job.company_placeholder')}
              icon="solar:buildings-2-bold"
              required
              value={formData.company}
              onChange={(e) => updateField('company', e.target.value)}
              error={errors.company}
            />

            <Select
              label={t('post_job.category_label')}
              icon="solar:widget-bold"
              options={categoryOptions}
              value={formData.category}
              onChange={(e) => updateField('category', e.target.value)}
            />

            <Select
              label={t('post_job.region_label')}
              icon="solar:map-point-bold"
              options={regionOptions}
              value={formData.region}
              onChange={(e) => updateField('region', e.target.value)}
            />

            <Select
              label={t('post_job.type_label')}
              icon="solar:clock-circle-bold"
              options={employmentOptions}
              value={formData.employmentType}
              onChange={(e) => updateField('employmentType', e.target.value)}
            />
          </>
        )}

        {/* Step 2: Compensation */}
        {step === 2 && (
          <>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--accent-primary)' }}>
              {t('post_job.step_salary')}
            </h3>

            <Select
              label={t('post_job.salary_type_label')}
              icon="solar:wallet-bold"
              options={salaryTypeOptions}
              value={formData.salaryType}
              onChange={(e) => updateField('salaryType', e.target.value)}
            />

            {formData.salaryType !== 'negotiable' && (
              <>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Input
                    label={
                      formData.salaryType === 'fixed'
                        ? t('common.salary')
                        : t('post_job.salary_min_label')
                    }
                    type="number"
                    icon="solar:dollar-minimalistic-bold"
                    placeholder="1000"
                    value={formData.salaryMin}
                    onChange={(e) => updateField('salaryMin', e.target.value)}
                    error={errors.salaryMin}
                    style={{ flex: 1 }}
                  />

                  {formData.salaryType === 'range' && (
                    <Input
                      label={t('post_job.salary_max_label')}
                      type="number"
                      icon="solar:dollar-minimalistic-bold"
                      placeholder="2000"
                      value={formData.salaryMax}
                      onChange={(e) => updateField('salaryMax', e.target.value)}
                      error={errors.salaryMax}
                      style={{ flex: 1 }}
                    />
                  )}
                </div>

                <Select
                  label={t('post_job.currency_label')}
                  icon="solar:card-2-bold"
                  options={[
                    { value: 'UZS', label: "UZS (So'm)", icon: 'solar:bill-check-bold' },
                    { value: 'USD', label: 'USD ($)', icon: 'solar:dollar-minimalistic-bold' },
                  ]}
                  value={formData.currency}
                  onChange={(e) => updateField('currency', e.target.value)}
                />
              </>
            )}
          </>
        )}

        {/* Step 3: Description & Requirements */}
        {step === 3 && (
          <>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--accent-primary)' }}>
              {t('post_job.step_details')}
            </h3>

            <Input
              label={t('post_job.desc_label')}
              placeholder={t('post_job.desc_placeholder')}
              multiline
              rows={4}
              required
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              error={errors.description}
            />

            <Input
              label={t('post_job.req_label')}
              placeholder={t('post_job.req_placeholder')}
              multiline
              rows={4}
              required
              value={formData.requirements}
              onChange={(e) => updateField('requirements', e.target.value)}
              error={errors.requirements}
            />
          </>
        )}

        {/* Step 4: Contacts & Summary */}
        {step === 4 && (
          <>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--accent-primary)' }}>
              {t('post_job.step_contacts')}
            </h3>

            <Input
              label={t('post_job.contacts_label')}
              placeholder={t('post_job.contacts_placeholder')}
              icon="solar:phone-calling-bold"
              required
              value={formData.contacts}
              onChange={(e) => updateField('contacts', e.target.value)}
              error={errors.contacts}
            />

            {/* Premium Summary Preview Card */}
            <div className="preview-card">
              {/* Gradient Header */}
              <div className="preview-card-header">
                <div className="preview-card-avatar">
                  <Icon icon="solar:buildings-2-bold" width="22" height="22" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="preview-card-title">{formData.title}</div>
                  <div className="preview-card-company">{formData.company}</div>
                </div>
                <div className="preview-card-status-dot" />
              </div>

              {/* Tags Row */}
              <div className="preview-card-tags">
                <Badge variant="primary">{t(`categories.${formData.category}`)}</Badge>
                <Badge variant="neutral">{t(`regions.${formData.region}`)}</Badge>
                <Badge variant="neutral">{t(`employment_types.${formData.employmentType}`)}</Badge>
              </div>

              {/* Info Rows */}
              <div className="preview-info-rows">
                {/* Salary */}
                <div className="preview-info-row">
                  <div className="preview-info-icon salary">
                    <Icon icon="solar:wallet-money-bold" width="14" height="14" />
                  </div>
                  <div className="preview-info-content">
                    <span className="preview-info-label">{t('common.salary')}</span>
                    <span className="preview-info-value salary-value">
                      {formData.salaryType === 'negotiable'
                        ? t('salary_types.negotiable')
                        : formData.salaryMin
                        ? `${Number(formData.salaryMin).toLocaleString()}${
                            formData.salaryType === 'range' && formData.salaryMax
                              ? ` – ${Number(formData.salaryMax).toLocaleString()}`
                              : ''
                          } ${formData.currency}`
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="preview-divider" />

              {/* Description */}
              {formData.description && (
                <div className="preview-section">
                  <div className="preview-section-label">
                    <Icon icon="solar:document-text-bold" width="13" height="13" />
                    {t('common.description')}
                  </div>
                  <div className="preview-section-text">{formData.description}</div>
                </div>
              )}

              {/* Requirements */}
              {formData.requirements && (
                <div className="preview-section">
                  <div className="preview-section-label">
                    <Icon icon="solar:checklist-minimalistic-bold" width="13" height="13" />
                    {t('common.requirements')}
                  </div>
                  <div className="preview-section-text">{formData.requirements}</div>
                </div>
              )}

              {/* Contacts */}
              {formData.contacts && (
                <div className="preview-contacts-row">
                  <Icon icon="solar:phone-calling-bold" width="14" height="14" />
                  <span>{formData.contacts}</span>
                </div>
              )}
            </div>
          </>
        )}

        {errors.submit && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--color-danger, #ef4444)',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Icon icon="solar:danger-triangle-bold" width="18" height="18" />
            <span>{errors.submit}</span>
          </div>
        )}

        {/* Nav Buttons */}
        <div
          style={{
            display: 'flex',
            flexDirection: step === 4 ? 'column-reverse' : 'row',
            gap: '10px',
            marginTop: '8px',
          }}
        >
          {step > 1 && (
            <Button
              variant="secondary"
              size="md"
              icon="solar:alt-arrow-left-linear"
              onClick={handleBack}
              style={step === 4 ? { width: '100%' } : { flex: 1 }}
            >
              {t('common.back')}
            </Button>
          )}

          {step < 4 ? (
            <Button
              variant="primary"
              size="md"
              iconRight="solar:alt-arrow-right-linear"
              onClick={handleNext}
              style={{ flex: 2 }}
            >
              {t('common.next')}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              icon="solar:plain-bold"
              loading={submitting}
              onClick={handleSubmit}
              style={{ width: '100%' }}
            >
              {t('post_job.submit_btn')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
