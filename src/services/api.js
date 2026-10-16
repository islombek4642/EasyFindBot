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

function getAppUserInfo() {
  if (typeof window === 'undefined') return {};
  try {
    const tg = window.Telegram?.WebApp?.initDataUnsafe?.user;
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash);
    const uidFromUrl = urlParams.get('uid') || hashParams.get('uid');

    if (uidFromUrl && !isNaN(Number(uidFromUrl))) {
      sessionStorage.setItem('easyfind_uid', uidFromUrl);
      localStorage.setItem('easyfind_uid', uidFromUrl);
    }
    if (tg?.id) {
      sessionStorage.setItem('easyfind_uid', String(tg.id));
      localStorage.setItem('easyfind_uid', String(tg.id));
    }

    const savedUid = sessionStorage.getItem('easyfind_uid') || localStorage.getItem('easyfind_uid');
    const uid = tg?.id ? Number(tg.id) : (uidFromUrl || savedUid ? Number(uidFromUrl || savedUid) : null);

    const info = {};
    if (uid) info.uid = uid;
    if (tg?.first_name) info.firstName = tg.first_name;
    if (tg?.last_name) info.lastName = tg.last_name;
    if (tg?.username) info.username = tg.username;
    if (tg?.photo_url) info.photo_url = tg.photo_url;
    if (tg?.language_code) info.language = tg.language_code;

    // Check parsed user from Telegram.WebApp.initData string
    if ((!info.firstName || !info.username) && window.Telegram?.WebApp?.initData) {
      try {
        const initParams = new URLSearchParams(window.Telegram.WebApp.initData);
        const userRaw = initParams.get('user');
        if (userRaw) {
          const parsed = JSON.parse(userRaw);
          if (parsed.id && !info.uid) info.uid = Number(parsed.id);
          if (!info.firstName && parsed.first_name) info.firstName = parsed.first_name;
          if (!info.lastName && parsed.last_name) info.lastName = parsed.last_name;
          if (!info.username && parsed.username) info.username = parsed.username;
          if (!info.photo_url && parsed.photo_url) info.photo_url = parsed.photo_url;
          if (!info.language && parsed.language_code) info.language = parsed.language_code;
        }
      } catch (e) {}
    }

    // Check URL parameters
    const urlFn = urlParams.get('first_name') || hashParams.get('first_name');
    const urlLn = urlParams.get('last_name') || hashParams.get('last_name');
    const urlUn = urlParams.get('username') || hashParams.get('username');
    if (!info.firstName && urlFn) info.firstName = decodeURIComponent(urlFn);
    if (!info.lastName && urlLn) info.lastName = decodeURIComponent(urlLn);
    if (!info.username && urlUn) info.username = decodeURIComponent(urlUn);

    try {
      const cached = localStorage.getItem('easyfind_user');
      if (cached) {
        const u = JSON.parse(cached);
        if (!info.firstName && (u.firstName || u.first_name)) info.firstName = u.firstName || u.first_name;
        if (!info.lastName && (u.lastName || u.last_name)) info.lastName = u.lastName || u.last_name;
        if (!info.username && u.username) info.username = u.username;
      }
    } catch (e) {}

    // Synchronize currentUser in mock mode so standalone preview gets real data
    if (info.uid) currentUser.id = info.uid;
    if (info.firstName) currentUser.first_name = info.firstName;
    if (info.lastName) currentUser.last_name = info.lastName;
    if (info.username) currentUser.username = info.username;
    if (info.photo_url) currentUser.photo_url = info.photo_url;

    return info;
  } catch (e) {}
  return {};
}

/**
 * Normalizes backend responses so UI components receive consistent properties
 */
function normalizeApiResponse(endpoint, result) {
  if (!result || typeof result !== 'object') return result;

  // Align ok and success
  if (result.ok === undefined && result.success !== undefined) {
    result.ok = result.success;
  } else if (result.success === undefined && result.ok !== undefined) {
    result.success = result.ok;
  }

  // Normalize entity arrays to items and vice versa
  const list = result.items || result.vacancies || result.resumes || result.applications || result.subscriptions;
  if (Array.isArray(list)) {
    result.items = list;
    const ep = endpoint.toLowerCase();
    if (ep.includes('vacanc') && !result.vacancies) result.vacancies = list;
    if (ep.includes('resume') && !result.resumes) result.resumes = list;
    if (ep.includes('app') && !result.applications) result.applications = list;
    if (ep.includes('sub') && !result.subscriptions) result.subscriptions = list;
  }

  // Normalize pagination hasMore
  if (result.hasMore === undefined && typeof result.total === 'number' && typeof result.limit === 'number') {
    const offset = Number(result.offset) || 0;
    const count = (result.items || []).length;
    result.hasMore = offset + count < result.total;
  }

  return result;
}

/**
 * Low-level RPC caller
 */
async function callServerless(endpoint, params = {}) {
  const userInfo = getAppUserInfo();
  const payload = { ...userInfo, ...params };

  if (isTelegramServerless()) {
    return new Promise((resolve, reject) => {
      try {
        window.Telegram.WebApp.Serverless.call(endpoint, payload, (err, result) => {
          if (err) {
            console.error(`[API Error] ${endpoint}:`, err);
            reject(err);
          } else {
            resolve(normalizeApiResponse(endpoint, result));
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
  const mockResult = handleMockCall(endpoint, params);
  return normalizeApiResponse(endpoint, mockResult);
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
        company: params.companyName || params.company || '',
        companyName: params.companyName || params.company || '',
        category: params.category,
        region: params.region,
        employmentType: params.employmentType || 'full_time',
        salaryType: params.salaryType || 'negotiable',
        salaryMin: Number(params.salaryMin) || 0,
        salaryMax: Number(params.salaryMax) || 0,
        currency: params.salaryCurrency || params.currency || 'UZS',
        salaryCurrency: params.salaryCurrency || params.currency || 'UZS',
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
      const parsedSkills = Array.isArray(params.skills)
        ? params.skills
        : typeof params.skills === 'string'
          ? params.skills.split(',').map((s) => s.trim()).filter(Boolean)
          : [];

      const existing = resumes.find((r) => r.userTgId === currentUser.id);
      if (existing) {
        existing.title = params.title || existing.title || 'Mutaxassis';
        existing.category = params.category;
        existing.region = params.region;
        existing.experienceYears = Number(params.experienceYears) || 0;
        existing.skills = parsedSkills;
        existing.expectedSalary = params.expectedSalary || '';
        existing.bio = params.bio || '';
        existing.contacts = params.contacts;
        existing.status = 'active';
        return { ok: true, success: true, resumeId: existing.id };
      }

      const newResume = {
        id: Date.now(),
        userTgId: currentUser.id,
        fullName: `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() || 'Foydalanuvchi',
        title: params.title || 'Mutaxassis',
        category: params.category,
        region: params.region,
        experienceYears: Number(params.experienceYears) || 0,
        skills: parsedSkills,
        expectedSalary: params.expectedSalary || '',
        bio: params.bio || '',
        contacts: params.contacts,
        status: 'active',
        createdAt: Date.now(),
      };
      resumes.unshift(newResume);
      return { ok: true, success: true, resumeId: newResume.id };
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
