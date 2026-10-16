/**
 * EasyFindBot — Create / Edit Resume Modal
 */

import React, { useState, useEffect } from 'react';
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
        category: existingResume.category || 'it',
        region: existingResume.region || 'tashkent',
        experienceYears: existingResume.experienceYears || 0,
        skills: existingResume.skills || '',
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
    if (!formData.skills.trim()) errs.skills = t('common.error');
    if (!formData.contacts.trim()) errs.contacts = t('common.error');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      setSaving(true);
      const res = await api.createResume(formData);
      if (res && res.ok) {
        setResume({ ...existingResume, ...formData, id: res.resumeId, status: 'active' });
        if (onSaved) onSaved();
        onClose();
      }
    } catch (err) {
      console.error('Failed to save resume:', err);
    } finally {
      setSaving(false);
    }
  };

  const categoryOptions = CATEGORIES.map((c) => ({
    value: c.id,
    label: t(`categories.${c.id}`) || c.id,
  }));

  const regionOptions = REGIONS.map((r) => ({
    value: r,
    label: t(`regions.${r}`) || r,
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={existingResume ? t('resumes.modal_title_edit') : t('resumes.modal_title_create')}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
