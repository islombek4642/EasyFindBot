# EasyFindBot — Bugfixes & Architecture Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate architectural duplication, fix live pagination and search, correct resume candidate display, prevent admin role demotion, optimize Telegram bot rate-limiting, and polish mobile modal gesture handling across EasyFindBot without adding the reply keyboard webapp button.

**Architecture:** Clean up root directory duplicates; fix backend parameter resolution in `tgcloud/endpoints/` to support both `offset` and `page`; guard administrator roles in `updateUser.js`; wire debounced server search in `VacanciesView.jsx`; normalize candidate names in `ResumeCard.jsx` and `ResumeDetailModal.jsx`; decouple body scrolling from modal swipe-down in `Modal.jsx`; preserve post-submission UX in `PostJobWizard.jsx`.

**Tech Stack:** React 18, Vite 5, Vanilla CSS Design System, @iconify/react, Telegram Serverless (tgcloud / SQLite DSL).

**Spec:** [docs/superpowers/specs/2026-10-21-bugfixes-and-refinement-design.md](file:///c:/EasyFindBot/docs/superpowers/specs/2026-10-21-bugfixes-and-refinement-design.md)

## Global Constraints
- `tgcloud/` is the sole serverless backend directory; root directory must contain zero duplicate backend folders.
- Zero NPM packages imported in `tgcloud/`. Only `sdk`, `sdk/db`, `sdk/api` or internal modules from `tgcloud/lib/`.
- Strict relative imports with `.js` extension across all JavaScript files.
- No SQLite foreign keys (`PRAGMA foreign_keys = off`).
- Zero hardcoded user-facing strings; all translations reside in `tgcloud/lib/locales/{uz, ru, en}.js` or `src/locales/{uz, ru, en}.js`.
- Zero emojis or stickers; exclusively `@iconify/react` Solar / Lucide icons.
- Exclude adding `web_app` button to the bot Reply Keyboard per explicit user requirement.

## Review Focus
1. **Live Pagination**: When user reaches bottom of vacancies or resumes, page 2 must fetch records 16-30 rather than duplicating 1-15.
2. **Server Search**: Typing a search query in vacancies must query `vacancies.title`, `vacancies.companyName`, and `vacancies.description` on backend.
3. **Resume Candidate Name**: Talent profile cards and modals must show the applicant's real name (`user.firstName` / `user.lastName`), not the category name or a blank string.
4. **Admin Role Preservation**: An admin switching roles on frontend must not lose their database `admin` role.
5. **Modal Touch Gesture**: Scrolling content inside a modal on a touchscreen must not accidentally pull down and close the modal.

---

### Task 1: Clean Up Stale Root Backend Duplicates

**Files:**
- Remove: `c:/EasyFindBot/endpoints/`
- Remove: `c:/EasyFindBot/handlers/`
- Remove: `c:/EasyFindBot/lib/`
- Remove: `c:/EasyFindBot/schema.js`
- Verify: `tgcloud/schema.js`, `tgcloud/endpoints/`, `tgcloud/handlers/`, `tgcloud/lib/`

**Steps:**
- [ ] Verify that `tgcloud/` contains all up-to-date versions of `endpoints/`, `handlers/`, `lib/`, and `schema.js`.
- [ ] Remove duplicate root folders: `endpoints/`, `handlers/`, `lib/` and file `schema.js`.
- [ ] Run PowerShell check to confirm root only contains `src/`, `tgcloud/`, `docs/`, `assets/`, `dist/`, configuration files, and node_modules.

---

### Task 2: Backend Bot Rate-Limit & Localization Polish

**Files:**
- Modify: `tgcloud/handlers/message.js`
- Modify: `tgcloud/lib/bot/setup.js`
- Modify: `tgcloud/lib/bot/channel.js`
- Modify: `tgcloud/lib/locales/uz.js`
- Modify: `tgcloud/lib/locales/ru.js`
- Modify: `tgcloud/lib/locales/en.js`

**Steps:**
- [ ] In `tgcloud/handlers/message.js`, remove `await registerBotCommands()` from the `/start` handler to eliminate 10 synchronous API calls per user start.
- [ ] In `tgcloud/handlers/message.js`, add a dedicated `/setup_commands` command restricted to SuperAdmin (`isUserSuperAdmin(userId)`) to register descriptions and command menus safely on demand.
- [ ] In `tgcloud/lib/locales/{uz, ru, en}.js`, add localization keys for bot descriptions and command descriptions.
- [ ] In `tgcloud/lib/bot/setup.js`, update descriptions and commands to consume `t(lang, key)` instead of hardcoded strings.
- [ ] In `tgcloud/lib/bot/channel.js`, ensure `publishToChannel` defaults to consistent Uzbek language (or configured channel language) and formats `employmentType` and `category` into human-readable strings.
- [ ] Verify reply keyboard in `tgcloud/handlers/message.js` remains intact without adding web_app button.

---

### Task 3: Serverless RPC Endpoints Pagination, Search & Security Fixes

**Files:**
- Modify: `tgcloud/endpoints/getVacancies.js`
- Modify: `tgcloud/endpoints/getResumes.js`
- Modify: `tgcloud/endpoints/getVacancyById.js`
- Modify: `tgcloud/endpoints/updateUser.js`
- Modify: `tgcloud/lib/bot/auth.js`

**Steps:**
- [ ] In `tgcloud/endpoints/getVacancies.js`, compute `safeOffset = input.offset !== undefined ? Math.max(Number(input.offset) || 0, 0) : (Math.max(Number(input.page) || 1, 1) - 1) * safeLimit;` so both `offset` and `page` parameters produce valid pagination.
- [ ] In `tgcloud/endpoints/getVacancies.js`, ensure `search` queries `vacancies.title`, `vacancies.companyName`, and `vacancies.description`.
- [ ] In `tgcloud/endpoints/getResumes.js`, implement matching `safeOffset` computation using `input.offset` and `input.page`.
- [ ] In `tgcloud/endpoints/getVacancyById.js`, remove `companyName: users.lastName` mapping and only return actual employer user info (`username`, `firstName`, `phone`).
- [ ] In `tgcloud/endpoints/updateUser.js`, verify if user is `admin`. If so, ignore `role` changes so administrator privileges cannot be demoted.
- [ ] In `tgcloud/lib/bot/auth.js`, restrict unverified `input.uid` / `input.userId` fallback to non-production environments.

---

### Task 4: Frontend Discovery, Search & Pagination Wiring

**Files:**
- Modify: `src/modules/vacancies/VacanciesView.jsx`
- Modify: `src/modules/resumes/ResumesView.jsx`
- Modify: `src/services/api.js`

**Steps:**
- [ ] In `src/modules/vacancies/VacanciesView.jsx`, add debounced `searchQuery` passing `search: searchQuery.trim() || undefined` to `api.getVacancies`.
- [ ] In `src/modules/vacancies/VacanciesView.jsx`, update `fetchVacancies` to send `page: pageNum` and `limit: 15`.
- [ ] In `src/modules/vacancies/VacanciesView.jsx`, fix client-side search fallback to check `v.companyName || v.company`.
- [ ] In `src/modules/resumes/ResumesView.jsx`, wire `searchQuery` and `page: pageNum` to `api.getResumes`.
- [ ] In `src/services/api.js`, verify `getVacancies` and `getResumes` pass through all filter and pagination parameters seamlessly.

---

### Task 5: Candidate Name & i18n Normalization in Resumes

**Files:**
- Modify: `src/components/common/ResumeCard.jsx`
- Modify: `src/modules/resumes/ResumeDetailModal.jsx`
- Modify: `src/modules/resumes/ResumesView.jsx`

**Steps:**
- [ ] In `src/components/common/ResumeCard.jsx`, derive candidate display name from `resume.fullName`, `resume.user?.firstName` / `resume.user?.lastName`, or `resume.contacts`.
- [ ] In `src/components/common/ResumeCard.jsx`, replace non-existent key `t('roles.seeker')` with `t('profile.role_seeker')`.
- [ ] In `src/modules/resumes/ResumeDetailModal.jsx`, ensure `displayName` properly checks `resume.fullName`, `resume.user`, `resume.candidateName`, or contacts.
- [ ] In `src/modules/resumes/ResumesView.jsx`, update client-side search filter to check candidate's real name via `user.firstName` / `user.lastName`.

---

### Task 6: PostJobWizard Confirmation UX & Subscriptions Active Filter

**Files:**
- Modify: `src/modules/post-job/PostJobWizard.jsx`
- Modify: `src/modules/profile/SubscriptionsModal.jsx`

**Steps:**
- [ ] In `src/modules/post-job/PostJobWizard.jsx`, remove automatic immediate invocation of `onSuccess()` on submit.
- [ ] In `src/modules/post-job/PostJobWizard.jsx`, render the success confirmation view with checkmark icon and a primary button "Vakansiyalarga qaytish". Invoke `onSuccess()` only when the user clicks this button.
- [ ] In `src/modules/profile/SubscriptionsModal.jsx`, filter active categories using `s.isActive === true || s.isActive === 1 || s.active === 1` so unsubscribed categories do not reappear checked.

---

### Task 7: Modal Gesture Isolation & Scroll Lock Stacking

**Files:**
- Modify: `src/components/common/Modal.jsx`
- Modify: `src/components/common/Select.jsx`

**Steps:**
- [ ] In `src/components/common/Modal.jsx`, remove touch dragging listeners (`onTouchStart`, `onTouchMove`, `onTouchEnd`) from `modal-body`. Touch drag-to-dismiss will attach exclusively to `modal-sheet-handle-zone` and `modal-header`.
- [ ] In `src/components/common/Modal.jsx`, add a module-level `openModalsCount` tracker so that closing a nested modal does not unset `document.body.style.overflow = ''` if parent modals are still mounted.
- [ ] Test `Select` picker inside forms to verify parent modal remains scroll-locked and background page does not jitter.

---

### Task 8: Verification & Build Validation

**Files:**
- Verify: Full repository test and build

**Steps:**
- [ ] Run `npm run build` to confirm zero JSX, CSS, or import errors.
- [ ] Run verification script on translation keys (`check_locales.js`) to confirm 0 missing keys.
- [ ] Verify `git status` to ensure all modified and removed files are cleanly staged.
