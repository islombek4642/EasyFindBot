/**
 * EasyFindBot — Create / Edit Resume Modal
 */

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { api } from '../../services/api.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useTranslation } from '../../locales/index.jsx';
import { CATEGORIES } from '../../constants/categories.js';
import { REGIONS } from '../../constants/regions.js';
import {
  Modal,
  Input,
  Select,
  Button,
} from '../../components/common/index.js';

export function CreateResumeModal({ isOpen, onClose, existingResume = null, onSaved = null }) {
  const { t } = useTranslation();
  const { setResume } = useAuth();

  const [formData, setFormData] = useState({
    title: '',
    category: 'it',
    region: 'tashkent',
    experienceYears: 1,
    skills: '',
    expectedSalary: '',
    bio: '',
    contacts: '',
  });

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (existingResume) {
      setFormData({
        title: existingResume.title || '',
        category: existingResume.category || 'it',
        region: existingResume.region || 'tashkent',
        experienceYears: existingResume.experienceYears || 0,
        skills: Array.isArray(existingResume.skills)
          ? existingResume.skills.join(', ')
          : (existingResume.skills || ''),
        expectedSalary: existingResume.expectedSalary || '',
        bio: existingResume.bio || '',
        contacts: existingResume.contacts || '',
      });
    }
  }, [existingResume]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.title.trim()) errs.title = t('common.error');
    if (!formData.skills.trim()) errs.skills = t('common.error');
    if (!formData.contacts.trim()) errs.contacts = t('common.error');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      setSaving(true);
      const parsedSkills = typeof formData.skills === 'string'
        ? formData.skills.split(',').map((s) => s.trim()).filter(Boolean)
        : (Array.isArray(formData.skills) ? formData.skills : []);
      const payload = {
        ...formData,
        skills: parsedSkills,
      };
      const res = await api.createResume(payload);
      if (res && (res.ok || res.success)) {
        setResume({ ...existingResume, ...payload, id: res.resumeId, status: 'active' });
        if (onSaved) onSaved();
        onClose();
      } else if (res && res.error) {
        setErrors({ submit: res.error });
      }
    } catch (err) {
      console.error('Failed to save resume:', err);
      setErrors({ submit: err.message || t('common.error') });
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={existingResume ? t('resumes.modal_title_edit') : t('resumes.modal_title_create')}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <Input
          label={t('resumes.title_label')}
          placeholder={t('resumes.title_placeholder')}
          icon="solar:case-round-bold"
          required
          value={formData.title}
          onChange={(e) => updateField('title', e.target.value)}
          error={errors.title}
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

        <Input
          label={t('common.experience_years')}
          icon="solar:user-bold"
          type="number"
          value={formData.experienceYears}
          onChange={(e) => updateField('experienceYears', e.target.value)}
        />

        <Input
          label={t('resumes.skills_label')}
          placeholder={t('resumes.skills_placeholder')}
          icon="solar:star-bold"
          required
          value={formData.skills}
          onChange={(e) => updateField('skills', e.target.value)}
          error={errors.skills}
        />

        <Input
          label={t('common.expected_salary')}
          placeholder="Masalan: 1,500 USD"
          icon="solar:wallet-bold"
          value={formData.expectedSalary}
          onChange={(e) => updateField('expectedSalary', e.target.value)}
        />

        <Input
          label={t('resumes.bio_label')}
          placeholder={t('resumes.bio_placeholder')}
          multiline
          rows={3}
          value={formData.bio}
          onChange={(e) => updateField('bio', e.target.value)}
        />

        <Input
          label={t('post_job.contacts_label')}
          placeholder="@username yoki +998..."
          icon="solar:phone-calling-bold"
          required
          value={formData.contacts}
          onChange={(e) => updateField('contacts', e.target.value)}
          error={errors.contacts}
        />

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

        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          <Button variant="secondary" size="md" onClick={onClose} style={{ flex: 1 }}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            size="md"
            icon="solar:diskette-bold"
            loading={saving}
            onClick={handleSave}
            style={{ flex: 2 }}
          >
            {t('common.save')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
