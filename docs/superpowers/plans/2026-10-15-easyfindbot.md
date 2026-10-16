# EasyFindBot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy EasyFindBot — a production-grade Telegram Serverless job board platform featuring bot notifications, secure admin moderation, automatic day/night theme sync, and a premium React Mini App with strict i18n and Iconify icons.

**Architecture:** The project employs Telegram Serverless (`tgcloud/`) for update routing (`handlers/`), RPC endpoints (`endpoints/`), and native SQLite tables (`schema.js`), paired with a React Vite Mini App (`src/`) hosted on Telegram Serverless static CDN.

**Tech Stack:** Telegram Serverless (`@tgcloud/cli`, `sdk`, `sdk/db`, `sdk/api`), React 18, Vite, `@iconify/react`.

**Spec:** [docs/superpowers/specs/2026-10-15-easyfindbot-design.md](file:///d:/EasyFindBot/docs/superpowers/specs/2026-10-15-easyfindbot-design.md)

## Global Constraints

- Zero Unicode emojis or stickers allowed anywhere in UI or backend; use `@iconify/react` exclusively.
- All copy must reside in `src/locales/{uz,ru,en}.js` without hardcoded UI strings.
- All modules inside `tgcloud/` must be pure ES modules using relative `.js` imports or `sdk`; no npm packages inside `tgcloud/`.
- No foreign key declarations in `tgcloud/schema.js` (`PRAGMA foreign_keys = off`).
- All relational associations strictly use Telegram ID (`tgId` / `employerTgId` / `seekerTgId` / `userTgId`).
- Automatic Day / Night theme adaptation matching Telegram theme settings dynamically.

## Review Focus

1. `Telegram.WebApp.Serverless.call` missing or failing outside Telegram environment: provide robust fallback/mock in `src/services/api.js` for local dev.
2. SQLite query parameter injection: always use `sdk/db` builders and `sql` template tags, never string interpolation.
3. Moderator authentication: verify caller ID against `config.adminTgIds` in `callback_query.js` before executing moderation actions.
4. Channel broadcast failure on invalid channel ID: gracefully record failure without crashing update handler.
5. Unique constraint on applications: prevent duplicate submissions per user per vacancy.
6. Automatic theme synchronization: listen for Telegram `themeChanged` event and update CSS tokens seamlessly.

---

### Task 1: Project Scaffolding & Configuration

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `tgcloud.jsonc`
- Create: `index.html`

**Interfaces:**
- Consumes: Node.js 18+ environment.
- Produces: Project root able to run `npm run dev` and `npm run build` targeting `dist/`.

- [ ] **Step 1: Create package.json with React 18, Vite, @iconify/react, and @tgcloud/cli**
- [ ] **Step 2: Configure vite.config.js with base `/` and build outDir `dist`**
- [ ] **Step 3: Create index.html loading Telegram WebApp script (`telegram-web-app.js`) and entry point**
- [ ] **Step 4: Create tgcloud.jsonc configuring `"static": { "source": "dist", "spa": true }`**
- [ ] **Step 5: Run `npm install` and verify dependencies install cleanly**
- [ ] **Step 6: Commit**

```bash
git add package.json vite.config.js tgcloud.jsonc index.html
git commit -m "chore: scaffold react mini app and tgcloud config"
```

---

### Task 2: Telegram Serverless Database Schema & Shared Library

**Files:**
- Create: `tgcloud/schema.js`
- Create: `tgcloud/lib/config.js`
- Create: `tgcloud/lib/constants/roles.js`
- Create: `tgcloud/lib/constants/statuses.js`
- Create: `tgcloud/lib/constants/categories.js`
- Create: `tgcloud/lib/constants/salaryTypes.js`
- Create: `tgcloud/lib/bot/moderator.js`
- Create: `tgcloud/lib/bot/channel.js`
- Create: `tgcloud/lib/bot/notifier.js`

**Interfaces:**
- Consumes: `sdk/db`, `sdk/api`.
- Produces: Tables (`users`, `vacancies`, `resumes`, `applications`, `subscriptions`) with unified `tgId` keys and bot publishing helpers.

- [ ] **Step 1: Implement `tgcloud/lib/config.js` with admin IDs, channel config, and defaults**
- [ ] **Step 2: Implement `tgcloud/lib/constants/*.js` with typed constants (ROLES, STATUSES, CATEGORIES, REGIONS, SALARY_TYPES)**
- [ ] **Step 3: Implement `tgcloud/schema.js` with unified `tgId` fields, salary types, unique application and subscription indexes**
- [ ] **Step 4: Implement `tgcloud/lib/bot/moderator.js` to construct moderation message with InlineKeyboardMarkup**
- [ ] **Step 5: Implement `tgcloud/lib/bot/channel.js` to format and post approved vacancies with error handling**
- [ ] **Step 6: Implement `tgcloud/lib/bot/notifier.js` to dispatch push updates to matching subscribers and employers**
- [ ] **Step 7: Commit**

```bash
git add tgcloud/schema.js tgcloud/lib/
git commit -m "feat(backend): implement db schema, config, and bot helper modules"
```

---

### Task 3: Bot Update Handlers

**Files:**
- Create: `tgcloud/handlers/message.js`
- Create: `tgcloud/handlers/callback_query.js`

**Interfaces:**
- Consumes: Telegram Update objects from `sdk/api`, DB tables from `tgcloud/schema.js`.
- Produces: Bot command responses (`/start`, `/app`, `/language`, `/help`, deep link `/start vac_<id>`), command menu registration (`setMyCommands`), secure admin moderation callback handlers.

- [ ] **Step 1: Implement `tgcloud/handlers/message.js` (Zero-friction `/start` onboarding with default `uz` language, command routing for `/start`, `/app`, `/language`, `/help`, persistent 3x2 Reply Keyboard with native WebApp buttons for `jobs`, `post_job`, `my_apps`, `my_vacs`, text handlers for `🌐 Tilni o'zgartirish` and `ℹ️ Bot haqida`, and deep link `/start vac_<id>`)**
- [ ] **Step 2: Implement `tgcloud/handlers/callback_query.js` (language switcher callback `set_lang:uz|ru|en`, admin moderation auth check, `admin:approve:<id>` and `admin:reject:<id>` actions, channel post, and subscriber alerts)**
- [ ] **Step 3: Implement command menu registration via `api.setMyCommands` across languages (`uz`, `ru`, `en`)**
- [ ] **Step 4: Test message handler execution with `npx tgcloud run handlers/message` payload**
- [ ] **Step 5: Commit**

```bash
git add tgcloud/handlers/
git commit -m "feat(backend): implement secure message and callback_query handlers with persistent reply keyboard and command menu"
```

---

### Task 4: Mini App Serverless Endpoints

**Files:**
- Create: `tgcloud/endpoints/getInitData.js`
- Create: `tgcloud/endpoints/getVacancies.js`
- Create: `tgcloud/endpoints/getVacancyById.js`
- Create: `tgcloud/endpoints/createVacancy.js`
- Create: `tgcloud/endpoints/closeVacancy.js`
- Create: `tgcloud/endpoints/getMyVacancies.js`
- Create: `tgcloud/endpoints/createResume.js`
- Create: `tgcloud/endpoints/getResumes.js`
- Create: `tgcloud/endpoints/getMyResume.js`
- Create: `tgcloud/endpoints/applyVacancy.js`
- Create: `tgcloud/endpoints/getMyApplications.js`
- Create: `tgcloud/endpoints/getVacancyApplications.js`
- Create: `tgcloud/endpoints/updateApplicationStatus.js`
- Create: `tgcloud/endpoints/getSubscriptions.js`
- Create: `tgcloud/endpoints/toggleSubscription.js`
- Create: `tgcloud/endpoints/updateUser.js`

**Interfaces:**
- Consumes: `(input, ctx)` where `ctx.initData.user` is verified by Telegram platform.
- Produces: Complete JSON RPC API for vacancies, talent search, application management, and subscriptions.

- [ ] **Step 1: Implement `getInitData.js` (retrieves/creates user record and returns initial profile)**
- [ ] **Step 2: Implement `getVacancies.js` (keyword search, category/region filter, salary filter, pagination) and `getVacancyById.js`**
- [ ] **Step 3: Implement `createVacancy.js`, `closeVacancy.js`, and `getMyVacancies.js`**
- [ ] **Step 4: Implement `createResume.js`, `getResumes.js`, and `getMyResume.js`**
- [ ] **Step 5: Implement `applyVacancy.js` (with duplicate check), `getMyApplications.js`, `getVacancyApplications.js`, and `updateApplicationStatus.js`**
- [ ] **Step 6: Implement `getSubscriptions.js`, `toggleSubscription.js`, and `updateUser.js`**
- [ ] **Step 7: Test endpoints offline using `npx tgcloud run`**
- [ ] **Step 8: Commit**

```bash
git add tgcloud/endpoints/
git commit -m "feat(backend): implement comprehensive mini app rpc endpoints"
```

---

### Task 5: Localization, Theme Engine & Design System

**Files:**
- Create: `src/locales/uz.js`
- Create: `src/locales/ru.js`
- Create: `src/locales/en.js`
- Create: `src/locales/index.jsx`
- Create: `src/context/ThemeContext.jsx`
- Create: `src/hooks/useTheme.js`
- Create: `src/index.css`
- Create: `src/constants/routes.js`
- Create: `src/constants/categories.js`
- Create: `src/constants/regions.js`
- Create: `src/constants/salaryTypes.js`

**Interfaces:**
- Consumes: `@iconify/react`, CSS custom properties, `Telegram.WebApp.colorScheme`.
- Produces: Dynamic automatic Day/Night theme provider, `useTranslation()` hook, design system CSS.

- [ ] **Step 1: Write comprehensive translation dictionaries in `src/locales/uz.js`, `ru.js`, and `en.js`**
- [ ] **Step 2: Implement `src/locales/index.jsx` TranslationProvider with state persistence**
- [ ] **Step 3: Implement `src/context/ThemeContext.jsx` with automatic Telegram Day/Night synchronization and manual toggle**
- [ ] **Step 4: Implement `src/index.css` design system with light/dark tokens, glassmorphism cards, and typography**
- [ ] **Step 5: Implement `src/constants/*.js` matching backend domain models**
- [ ] **Step 6: Commit**

```bash
git add src/locales/ src/context/ThemeContext.jsx src/hooks/useTheme.js src/index.css src/constants/
git commit -m "feat(frontend): setup auto day/night theme engine, design tokens, and i18n dictionaries"
```

---

### Task 6: Common UI Components & API Transport Layer

**Files:**
- Create: `src/services/api.js`
- Create: `src/context/AuthContext.jsx`
- Create: `src/components/common/Button.jsx`
- Create: `src/components/common/Input.jsx`
- Create: `src/components/common/Select.jsx`
- Create: `src/components/common/Badge.jsx`
- Create: `src/components/common/Modal.jsx`
- Create: `src/components/common/ThemeToggle.jsx`
- Create: `src/components/layout/AppHeader.jsx`
- Create: `src/components/layout/BottomNav.jsx`

**Interfaces:**
- Consumes: `@iconify/react`, `useTranslation()`, `Telegram.WebApp.Serverless.call`.
- Produces: Reusable UI widgets and typed RPC calling service with local dev mock adapter.

- [ ] **Step 1: Implement `src/services/api.js` wrapping `Telegram.WebApp.Serverless.call` with mock data adapter for local browser dev**
- [ ] **Step 2: Implement `src/context/AuthContext.jsx` for cached user session and role management**
- [ ] **Step 3: Implement common form and layout components using Iconify icons exclusively**
- [ ] **Step 4: Implement AppHeader and BottomNav with active tab routing and theme toggle**
- [ ] **Step 5: Commit**

```bash
git add src/services/ src/context/AuthContext.jsx src/components/
git commit -m "feat(frontend): implement api transport service with dev mock and common ui components"
```

---

### Task 7: Mini App Feature Modules & Dashboards

**Files:**
- Create: `src/hooks/useDeepLink.js`
- Create: `src/modules/vacancies/VacanciesView.jsx`
- Create: `src/modules/vacancies/VacancyDetailModal.jsx`
- Create: `src/modules/post-job/PostJobWizard.jsx`
- Create: `src/modules/resumes/ResumesView.jsx`
- Create: `src/modules/resumes/CreateResumeModal.jsx`
- Create: `src/modules/profile/ProfileView.jsx`
- Create: `src/modules/profile/EmployerVacanciesModal.jsx`
- Create: `src/modules/profile/VacancyApplicantsModal.jsx`
- Create: `src/modules/profile/SeekerApplicationsModal.jsx`
- Create: `src/modules/profile/SubscriptionsModal.jsx`
- Create: `src/App.jsx`
- Create: `src/main.jsx`

**Interfaces:**
- Consumes: `api.js`, `useTranslation()`, `useTheme()`, Common components.
- Produces: Interactive views for job search, job posting wizard, talent pool, and seeker/employer dashboards.

- [ ] **Step 1: Implement `src/hooks/useDeepLink.js` for handling `startapp` routes (`jobs`, `post_job`, `my_apps`, `my_vacs`, `vac_<id>`) for direct modal/tab navigation on launch**
- [ ] **Step 2: Implement `VacanciesView.jsx` (search, category chips, salary filter, pagination) and `VacancyDetailModal.jsx` (with apply action)**
- [ ] **Step 3: Implement `PostJobWizard.jsx` multi-step form supporting salary types (Range, Fixed, Negotiable)**
- [ ] **Step 4: Implement `ResumesView.jsx` talent search and `CreateResumeModal.jsx` resume editor**
- [ ] **Step 5: Implement `ProfileView.jsx` with employer dashboard (my vacancies, view applicants, change status) and seeker dashboard (my applications, alert subscriptions)**
- [ ] **Step 6: Assemble `App.jsx` and `main.jsx` with ThemeProvider, AuthProvider, and TranslationProvider**
- [ ] **Step 7: Run `npm run build` and ensure build passes with zero errors**
- [ ] **Step 8: Commit**

```bash
git add src/hooks/ src/modules/ src/App.jsx src/main.jsx
git commit -m "feat(frontend): implement full feature views, dashboards, and deep link navigation"
```

---

### Task 8: Verification, Git Remote Push & Documentation

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: Built assets and tested endpoints.
- Produces: Production-ready codebase documented and pushed to GitHub repository.

- [ ] **Step 1: Verify `npm run build` compiles static assets to `dist/` cleanly**
- [ ] **Step 2: Run dry-run validation with `npx tgcloud status`**
- [ ] **Step 3: Write comprehensive `README.md` with deployment instructions (`tgcloud login`, `tgcloud push`, `tgcloud migrate`)**
- [ ] **Step 4: Push all commits to `https://github.com/islombek4642/EasyFindBot.git` on `main`**
