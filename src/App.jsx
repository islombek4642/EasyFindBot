/**
 * EasyFindBot — Main Mini App Root Component
 */

import React, { useState, useEffect } from 'react';
import { ROUTES } from './constants/routes.js';
import { useDeepLink } from './hooks/useDeepLink.js';
import { AppHeader } from './components/layout/AppHeader.jsx';
import { BottomNav } from './components/layout/BottomNav.jsx';
import { VacanciesView } from './modules/vacancies/VacanciesView.jsx';
import { PostJobWizard } from './modules/post-job/PostJobWizard.jsx';
import { ResumesView } from './modules/resumes/ResumesView.jsx';
import { ProfileView } from './modules/profile/ProfileView.jsx';

export function App() {
  const {
    initialRoute,
    deepLinkVacancyId,
    initialProfileModal,
    clearDeepLinkVacancyId,
    clearInitialProfileModal,
  } = useDeepLink();

  const [activeTab, setActiveTab] = useState(initialRoute);

  // Synchronize initial route from deep link
  useEffect(() => {
    if (initialRoute) {
      setActiveTab(initialRoute);
    }
  }, [initialRoute]);

  // Inform Telegram client that Mini App is initialized and ready
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      try {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
      } catch (err) {
        // Safe outside Telegram
      }
    }
  }, []);

  return (
    <div className="app-container">
      <AppHeader />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {activeTab === ROUTES.VACANCIES && (
          <VacanciesView
            initialVacancyId={deepLinkVacancyId}
            onClearInitialVacancyId={clearDeepLinkVacancyId}
          />
        )}

        {activeTab === ROUTES.POST_JOB && (
          <PostJobWizard
            onSuccess={() => {
              setActiveTab(ROUTES.VACANCIES);
            }}
          />
        )}

        {activeTab === ROUTES.RESUMES && <ResumesView />}

        {activeTab === ROUTES.PROFILE && (
          <ProfileView
            initialModal={initialProfileModal}
            onClearInitialModal={clearInitialProfileModal}
          />
        )}
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
