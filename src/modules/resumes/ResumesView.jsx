/**
 * EasyFindBot — Resumes / Specialists Discovery View
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
  ResumeCard,
  EmptyState,
  Skeleton,
  Button,
} from '../../components/common/index.js';
import { CreateResumeModal } from './CreateResumeModal.jsx';

export function ResumesView() {
  const { t } = useTranslation();
  const { resume } = useAuth();

  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Modal
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchResumes = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const res = await api.getResumes({
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        region: selectedRegion !== 'all' ? selectedRegion : undefined,
        page: pageNum,
        limit: 15,
      });

      const list = res?.items || res?.resumes || [];
      setResumes((prev) => (append ? [...prev, ...list] : list));
      setHasMore(res?.hasMore || false);
    } catch (err) {
      console.error('Failed to load resumes:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [selectedCategory, selectedRegion]);

  useEffect(() => {
    setPage(1);
    fetchResumes(1, false);
  }, [fetchResumes]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchResumes(nextPage, true);
  };

  const regionOptions = [
    { value: 'all', label: t('regions.all') },
    ...REGIONS.map((r) => ({ value: r, label: t(`regions.${r}`) || r })),
  ];

  const filteredResumes = resumes.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const skillsStr = Array.isArray(r.skills) ? r.skills.join(' ') : (r.skills || '');
    return (
      (r.title && r.title.toLowerCase().includes(q)) ||
      (r.fullName && r.fullName.toLowerCase().includes(q)) ||
      skillsStr.toLowerCase().includes(q)
    );
  });

  const hasActiveFilters = Boolean(
    (selectedCategory && selectedCategory !== 'all') ||
    (selectedRegion && selectedRegion !== 'all') ||
    (searchQuery && searchQuery.trim().length > 0)
  );

  return (
    <div className="page-content">
      {/* Top Banner to Create/Edit Resume */}
      <div
        className="glass-card"
        style={{
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--accent-subtle)',
          borderColor: 'var(--accent-primary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Icon icon="solar:user-hand-up-bold" width="24" height="24" style={{ color: 'var(--accent-primary)' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
              {resume ? t('resumes.edit_btn') : t('resumes.create_btn')}
            </div>
          </div>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={resume ? 'solar:pen-bold' : 'solar:add-circle-bold'}
          onClick={() => setShowCreateModal(true)}
        >
          {resume ? t('resumes.edit_btn') : t('resumes.create_btn')}
        </Button>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <Input
          placeholder={t('resumes.search_placeholder')}
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

      {/* Filters Drawer */}
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedRegion('all');
                setSelectedCategory('all');
              }}
            >
              {t('common.clear')}
            </Button>
          </div>
        </div>
      )}

      {/* Category Pills */}
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

      {/* Resumes Feed */}
      {loading ? (
        <Skeleton type="card" count={4} />
      ) : filteredResumes.length === 0 ? (
        <EmptyState
          icon="solar:user-cross-bold"
          title={t('resumes.empty_title')}
          description={t('resumes.empty_desc')}
          actionLabel={hasActiveFilters ? t('common.clear_filters') : t('resumes.create_btn')}
          actionIcon={hasActiveFilters ? 'solar:filter-remove-bold' : 'solar:add-circle-bold'}
          onAction={() => {
            if (hasActiveFilters) {
              setSelectedCategory('all');
              setSelectedRegion('all');
              setSearchQuery('');
            } else {
              setShowCreateModal(true);
            }
          }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredResumes.map((res) => (
            <ResumeCard key={res.id} resume={res} />
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

      {/* Create / Edit Resume Modal */}
      <CreateResumeModal
        isOpen={showCreateModal}
        existingResume={resume}
        onClose={() => setShowCreateModal(false)}
        onSaved={() => {
          fetchResumes(1, false);
        }}
      />
    </div>
  );
}
