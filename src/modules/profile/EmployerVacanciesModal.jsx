/**
 * EasyFindBot — Employer's Posted Vacancies Modal
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api.js';
import { useTranslation } from '../../locales/index.jsx';
import {
  Modal,
  VacancyCard,
  EmptyState,
  Skeleton,
  Button,
} from '../../components/common/index.js';

export function EmployerVacanciesModal({
  isOpen,
  onClose,
  onViewApplicants,
}) {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMyVacancies = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getMyVacancies();
      const list = res?.items || res?.vacancies || [];
      setItems(list);
    } catch (err) {
      console.error('Failed to load my vacancies:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchMyVacancies();
    }
  }, [isOpen, fetchMyVacancies]);

  const handleCloseVacancy = async (vac) => {
    try {
      await api.closeVacancy({ id: vac.id });
      setItems((prev) =>
        prev.map((item) => (item.id === vac.id ? { ...item, status: 'closed' } : item))
      );
    } catch (err) {
      console.error('Failed to close vacancy:', err);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('profile.my_vacancies')}>
      {loading ? (
        <Skeleton type="card" count={2} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="solar:folder-error-bold"
          title={t('profile.no_vacancies')}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {items.map((vac) => (
            <div key={vac.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <VacancyCard
                vacancy={vac}
                showStatus
                onClick={() => onViewApplicants(vac)}
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <Button
                  variant="secondary"
                  size="sm"
                  icon="solar:users-group-rounded-bold"
                  onClick={() => onViewApplicants(vac)}
                >
                  {t('profile.applicants_title')}
                </Button>
                {vac.status === 'approved' && (
                  <Button
                    variant="danger"
                    size="sm"
                    icon="solar:close-circle-bold"
                    onClick={() => handleCloseVacancy(vac)}
                  >
                    {t('common.close')}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
