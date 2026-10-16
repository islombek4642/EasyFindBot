# Fix Profile Telegram Data Sync, Auth Security, and Schema Mismatches Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure real Telegram user profile information (name, username, avatar) is seamlessly displayed when opening the Mini App via reply keyboard buttons, eliminate the IDOR authentication bypass vulnerability, fix all schema/API property mismatches (items vs entity arrays, company vs companyName, currency vs salaryCurrency), fix resume creation and display crashes, and ensure robust error handling.

**Architecture:** 
1. Telegram user identity is extracted robustly from multiple layers: Telegram WebApp `initDataUnsafe.user`, parsed `initData` query string, reply keyboard URL parameters (`uid`, `first_name`, `last_name`, `username`), local cache, and SQLite `users` table via `getInitData`.
2. Backend authentication (`getAuthenticatedUserId`) safely prefers authenticated `ctx.initData.user.id`, with a secure fallback for URL parameters only when valid or in development mode, ensuring no unauthorized cross-user impersonation.
3. An API response normalizer in `src/services/api.js` unifies response formats (`items` fallback to `vacancies`, `resumes`, `applications`, `subscriptions`, and `ok` aligned with `success`), and bidirectional field mapping aligns `company` / `companyName` and `currency` / `salaryCurrency`.
4. `CreateResumeModal` adds the mandatory `title` field, `ResumeCard` safely handles array/string `skills` without crashing, and `createVacancy` preserves admin roles.

**Tech Stack:** React 18, Telegram Mini Apps WebApp SDK, Vite, `@iconify/react`, Telegram Serverless (`sdk`, `sdk/db`, SQLite).

**Spec:** [docs/superpowers/specs/2026-10-15-easyfindbot-design.md](file:///d:/EasyFindBot/docs/superpowers/specs/2026-10-15-easyfindbot-design.md) & [audit_report.md](file:///C:/Users/Islombek/.gemini/antigravity-ide/brain/197dfcdd-f644-42eb-9e57-04686612f1d9/audit_report.md)

## Global Constraints

- Zero Unicode Emojis or Stickers in Mini App UI; all iconography uses `@iconify/react` (Solar / Lucide).
- Zero Hardcoded Strings in UI or bot replies; all copy must reside in `locales/{uz,ru,en}.js`.
- Strict Relative Imports with `.js` extension in `tgcloud/`.
- No SQLite Foreign Keys (`PRAGMA foreign_keys = off`).
- All database queries must be awaited.
- Separation of Concerns: keep network normalization in `api.js` and keep components purely prop-driven.

## Review Focus

1. **Telegram Profile Initialization Timing:** On mobile, `window.Telegram.WebApp.initDataUnsafe` may take several milliseconds to initialize after DOMContentLoaded. Both `initDataUnsafe`, parsed `initData`, URL search params (`uid`, `first_name`, `last_name`, `username`), and `localStorage` cache must be checked as fallbacks so "Foydalanuvchi" is never shown for authenticated Telegram users.
2. **Backward Compatibility of API Responses:** Existing frontend code checks `res && res.items`. Backend endpoints return `vacancies`, `resumes`, `applications`, or `subscriptions`. The API client in `api.js` must normalize all listing endpoints to provide both `items` and the named entity property (`items: res.vacancies || res.resumes || ...`).
3. **Array vs String Skills Handling:** In SQLite, `resumes.skills` is a JSON array (e.g. `["React", "Node.js"]`), while mock data or manual inputs might be comma-separated strings (`"React, Node.js"`). `ResumeCard.jsx` must handle both safely without calling `.split()` on an Array.
4. **Company & Currency Field Uniformity:** Form submission sends `company` and `currency`, while database schema expects `companyName` and `salaryCurrency`. The API transport and endpoints must accept both aliases gracefully.
5. **Admin Role Preservation:** `createVacancy.js` must only change role to `employer` if the user's current role is `seeker`; if the user is `admin`, the `admin` role must be preserved.

---

### Task 1: Robust Telegram User Profile Synchronization

**Files:**
- Modify: `tgcloud/handlers/message.js:12-48`
- Modify: `src/context/AuthContext.jsx:15-80`
- Modify: `src/services/api.js:33-75`
- Modify: `src/modules/profile/ProfileView.jsx:45-55`
- Modify: `tgcloud/endpoints/getInitData.js:10-75`

**Interfaces:**
- Consumes: `window.Telegram.WebApp.initDataUnsafe`, `window.Telegram.WebApp.initData`, URL parameters (`uid`, `first_name`, `last_name`, `username`).
- Produces: Fully populated `user` object in `AuthContext` with non-empty `first_name`, `last_name`, `username`, `photo_url`.

- [ ] **Step 1: Update `buildMainReplyKeyboard` in `tgcloud/handlers/message.js`**
  - Pass user name and username parameters in the reply keyboard web app URLs:
    `&uid=${userId}&first_name=${encodeURIComponent(from.first_name || '')}&last_name=${encodeURIComponent(from.last_name || '')}&username=${encodeURIComponent(from.username || '')}`.
  - Also update mirrored `handlers/message.js` in root.

- [ ] **Step 2: Enhance Telegram user extraction in `src/services/api.js` and `src/context/AuthContext.jsx`**
  - In `api.js`, implement `getAppUserInfo()`:
    1. Check `window.Telegram?.WebApp?.initDataUnsafe?.user`.
    2. Check parsed `user` JSON from `window.Telegram?.WebApp?.initData`.
    3. Check URL query params `first_name`, `last_name`, `username`, `uid`.
    4. Check `localStorage.getItem('easyfind_user')`.
    5. Sync extracted data to `currentUser` in mock mode so standalone preview also reflects real user names.
  - In `AuthContext.jsx`, ensure `setUser` updates immediately with the best non-empty name found across backend user, Telegram WebApp user, and cached user.
  - In `ProfileView.jsx`, ensure `displayName` uses:
    `user.first_name || user.firstName || user.username || tgUser.first_name || tgUser.username || t('profile.default_user_name')`.

- [ ] **Step 3: Update `tgcloud/endpoints/getInitData.js` to return active resume**
  - Fetch the user's full resume object `const userResume = await db.select().from(resumes).where(eq(resumes.seekerTgId, userId)).get();`
  - Return `{ success: true, user: enrichedUser, resume: userResume || null, hasResume: !!userResume, isAdmin }`.
  - Mirror changes to root `endpoints/getInitData.js`.

- [ ] **Step 4: Verify profile name rendering**
  - Test `npm run build` and ensure bundle compiles without errors.
  - Run verification script to test user extraction from simulated URL query string and `initData`.

- [ ] **Step 5: Commit Task 1**
  ```bash
  git add tgcloud/handlers/message.js handlers/message.js src/services/api.js src/context/AuthContext.jsx src/modules/profile/ProfileView.jsx tgcloud/endpoints/getInitData.js endpoints/getInitData.js
  git commit -m "fix(profile): sync real telegram profile info from reply keyboard and webapp"
  ```

---

### Task 2: Fix API Property Mismatches & Response Normalization

**Files:**
- Modify: `src/services/api.js:75-105`
- Modify: `src/modules/vacancies/VacanciesView.jsx:65-75`
- Modify: `src/modules/resumes/ResumesView.jsx:50-60`
- Modify: `src/modules/profile/EmployerVacanciesModal.jsx:25-35`
- Modify: `src/modules/profile/SeekerApplicationsModal.jsx:22-35, 75-90`
- Modify: `src/modules/profile/VacancyApplicantsModal.jsx:28-38`
- Modify: `src/modules/profile/SubscriptionsModal.jsx:18-28`

**Interfaces:**
- Consumes: Backend RPC responses from `tgcloud/endpoints/`.
- Produces: Unified response schema where every listing has `items` array and `hasMore` pagination, and detail objects have normalized properties.

- [ ] **Step 1: Implement Response Normalizer in `src/services/api.js`**
  - In `callServerless(endpoint, params)`, wrap resolved result with a normalizer:
    - If `result.vacancies`, set `result.items = result.vacancies`.
    - If `result.resumes`, set `result.items = result.resumes`.
    - If `result.applications`, set `result.items = result.applications`.
    - If `result.subscriptions`, set `result.items = result.subscriptions`.
    - Set `result.ok = result.success !== false`.
    - If `result.total` and `result.limit`, calculate `result.hasMore = (result.offset + result.items.length) < result.total`.
  - Return normalized result.

- [ ] **Step 2: Support both `items` and entity-specific keys in UI modals**
  - `VacanciesView.jsx`: `const list = res.items || res.vacancies || [];`
  - `ResumesView.jsx`: `const list = res.items || res.resumes || [];`
  - `EmployerVacanciesModal.jsx`: `const list = res.items || res.vacancies || [];`
  - `SeekerApplicationsModal.jsx`: `const list = res.items || res.applications || [];`
    - Also normalize application rendering: `app.vacancy?.title || app.vacancyTitle` and `app.vacancy?.companyName || app.company`.
  - `VacancyApplicantsModal.jsx`: `const list = res.items || res.applications || [];`
  - `SubscriptionsModal.jsx`: `const list = res.items || res.subscriptions || [];`

- [ ] **Step 3: Verify response normalization**
  - Run node test script against normalizer with sample backend JSON responses.

- [ ] **Step 4: Commit Task 2**
  ```bash
  git add src/services/api.js src/modules/
  git commit -m "fix(api): normalize backend listing responses and entity keys for UI views"
  ```

---

### Task 3: Resolve `company` vs `companyName` and `currency` vs `salaryCurrency`

**Files:**
- Modify: `src/modules/post-job/PostJobWizard.jsx:85-100, 395-405`
- Modify: `src/components/common/VacancyCard.jsx:24-38, 85-95`
- Modify: `src/modules/vacancies/VacancyDetailModal.jsx:24-38, 85-95`
- Modify: `src/modules/vacancies/VacanciesView.jsx:130-140`
- Modify: `tgcloud/endpoints/createVacancy.js:16-55`
- Modify: `endpoints/createVacancy.js:16-55`

**Interfaces:**
- Consumes: Vacancy objects and job posting form input.
- Produces: Dual-compatibility for `companyName`/`company` and `salaryCurrency`/`currency`.

- [ ] **Step 1: Update `tgcloud/endpoints/createVacancy.js`**
  - Accept both `companyName` and `company`: `const finalCompanyName = (companyName || input.company || '').trim();`.
  - Accept both `salaryCurrency` and `currency`: `const finalCurrency = salaryCurrency || input.currency || 'USD';`.
  - Check `!title || !finalCompanyName || !category || !region || !description || !contacts`.
  - Do not overwrite `admin` role: only update role to `employer` if current role is not `admin`.
  - Mirror changes to root `endpoints/createVacancy.js`.

- [ ] **Step 2: Update `PostJobWizard.jsx`**
  - In `handleSubmit`:
    - Send payload with both keys: `{ ...formData, companyName: formData.company, salaryCurrency: formData.currency }`.
    - Check response: `const res = await api.createVacancy(...); if (!res || res.success === false) throw new Error(res?.error);`.
    - Display error toast/alert if creation failed.

- [ ] **Step 3: Update `VacancyCard.jsx` and `VacancyDetailModal.jsx`**
  - Read `const companyDisplay = vacancy.companyName || vacancy.company || '';`.
  - Read `const currencyDisplay = vacancy.salaryCurrency || vacancy.currency || 'USD';`.
  - In `VacanciesView.jsx` filter, check both `v.companyName` and `v.company`.

- [ ] **Step 4: Verify job creation and vacancy card display**
  - Test build with `npm run build`.
  - Run validation script verifying `createVacancy` input normalization.

- [ ] **Step 5: Commit Task 3**
  ```bash
  git add src/modules/post-job/PostJobWizard.jsx src/components/common/VacancyCard.jsx src/modules/vacancies/ tgcloud/endpoints/createVacancy.js endpoints/createVacancy.js
  git commit -m "fix(vacancies): align companyName and salaryCurrency across backend and frontend"
  ```

---

### Task 4: Fix `CreateResumeModal` and `ResumeCard` Array Skills Crash

**Files:**
- Modify: `src/modules/resumes/CreateResumeModal.jsx:20-80, 110-140`
- Modify: `src/components/common/ResumeCard.jsx:20-60`
- Modify: `tgcloud/endpoints/createResume.js:15-70`
- Modify: `endpoints/createResume.js:15-70`

**Interfaces:**
- Consumes: Resume objects with string or array skills, resume creation form.
- Produces: Valid resume creation with title, crash-proof skills rendering, and proper status handling.

- [ ] **Step 1: Add `title` field to `CreateResumeModal.jsx`**
  - Add `title` to form state: `title: existingResume?.title || ''`.
  - Add `title` input field in modal UI with label `t('vacancies.title')`.
  - Validate `title`: `if (!formData.title.trim()) errs.title = t('common.error');`.
  - In `handleSave`, convert comma-separated string skills to array before sending, or send both.
  - Check `if (res && (res.ok || res.success))` so modal recognizes both formats.

- [ ] **Step 2: Fix skills array handling in `ResumeCard.jsx`**
  - Replace `skills.split(',')` with safe parser:
    ```javascript
    const skillsList = Array.isArray(skills)
      ? skills
      : typeof skills === 'string' && skills.trim()
      ? skills.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    ```
  - Display candidate headline:
    `const candidateTitle = resume.title || (resume.user ? `${resume.user.firstName || ''} ${resume.user.lastName || ''}`.trim() : '') || resume.fullName || t('resumes.title');`

- [ ] **Step 3: Update `tgcloud/endpoints/createResume.js`**
  - Handle skills properly if passed as comma-separated string or array:
    `const skillsArr = Array.isArray(skills) ? skills : (typeof skills === 'string' ? skills.split(',').map(s => s.trim()).filter(Boolean) : []);`
  - Return `{ success: true, ok: true, resumeId: ... }`.
  - Mirror to root `endpoints/createResume.js`.

- [ ] **Step 4: Verify resume creation and listing**
  - Run test script with array skills and string skills through `ResumeCard`.
  - Test build with `npm run build`.

- [ ] **Step 5: Commit Task 4**
  ```bash
  git add src/modules/resumes/CreateResumeModal.jsx src/components/common/ResumeCard.jsx tgcloud/endpoints/createResume.js endpoints/createResume.js
  git commit -m "fix(resumes): add title field to resume wizard and safe array skills parser"
  ```

---

### Task 5: Secure Authentication & Final Verification

**Files:**
- Modify: `tgcloud/lib/bot/auth.js:40-56`
- Modify: `lib/bot/auth.js:40-56`
- Audit all endpoints in `tgcloud/endpoints/` and `endpoints/`

**Interfaces:**
- Consumes: `ctx.initData`, `input`.
- Produces: Secure user ID resolution preventing arbitrary user impersonation.

- [ ] **Step 1: Secure `getAuthenticatedUserId` in `tgcloud/lib/bot/auth.js`**
  - Prioritize `ctx?.initData?.user?.id`.
  - For `input.uid` fallback, verify it only when `ctx.initData` is unavailable and validate numeric range.
  - Mirror to root `lib/bot/auth.js`.

- [ ] **Step 2: Synchronize root directory duplicates with `tgcloud/`**
  - Run diff between `tgcloud/` and root `endpoints/`, `handlers/`, `lib/`, `schema.js`.
  - Ensure 100% parity across all backend files so Telegram Serverless CLI and local dev stay synchronized.

- [ ] **Step 3: Full End-to-End Build and Verification**
  - Run `npm run build` to verify production assets.
  - Run verification test script exercising all 5 tasks.

- [ ] **Step 4: Commit Task 5**
  ```bash
  git add tgcloud/ lib/ endpoints/ handlers/
  git commit -m "fix(auth): secure user id resolution and synchronize serverless modules"
  ```
