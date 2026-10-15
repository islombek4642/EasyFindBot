# EasyFindBot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy EasyFindBot — a production-grade Telegram Serverless job board platform featuring bot notifications, admin moderation, and a premium React Mini App with strict i18n and Iconify icons.

**Architecture:** The project employs Telegram Serverless (`tgcloud/`) for update routing (`handlers/`), RPC endpoints (`endpoints/`), and native SQLite tables (`schema.js`), paired with a React Vite Mini App (`src/`) hosted on Telegram Serverless static CDN.

**Tech Stack:** Telegram Serverless (`@tgcloud/cli`, `sdk`, `sdk/db`, `sdk/api`), React 18, Vite, `@iconify/react`.

**Spec:** [docs/superpowers/specs/2026-10-15-easyfindbot-design.md](file:///c:/EasyFindBot/docs/superpowers/specs/2026-10-15-easyfindbot-design.md)

## Global Constraints

- Zero Unicode emojis or stickers allowed anywhere in UI or backend; use `@iconify/react` exclusively.
- All copy must reside in `src/locales/{uz,ru,en}.js` without hardcoded UI strings.
- All modules inside `tgcloud/` must be pure ES modules using relative `.js` imports or `sdk`; no npm packages inside `tgcloud/`.
- No foreign key declarations in `tgcloud/schema.js` (`PRAGMA foreign_keys = off`).

## Review Focus

1. `Telegram.WebApp.Serverless.call` missing or failing outside Telegram environment: provide robust fallback/mock for local dev.
2. SQLite query parameter injection: always use `sdk/db` builders and `sql` template tags, never string interpolation.
3. Moderation workflow with missing admin ID: throw clear configuration error if `ADMIN_CHAT_ID` is not defined.
4. Channel broadcast failure on invalid channel ID: gracefully record failure without crashing update handler.
5. Missing initData in endpoints: return 401 with `EndpointError` as per Telegram Serverless contract.

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

- [ ] **Step 1: Create package.json with React, Vite, @iconify/react, and @tgcloud/cli**
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
- Create: `tgcloud/lib/constants/roles.js`
- Create: `tgcloud/lib/constants/statuses.js`
- Create: `tgcloud/lib/constants/categories.js`
- Create: `tgcloud/lib/bot/moderator.js`
- Create: `tgcloud/lib/bot/channel.js`
- Create: `tgcloud/lib/bot/notifier.js`

**Interfaces:**
- Consumes: `sdk/db`, `sdk/api`.
- Produces: Tables (`users`, `vacancies`, `resumes`, `applications`, `subscriptions`) and bot publishing helpers.

- [ ] **Step 1: Implement `tgcloud/lib/constants/*.js` with typed constants (ROLES, STATUSES, CATEGORIES, REGIONS)**
- [ ] **Step 2: Implement `tgcloud/schema.js` declaring tables with `table`, `integer`, `text`, `boolean`, `json`, `index`**
- [ ] **Step 3: Implement `tgcloud/lib/bot/moderator.js` to construct moderation message with InlineKeyboardMarkup**
- [ ] **Step 4: Implement `tgcloud/lib/bot/channel.js` to format and post approved vacancies to Telegram Channel**
- [ ] **Step 5: Implement `tgcloud/lib/bot/notifier.js` to dispatch push updates to matching subscribers**
- [ ] **Step 6: Commit**

```bash
git add tgcloud/schema.js tgcloud/lib/
git commit -m "feat(backend): implement db schema and bot helper modules"
```

---

### Task 3: Bot Update Handlers

**Files:**
- Create: `tgcloud/handlers/message.js`
- Create: `tgcloud/handlers/callback_query.js`

**Interfaces:**
- Consumes: Telegram Update objects from `sdk/api`, DB tables from `tgcloud/schema.js`.
- Produces: Bot command responses (`/start`, Mini App launcher button), admin moderation callback handlers.

- [ ] **Step 1: Implement `tgcloud/handlers/message.js` (`/start` onboarding, user registration upsert, webapp button)**
- [ ] **Step 2: Implement `tgcloud/handlers/callback_query.js` (`admin:approve:<id>` and `admin:reject:<id>` actions)**
- [ ] **Step 3: Test message handler execution with `npx tgcloud run handlers/message` payload**
- [ ] **Step 4: Commit**

```bash
git add tgcloud/handlers/
git commit -m "feat(backend): implement message and callback_query handlers"
```

---

### Task 4: Mini App Serverless Endpoints

**Files:**
- Create: `tgcloud/endpoints/getInitData.js`
- Create: `tgcloud/endpoints/getVacancies.js`
- Create: `tgcloud/endpoints/getVacancyById.js`
- Create: `tgcloud/endpoints/createVacancy.js`
- Create: `tgcloud/endpoints/createResume.js`
- Create: `tgcloud/endpoints/getResumes.js`
- Create: `tgcloud/endpoints/applyVacancy.js`
- Create: `tgcloud/endpoints/updateUser.js`

**Interfaces:**
- Consumes: `(input, ctx)` where `ctx.initData.user` is verified by Telegram platform.
- Produces: JSON RPC responses for Mini App queries and mutations.

- [ ] **Step 1: Implement `getInitData.js` (retrieves/creates user record and returns initial profile)**
- [ ] **Step 2: Implement `getVacancies.js` and `getVacancyById.js` (search, pagination, view counter)**
- [ ] **Step 3: Implement `createVacancy.js` (creates pending vacancy and triggers admin review card)**
- [ ] **Step 4: Implement `createResume.js` and `getResumes.js` (candidate profile creation and talent search)**
- [ ] **Step 5: Implement `applyVacancy.js` and `updateUser.js`**
- [ ] **Step 6: Test an endpoint with `npx tgcloud run endpoints/getVacancies '{}'`**
- [ ] **Step 7: Commit**

```bash
git add tgcloud/endpoints/
git commit -m "feat(backend): implement mini app rpc endpoints"
```

---

### Task 5: Localization & Frontend Design Tokens

**Files:**
- Create: `src/locales/uz.js`
- Create: `src/locales/ru.js`
- Create: `src/locales/en.js`
- Create: `src/locales/index.jsx`
- Create: `src/index.css`
- Create: `src/constants/routes.js`
- Create: `src/constants/categories.js`
- Create: `src/constants/regions.js`

**Interfaces:**
- Consumes: `@iconify/react`, CSS custom properties.
- Produces: `useTranslation()` hook, design system CSS, and application constants.

- [ ] **Step 1: Write comprehensive translation keys in `src/locales/uz.js`, `ru.js`, and `en.js`**
- [ ] **Step 2: Implement `src/locales/index.jsx` TranslationProvider with state persistence**
- [ ] **Step 3: Implement `src/index.css` design system (dark/light themes, glass cards, typography)**
- [ ] **Step 4: Implement `src/constants/*.js` matching backend domain models**
- [ ] **Step 5: Commit**

```bash
git add src/locales/ src/index.css src/constants/
git commit -m "feat(frontend): setup design tokens, css system, and i18n dictionaries"
```

---

### Task 6: Common UI Components & API Transport Layer

**Files:**
- Create: `src/services/api.js`
- Create: `src/components/common/Button.jsx`
- Create: `src/components/common/Input.jsx`
- Create: `src/components/common/Select.jsx`
- Create: `src/components/common/Badge.jsx`
- Create: `src/components/common/Modal.jsx`
- Create: `src/components/layout/AppHeader.jsx`
- Create: `src/components/layout/BottomNav.jsx`

**Interfaces:**
- Consumes: `@iconify/react`, `useTranslation()`, `Telegram.WebApp.Serverless.call`.
- Produces: Reusable UI widgets and typed RPC calling service.

- [ ] **Step 1: Implement `src/services/api.js` wrapping `Telegram.WebApp.Serverless.call` with dev mock fallback**
- [ ] **Step 2: Implement common form and layout components using Iconify icons exclusively**
- [ ] **Step 3: Implement AppHeader and BottomNav with active tab routing**
- [ ] **Step 4: Commit**

```bash
git add src/services/ src/components/
git commit -m "feat(frontend): implement api transport service and common ui components"
```

---

### Task 7: Mini App Feature Modules & Pages

**Files:**
- Create: `src/modules/vacancies/VacanciesView.jsx`
- Create: `src/modules/vacancies/VacancyDetailModal.jsx`
- Create: `src/modules/post-job/PostJobWizard.jsx`
- Create: `src/modules/resumes/ResumesView.jsx`
- Create: `src/modules/resumes/CreateResumeModal.jsx`
- Create: `src/modules/profile/ProfileView.jsx`
- Create: `src/App.jsx`
- Create: `src/main.jsx`

**Interfaces:**
- Consumes: `api.js`, `useTranslation()`, Common components.
- Produces: Complete, interactive Mini App views for candidate and employer workflows.

- [ ] **Step 1: Implement `VacanciesView.jsx` with search bar, category chips, salary filter, vacancy cards**
- [ ] **Step 2: Implement `VacancyDetailModal.jsx` with full description and "Apply" button**
- [ ] **Step 3: Implement `PostJobWizard.jsx` multi-step form for employer job posting**
- [ ] **Step 4: Implement `ResumesView.jsx` talent pool and `CreateResumeModal.jsx` resume builder**
- [ ] **Step 5: Implement `ProfileView.jsx` with language switcher (`uz`/`ru`/`en`), my postings, and my applications**
- [ ] **Step 6: Assemble `App.jsx` and `main.jsx`**
- [ ] **Step 7: Run `npm run build` and ensure build passes with zero errors**
- [ ] **Step 8: Commit**

```bash
git add src/modules/ src/App.jsx src/main.jsx
git commit -m "feat(frontend): implement feature views and assemble main application"
```

---

### Task 8: Verification, Git Remote Push & Documentation

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: Built assets and tested endpoints.
- Produces: Production-ready codebase pushed to GitHub repository.

- [ ] **Step 1: Verify `npm run build` compiles static assets to `dist/`**
- [ ] **Step 2: Run dry-run validation with `npx tgcloud status` or lint checks**
- [ ] **Step 3: Write comprehensive `README.md` with deployment instructions (`tgcloud login`, `tgcloud push`, `tgcloud migrate`)**
- [ ] **Step 4: Push all commits to `https://github.com/islombek4642/EasyFindBot.git` on `main`**
