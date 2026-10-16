/**
 * EasyFindBot — Serverless API Client
 * Wraps Telegram.WebApp.Serverless.call with automatic fallback to mock data
 * when running in standalone browser environments.
 */

import {
  mockCurrentUser,
  initialMockVacancies,
  initialMockResumes,
  initialMockApplications,
  initialMockSubscriptions,
} from './mockData.js';

// In-memory mutable state for standalone preview
let currentUser = { ...mockCurrentUser };
let vacancies = [...initialMockVacancies];
let resumes = [...initialMockResumes];
let applications = [...initialMockApplications];
let subscriptions = [...initialMockSubscriptions];

/**
 * Checks if running inside Telegram Mini App with Serverless SDK available
 */
const isTelegramServerless = () => {
  return typeof window !== 'undefined' &&
    typeof window.Telegram !== 'undefined' &&
    typeof window.Telegram.WebApp !== 'undefined' &&
    typeof window.Telegram.WebApp.Serverless !== 'undefined' &&
    typeof window.Telegram.WebApp.Serverless.call === 'function';
};

/**
 * Low-level RPC caller
 */
async function callServerless(endpoint, params = {}) {
  if (isTelegramServerless()) {
    return new Promise((resolve, reject) => {
      try {
        window.Telegram.WebApp.Serverless.call(endpoint, params, (err, result) => {
          if (err) {
            console.error(`[API Error] ${endpoint}:`, err);
            reject(err);
          } else {
            resolve(result);
          }
        });
      } catch (err) {
        console.error(`[API Call Exception] ${endpoint}:`, err);
        reject(err);
      }
    });
  }

  // Standalone simulation mode
  await new Promise((resolve) => setTimeout(resolve, 150));
  return handleMockCall(endpoint, params);
}

/**
 * Mock dispatcher for standalone preview
 */
function handleMockCall(endpoint, params) {
  switch (endpoint) {
    case 'getInitData': {
      const activeResume = resumes.find((r) => r.userTgId === currentUser.id && r.status === 'active') || null;
      return {
        user: { ...currentUser },
        resume: activeResume,
      };
    }

    case 'updateUser': {
      const { role, language } = params;
      if (role) currentUser.role = role;
      if (language) currentUser.language = language;
      return { ok: true, user: { ...currentUser } };
    }

    case 'getVacancies': {
      const { category, region, salaryMin, page = 1, limit = 20 } = params;
      let filtered = vacancies.filter((v) => v.status === 'approved');

      if (category && category !== 'all') {
        filtered = filtered.filter((v) => v.category === category);
      }
      if (region && region !== 'all') {
        filtered = filtered.filter((v) => v.region === region);
      }
      if (salaryMin && Number(salaryMin) > 0) {
        const minNum = Number(salaryMin);
        filtered = filtered.filter((v) => v.salaryType === 'negotiable' || v.salaryMin >= minNum);
      }

      const offset = (Number(page) - 1) * Number(limit);
      const items = filtered.slice(offset, offset + Number(limit));

      return {
        items,
        total: filtered.length,
        hasMore: offset + items.length < filtered.length,
      };
    }

    case 'getVacancyById': {
      const id = Number(params.id);
      const found = vacancies.find((v) => v.id === id);
      if (!found) {
        throw new Error('NOT_FOUND');
      }
      found.viewsCount = (found.viewsCount || 0) + 1;
      return { ...found };
    }

    case 'createVacancy': {
      const newVac = {
        id: Date.now(),
        employerTgId: currentUser.id,
        title: params.title,
        company: params.company,
        category: params.category,
        region: params.region,
        employmentType: params.employmentType || 'full_time',
        salaryType: params.salaryType || 'negotiable',
        salaryMin: Number(params.salaryMin) || 0,
        salaryMax: Number(params.salaryMax) || 0,
        currency: params.currency || 'UZS',
        description: params.description,
        requirements: params.requirements,
        contacts: params.contacts,
        status: 'pending',
        viewsCount: 0,
        createdAt: Date.now(),
      };
      vacancies.unshift(newVac);
      return { ok: true, vacancyId: newVac.id, status: newVac.status };
    }

    case 'closeVacancy': {
      const id = Number(params.id);
      const vac = vacancies.find((v) => v.id === id && v.employerTgId === currentUser.id);
      if (!vac) throw new Error('NOT_FOUND_OR_FORBIDDEN');
      vac.status = 'closed';
      return { ok: true };
    }

    case 'getMyVacancies': {
      const myItems = vacancies.filter((v) => v.employerTgId === currentUser.id);
      return { items: myItems };
    }

    case 'createResume': {
      const existing = resumes.find((r) => r.userTgId === currentUser.id);
      if (existing) {
        existing.category = params.category;
        existing.region = params.region;
        existing.experienceYears = Number(params.experienceYears) || 0;
        existing.skills = params.skills;
        existing.expectedSalary = params.expectedSalary || '';
        existing.bio = params.bio || '';
        existing.contacts = params.contacts;
        existing.status = 'active';
        return { ok: true, resumeId: existing.id };
      }

      const newResume = {
        id: Date.now(),
        userTgId: currentUser.id,
        fullName: `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() || 'Foydalanuvchi',
        category: params.category,
        region: params.region,
        experienceYears: Number(params.experienceYears) || 0,
        skills: params.skills,
        expectedSalary: params.expectedSalary || '',
        bio: params.bio || '',
        contacts: params.contacts,
        status: 'active',
        createdAt: Date.now(),
      };
      resumes.unshift(newResume);
      return { ok: true, resumeId: newResume.id };
    }

    case 'getResumes': {
      const { category, region, page = 1, limit = 20 } = params;
      let filtered = resumes.filter((r) => r.status === 'active');
      if (category && category !== 'all') {
        filtered = filtered.filter((r) => r.category === category);
      }
      if (region && region !== 'all') {
        filtered = filtered.filter((r) => r.region === region);
      }
      const offset = (Number(page) - 1) * Number(limit);
      const items = filtered.slice(offset, offset + Number(limit));
      return {
        items,
        total: filtered.length,
        hasMore: offset + items.length < filtered.length,
      };
    }

    case 'getMyResume': {
      const myRes = resumes.find((r) => r.userTgId === currentUser.id && r.status === 'active') || null;
      return { resume: myRes };
    }

    case 'applyVacancy': {
      const vacancyId = Number(params.vacancyId);
      const existingApp = applications.find(
        (a) => a.vacancyId === vacancyId && a.seekerTgId === currentUser.id
      );
      if (existingApp) throw new Error('ALREADY_APPLIED');

      const vac = vacancies.find((v) => v.id === vacancyId);
      const newApp = {
        id: Date.now(),
        vacancyId,
        seekerTgId: currentUser.id,
        coverLetter: params.coverLetter || '',
        status: 'applied',
        createdAt: Date.now(),
        vacancyTitle: vac ? vac.title : '',
        company: vac ? vac.company : '',
      };
      applications.unshift(newApp);
      return { ok: true, applicationId: newApp.id };
    }

    case 'getMyApplications': {
      const myApps = applications.filter((a) => a.seekerTgId === currentUser.id);
      return { items: myApps };
    }

    case 'getVacancyApplications': {
      const vacancyId = Number(params.vacancyId);
      const items = applications.filter((a) => a.vacancyId === vacancyId);
      return { items };
    }

    case 'updateApplicationStatus': {
      const id = Number(params.id);
      const app = applications.find((a) => a.id === id);
      if (!app) throw new Error('NOT_FOUND');
      app.status = params.status;
      return { ok: true };
    }

    case 'getSubscriptions': {
      const userSubs = subscriptions.filter((s) => s.userTgId === currentUser.id && s.active === 1);
      return { items: userSubs };
    }

    case 'toggleSubscription': {
      const { category } = params;
      const existing = subscriptions.find(
        (s) => s.userTgId === currentUser.id && s.category === category
      );
      if (existing) {
        existing.active = existing.active === 1 ? 0 : 1;
        return { ok: true, active: existing.active === 1 };
      }
      const newSub = {
        id: Date.now(),
        userTgId: currentUser.id,
        category,
        active: 1,
      };
      subscriptions.push(newSub);
      return { ok: true, active: true };
    }

    default:
      throw new Error(`Unknown endpoint: ${endpoint}`);
  }
}

export const api = {
  getInitData: () => callServerless('getInitData'),
  updateUser: (params) => callServerless('updateUser', params),
  getVacancies: (params) => callServerless('getVacancies', params),
  getVacancyById: (params) => callServerless('getVacancyById', params),
  createVacancy: (params) => callServerless('createVacancy', params),
  closeVacancy: (params) => callServerless('closeVacancy', params),
  getMyVacancies: () => callServerless('getMyVacancies'),
  createResume: (params) => callServerless('createResume', params),
  getResumes: (params) => callServerless('getResumes', params),
  getMyResume: () => callServerless('getMyResume'),
  applyVacancy: (params) => callServerless('applyVacancy', params),
  getMyApplications: () => callServerless('getMyApplications'),
  getVacancyApplications: (params) => callServerless('getVacancyApplications', params),
  updateApplicationStatus: (params) => callServerless('updateApplicationStatus', params),
  getSubscriptions: () => callServerless('getSubscriptions'),
  toggleSubscription: (params) => callServerless('toggleSubscription', params),
};
