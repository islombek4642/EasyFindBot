/**
 * EasyFindBot — Vacancies Discovery View
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '@iconify/react';
import { api } from '../../services/api.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useTranslation } from '../../locales/index.jsx';
import { CATEGORIES } from '../../constants/categories.js';
import { REGIONS } from '../../constants/regions.js';
import {
  Input,
  Select,
  VacancyCard,
  EmptyState,
  Skeleton,
  Button,
} from '../../components/common/index.js';
import { VacancyDetailModal } from './VacancyDetailModal.jsx';

export function VacanciesView({ initialVacancyId = null, onClearInitialVacancyId = null }) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [salaryMin, setSalaryMin] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Detail Modal & Applied State
  const [activeVacancy, setActiveVacancy] = useState(null);
  const [appliedVacancyIds, setAppliedVacancyIds] = useState(new Set());
  const [applying, setApplying] = useState(false);

  // Load User's Applied Vacancies
  const fetchMyApplications = useCallback(async () => {
    try {
      const res = await api.getMyApplications();
      if (res && res.items) {
        setAppliedVacancyIds(new Set(res.items.map((app) => app.vacancyId)));
      }
    } catch (err) {
      console.error('Failed to load my applications:', err);
    }
  }, []);

  // Fetch Vacancies List
  const fetchVacancies = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const res = await api.getVacancies({
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        region: selectedRegion !== 'all' ? selectedRegion : undefined,
        salaryMin: salaryMin ? Number(salaryMin) : undefined,
        page: pageNum,
        limit: 15,
      });

      const list = res?.items || res?.vacancies || [];
      setVacancies((prev) => (append ? [...prev, ...list] : list));
      setHasMore(res?.hasMore || false);
    } catch (err) {
      console.error('Failed to load vacancies:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [selectedCategory, selectedRegion, salaryMin]);

  useEffect(() => {
    fetchMyApplications();
  }, [fetchMyApplications]);

  useEffect(() => {
    setPage(1);
    fetchVacancies(1, false);
  }, [fetchVacancies]);

  // Deep Link Opener
  useEffect(() => {
    if (initialVacancyId) {
      api.getVacancyById({ id: initialVacancyId })
        .then((vac) => {
          if (vac) setActiveVacancy(vac);
        })
        .catch((err) => console.error('Deep link vacancy not found:', err))
        .finally(() => {
          if (onClearInitialVacancyId) onClearInitialVacancyId();
        });
    }
  }, [initialVacancyId, onClearInitialVacancyId]);

  const handleApply = async (vacId, coverLetter) => {
    try {
      setApplying(true);
      await api.applyVacancy({ vacancyId: vacId, coverLetter });
      setAppliedVacancyIds((prev) => new Set([...prev, vacId]));
    } catch (err) {
      console.error('Apply error:', err);
    } finally {
      setApplying(false);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchVacancies(nextPage, true);
  };

  const regionOptions = [
    { value: 'all', label: t('regions.all') },
    ...REGIONS.map((r) => ({ value: r, label: t(`regions.${r}`) || r })),
  ];

  // Client-side text filter on title or company
  const filteredVacancies = vacancies.filter((v) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (v.title && v.title.toLowerCase().includes(q)) ||
      (v.company && v.company.toLowerCase().includes(q))
    );
  });

  const hasActiveFilters = Boolean(
    (selectedCategory && selectedCategory !== 'all') ||
    (selectedRegion && selectedRegion !== 'all') ||
    salaryMin ||
    (searchQuery && searchQuery.trim().length > 0)
  );

  return (
    <div className="page-content">
      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <Input
          placeholder={t('vacancies.search_placeholder')}
          icon="solar:magnifer-linear"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          rightIcon={searchQuery ? 'solar:close-circle-bold' : null}
          onRightIconClick={() => setSearchQuery('')}
          style={{ flex: 1 }}
        />
        <Button
          variant={showFilters ? 'primary' : 'secondary'}
          size="md"
          icon="solar:tuning-bold"
          onClick={() => setShowFilters(!showFilters)}
          aria-label={t('common.filter')}
        />
      </div>

      {/* Filter Drawers / Options */}
      {showFilters && (
        <div
          className="glass-card"
          style={{
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <Select
            label={t('vacancies.filter_region')}
            icon="solar:map-point-bold"
            options={regionOptions}
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
          />

          <Input
            label={t('vacancies.filter_salary_min')}
            icon="solar:wallet-bold"
            type="number"
            placeholder="Masalan: 5000000"
            value={salaryMin}
            onChange={(e) => setSalaryMin(e.target.value)}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedRegion('all');
                setSelectedCategory('all');
                setSalaryMin('');
              }}
            >
              {t('common.clear')}
            </Button>
          </div>
        </div>
      )}

      {/* Category Horizontal Pills */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '4px',
          scrollbarWidth: 'none',
        }}
      >
        <button
          type="button"
          className={`badge-pill ${selectedCategory === 'all' ? 'badge-primary' : 'badge-neutral'}`}
          onClick={() => setSelectedCategory('all')}
          style={{ cursor: 'pointer', border: 'none' }}
        >
          <Icon icon="solar:widget-bold" width="14" height="14" />
          {t('categories.all')}
        </button>
        {CATEGORIES.map((cat) => {
          const isSel = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              className={`badge-pill ${isSel ? 'badge-primary' : 'badge-neutral'}`}
              onClick={() => setSelectedCategory(cat.id)}
              style={{ cursor: 'pointer', border: 'none' }}
            >
              <Icon icon={cat.icon} width="14" height="14" />
              {t(`categories.${cat.id}`) || cat.id}
            </button>
          );
        })}
      </div>

      {/* Vacancy Feed */}
      {loading ? (
        <Skeleton type="card" count={4} />
      ) : filteredVacancies.length === 0 ? (
        <EmptyState
          icon="solar:folder-open-bold"
          title={t('vacancies.empty_title')}
          description={hasActiveFilters ? t('vacancies.empty_desc') : t('vacancies.empty_no_data')}
          actionLabel={hasActiveFilters ? t('common.clear_filters') : t('common.refresh')}
          actionIcon={hasActiveFilters ? 'solar:filter-remove-bold' : 'solar:restart-bold'}
          onAction={() => {
            if (hasActiveFilters) {
              setSelectedCategory('all');
              setSelectedRegion('all');
              setSalaryMin('');
              setSearchQuery('');
            } else {
              setPage(1);
              fetchVacancies(1, false);
            }
          }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredVacancies.map((vac) => (
            <VacancyCard
              key={vac.id}
              vacancy={vac}
              hasApplied={appliedVacancyIds.has(vac.id)}
              onClick={() => setActiveVacancy(vac)}
            />
          ))}

          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: '8px' }}>
              <Button
                variant="secondary"
                size="md"
                loading={loadingMore}
                onClick={handleLoadMore}
              >
                {t('common.loading')}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Vacancy Detail Modal */}
      <VacancyDetailModal
        vacancy={activeVacancy}
        isOpen={Boolean(activeVacancy)}
        onClose={() => setActiveVacancy(null)}
        hasApplied={activeVacancy ? appliedVacancyIds.has(activeVacancy.id) : false}
        onApply={handleApply}
        applying={applying}
      />
    </div>
  );
}
