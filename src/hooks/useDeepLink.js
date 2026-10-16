/**
 * EasyFindBot — Deep Link Navigation Hook
 * Handles Telegram startapp parameters (e.g. vac_123, post_job, jobs, my_apps, my_vacs).
 */

import { useState, useEffect } from 'react';
import { ROUTES } from '../constants/routes.js';

export function useDeepLink() {
  const [initialRoute, setInitialRoute] = useState(ROUTES.VACANCIES);
  const [deepLinkVacancyId, setDeepLinkVacancyId] = useState(null);
  const [initialProfileModal, setInitialProfileModal] = useState(null);

  useEffect(() => {
    let startParam = null;

    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.start_param) {
      startParam = window.Telegram.WebApp.initDataUnsafe.start_param;
    } else if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      startParam = urlParams.get('tgWebAppStartParam') || urlParams.get('startapp');
    }

    if (!startParam) return;

    if (startParam === 'jobs') {
      setInitialRoute(ROUTES.VACANCIES);
    } else if (startParam === 'post_job') {
      setInitialRoute(ROUTES.POST_JOB);
    } else if (startParam === 'resumes') {
      setInitialRoute(ROUTES.RESUMES);
    } else if (startParam === 'my_apps') {
      setInitialRoute(ROUTES.PROFILE);
      setInitialProfileModal('my_applications');
    } else if (startParam === 'my_vacs') {
      setInitialRoute(ROUTES.PROFILE);
      setInitialProfileModal('my_vacancies');
    } else if (startParam.startsWith('vac_')) {
      const vacId = Number(startParam.replace('vac_', ''));
      if (vacId) {
        setInitialRoute(ROUTES.VACANCIES);
        setDeepLinkVacancyId(vacId);
      }
    }
  }, []);

  return {
    initialRoute,
    deepLinkVacancyId,
    initialProfileModal,
    clearDeepLinkVacancyId: () => setDeepLinkVacancyId(null),
    clearInitialProfileModal: () => setInitialProfileModal(null),
  };
}
