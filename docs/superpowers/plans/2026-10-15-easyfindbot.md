# EasyFindBot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build, verify, and deliver EasyFindBot — a production-grade Telegram Serverless job board and talent platform featuring secure bot moderation, dynamic channel publishing, two-tier admin hierarchy, automatic day/night theme sync, and a premium React Mini App with strict i18n and Iconify icons.

**Architecture:** The solution leverages the new Telegram Serverless (`tgcloud/`) infrastructure running on an isolated V8 runtime with native SQLite (`sdk/db`), direct update handlers (`tgcloud/handlers/`), and RPC endpoints (`tgcloud/endpoints/`). The frontend is a high-performance React 18 SPA built with Vite (`src/`), deployed to Telegram Serverless static CDN, adhering to an atomic DRY design system.

**Tech Stack:** Telegram Serverless (`@tgcloud/cli`, `sdk`, `sdk/db`, `sdk/api`), React 18, Vite, `@iconify/react` (Solar & Lucide icons).

**Spec:** [docs/superpowers/specs/2026-10-15-easyfindbot-design.md](file:///c:/EasyFindBot/docs/superpowers/specs/2026-10-15-easyfindbot-design.md)

## Global Constraints

- **Zero Unicode Emojis or Stickers**: Strictly prohibited in Mini App UI and backend templates; all iconography uses `@iconify/react` (Solar / Lucide icons).
- **Zero Hardcoded Copy**: 100% of UI text, placeholders, tooltips, and alerts reside in `src/locales/{uz, ru, en}.js` accessed via `useTranslation()`.
- **Strict Atomic UI Component Reusability (DRY)**:
  - Zero duplicated inline cards, buttons, inputs, selects, or modals.
  - All UI composed from `src/components/common/` (`<Button />`, `<Input />`, `<Select />`, `<Badge />`, `<Modal />`, `<ThemeToggle />`, `<VacancyCard />`, `<ResumeCard />`, `<EmptyState />`, `<Skeleton />`).
  - Centralized CSS design tokens in `src/index.css`.
- **Telegram Serverless Runtime Rules (`tgcloud/`)**:
  - Zero NPM packages at runtime. Only import `sdk`, `sdk/db`, `sdk/api`, or relative `.js` files.
  - Relative imports must explicitly include `.js` extension (e.g., `import { users } from '../schema.js';`).
  - No SQLite foreign keys (`PRAGMA foreign_keys = off`). Never declare `.references()` or `foreignKey()`.
  - All database queries must be awaited (`await db.select()...`).
  - Relational foreign keys strictly use Telegram User IDs (`tgId`, `employerTgId`, `seekerTgId`, `userTgId`).
  - Dynamic configuration stored in `settings` table; static root authority in `tgcloud/lib/config.js`. No `process.env`.
- **Separation of Concerns (SoC) Strictly Enforced Across All Layers**:
  - `tgcloud/handlers/`: Exclusively handles Telegram webhook updates, command/callback routing, delegates to services. Never embeds raw database queries.
  - `tgcloud/endpoints/`: Exclusively handles Mini App RPC requests, validates input, checks user session, returns JSON.
  - `tgcloud/lib/bot/`: Dedicated domain services (`auth.js`, `admin.js`, `moderator.js`, `channel.js`, `notifier.js`, `settings.js`).
  - `tgcloud/schema.js` & `tgcloud/lib/constants/`: Pure data structure definitions and immutable constants.
  - `src/services/api.js`: Pure network transport and dev mock data. Never interacts directly with UI state or DOM.
  - `src/context/`: Application state management (`AuthContext`, `ThemeContext`, `TranslationContext`).
  - `src/components/common/`: Pure presentational atomic UI components receiving props, decoupled from business logic or API endpoints.
  - `src/modules/`: Feature-level page views assembling components and consuming context.
  - `src/locales/` & `src/index.css`: Isolated copy dictionaries and CSS design tokens.
- **Automatic Day / Night Theme Adaptation**:
  - Automatic synchronization with `Telegram.WebApp.colorScheme` and `Telegram.WebApp.themeParams`.
  - Listen for `themeChanged` event with instant theme updating.

## Review Focus

1. **Telegram Channel Inline Button Rejection (`BUTTON_TYPE_INVALID`):**
   - In public broadcast channels, Telegram Bot API throws an error if an inline button contains `web_app`.
   - **Requirement:** Channel posts MUST use direct URL buttons: `{ text: 'Ariza topshirish', url: 'https://t.me/' + config.botUsername + '/app?startapp=vac_' + id }`. Private bot chats retain native `web_app: { url }`.
2. **Channel Permission Fault Tolerance:**
   - If the bot has not yet been added as an administrator to the public channel or moderation channel, `api.sendMessage` throws `BotApiError: 403 Forbidden`.
   - **Requirement:** Wrap channel publishing in `try...catch`; record errors on the moderation log without aborting the database approval status.
3. **Local Dev Mock Adapter:**
   - Outside Telegram (`npm run dev` on localhost:5173), `window.Telegram?.WebApp?.Serverless?.call` is `undefined`.
   - **Requirement:** `src/services/api.js` must implement an in-memory mock adapter (`src/services/mockData.js`) providing demo vacancies, talent resumes, and applicant statuses for rapid standalone browser styling.
4. **Negotiable Salary Query Logic:**
   - Vacancies with `salaryType = 'negotiable'` store `NULL` in `salary_min` and `salary_max`.
   - **Requirement:** `tgcloud/endpoints/getVacancies.js` must filter using `WHERE (salary_min >= :min OR salary_type = 'negotiable')` to prevent omitting negotiable offers during salary filtering.
5. **Mobile Safe Area & Gesture Bar Padding:**
   - iOS and Android gesture indicators overlap fixed bottom navigation bars if placed at `bottom: 0`.
   - **Requirement:** Bottom navigation must apply `padding-bottom: max(12px, env(safe-area-inset-bottom, 12px))` and initialize `Telegram.WebApp.expand()` + `Telegram.WebApp.ready()` immediately upon app mount.
6. **Two-Tier Admin Hierarchy & Dynamic Channel Management:**
   - Super admin (`superAdminTgId`) is configured in `tgcloud/lib/config.js`. Regular administrators are stored in `users` (`role = 'admin'`).
   - Moderation and public channel IDs are stored dynamically in the `settings` table (`moderation_channel_id`, `public_channel_id`) and modified via the Bot Admin Panel (`⚙️ Admin panel`).

---

### Task 1: Project Scaffolding & Configuration

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `tgcloud.jsonc`
- Create: `index.html`

**Interfaces:**
- Consumes: Node.js 18+ and npm.
- Produces: Runnable development server (`npm run dev`) and static production build directory (`dist/`) configured for Telegram Serverless static CDN.

- [x] **Step 1: Create `package.json`**
  - Add dependencies: `react: ^18.2.0`, `react-dom: ^18.2.0`, `@iconify/react: ^5.0.0`.
  - Add devDependencies: `vite: ^5.2.0`, `@vitejs/plugin-react: ^4.2.0`, `@tgcloud/cli: ^0.1.0`.
  - Define scripts: `"dev": "vite"`, `"build": "vite build"`, `"preview": "vite preview"`.

- [x] **Step 2: Create `vite.config.js`**
  - Configure `@vitejs/plugin-react`.
  - Set `base: '/'` and build destination to `dist/`.

- [x] **Step 3: Create `tgcloud.jsonc`**
  - Set static configuration: `"static": { "source": "dist", "spa": true }`.

- [x] **Step 4: Create `index.html`**
  - Set viewport meta with `viewport-fit=cover`.
  - Include Telegram WebApp script: `<script src="https://telegram.org/js/telegram-web-app.js"></script>`.
  - Mount root `#root` and load `/src/main.jsx`.

- [x] **Step 5: Verify build toolchain**
  - Run: `npm install`
  - Expected: Clean install with zero errors.

- [x] **Step 6: Commit**
  ```bash
  git add package.json vite.config.js tgcloud.jsonc index.html
  git commit -m "chore: scaffold react mini app toolchain and tgcloud config"
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
- Create: `tgcloud/lib/bot/settings.js`
- Create: `tgcloud/lib/bot/auth.js`
- Create: `tgcloud/lib/bot/admin.js`
- Create: `tgcloud/lib/bot/moderator.js`
- Create: `tgcloud/lib/bot/channel.js`
- Create: `tgcloud/lib/bot/notifier.js`
- Create: `tgcloud/lib/logger.js`

**Interfaces:**
- Consumes: `sdk`, `sdk/db`, `sdk/api`.
- Produces:
  - SQLite schema: `users`, `vacancies`, `resumes`, `applications`, `subscriptions`, `settings`.
  - Dynamic channel resolver: `getModerationChannelId()`, `getPublicChannelId()`, `setSetting(key, val)`.
  - Two-tier auth check: `isUserAdmin(tgId) -> Promise<boolean>`.
  - Moderation card builder: `buildModerationCard(vacancy)`.
  - Channel publisher: `publishToChannel(api, vacancy) -> Promise<number>`.
  - Push notifier: `notifySubscribers(api, vacancy)`, `notifyEmployer(api, vacancy, status)`.
  - Structured console logger: `logger.info(source, msg, data)`, `logger.warn(source, msg, data)`, `logger.error(source, msg, data)` formatted for `tgcloud logs` terminal inspection.

- [x] **Step 1: Implement typed domain constants**
  - `tgcloud/lib/constants/roles.js`: `SEEKER: 'seeker'`, `EMPLOYER: 'employer'`, `ADMIN: 'admin'`.
  - `tgcloud/lib/constants/statuses.js`: `PENDING: 'pending'`, `APPROVED: 'approved'`, `REJECTED: 'rejected'`, `CLOSED: 'closed'`.
  - `tgcloud/lib/constants/categories.js`: Standard job categories (`it`, `design`, `marketing`, `sales`, `finance`, `management`, `education`, `other`).
  - `tgcloud/lib/constants/salaryTypes.js`: `RANGE: 'range'`, `FIXED: 'fixed'`, `NEGOTIABLE: 'negotiable'`.

- [x] **Step 2: Implement `tgcloud/lib/config.js`**
  - Export `config` containing `superAdminTgId`, fallback `moderationChannelId`, fallback `publicChannelId`, `botUsername`, `paginationLimit: 15`.

- [x] **Step 3: Implement `tgcloud/schema.js`**
  - Define `users`, `vacancies`, `resumes`, `applications`, `subscriptions`, and `settings` tables.
  - Enforce unified `tgId` integer fields (`tgId`, `employerTgId`, `seekerTgId`, `userTgId`).
  - Unique composite indexes for `applications(vacancyId, seekerTgId)` and `subscriptions(userTgId, category, region)`.
  - Zero SQLite foreign keys.

- [x] **Step 4: Implement `tgcloud/lib/bot/settings.js`**
  - `getSetting(key, defaultValue)`: Queries `settings` table, returns fallback if not found.
  - `setSetting(key, value)`: Inserts or updates key in `settings` table.
  - `getModerationChannelId()`: Checks `settings.moderation_channel_id`, falls back to `config.moderationChannelId`.
  - `getPublicChannelId()`: Checks `settings.public_channel_id`, falls back to `config.publicChannelId`.

- [x] **Step 5: Implement `tgcloud/lib/bot/auth.js`**
  - `isUserAdmin(tgId)`: Returns `true` if `tgId === config.superAdminTgId` OR exists in `users` with `role = 'admin'`.
  - `getAllAdminTgIds()`: Queries super admin ID + all `users` with `role = 'admin'`.

- [x] **Step 6: Implement `tgcloud/lib/bot/admin.js`**
  - `buildAdminPanelMenu()`: Generates inline keyboard for Pending Queue, System Stats, Admin Management, Channel Settings, and Broadcast.
  - `buildStatsReport(stats)`: Formats total users, active vacancies, submitted applications, and active resumes.
  - `buildChannelSettingsMenu(modChannel, pubChannel)`: Generates inline keyboard for editing channel usernames/IDs.

- [x] **Step 7: Implement `tgcloud/lib/bot/moderator.js`**
  - `buildModerationCard(vacancy)`: Formats review message with title, company, salary, description, and action buttons (`Approve: mod_approve:<id>`, `Reject: mod_reject:<id>`).
  - `sendToModeration(api, vacancy)`: Dispatches review card to `getModerationChannelId()` with fallback to direct admin messaging if channel fails.

- [x] **Step 8: Implement `tgcloud/lib/bot/channel.js`**
  - `formatChannelPost(vacancy)`: Formats clean markdown post without emojis (using typographic bullet points and bold headers).
  - `publishToChannel(api, vacancy)`: Publishes to `getPublicChannelId()`.
  - **CRITICAL**: Use direct URL button `{ text: 'Ariza topshirish', url: 'https://t.me/' + config.botUsername + '/app?startapp=vac_' + vacancy.id }`.
  - Wrap in `try...catch` for fault-tolerant handling if bot permissions are incomplete.

- [x] **Step 9: Implement `tgcloud/lib/bot/notifier.js`**
  - `notifyEmployer(api, employerTgId, vacancy, status, reason)`: Sends status notification when vacancy is approved or rejected.
  - `notifySubscribers(api, vacancy)`: Queries active subscribers matching vacancy category and region, sends notification in batches of 25 with 1-second delay and per-recipient `try...catch`.

- [x] **Step 10: Implement `tgcloud/lib/logger.js`**
  - Implement structured console logging (`logger.info`, `logger.warn`, `logger.error`) outputting timestamped ISO entries formatted for real-time `npx tgcloud logs` inspection.

- [x] **Step 11: Commit**
  ```bash
  git add tgcloud/schema.js tgcloud/lib/
  git commit -m "feat(backend): implement db schema, settings table, two-tier admin auth, structured logger, and bot helper modules"
  ```

---

### Task 3: Bot Update Handlers

**Files:**
- Create: `tgcloud/handlers/message.js`
- Create: `tgcloud/handlers/callback_query.js`

**Interfaces:**
- Consumes: Telegram Update objects via `sdk/api`, DB tables via `tgcloud/schema.js`, helpers from `tgcloud/lib/bot/`.
- Produces:
  - Command routing: `/start`, `/app`, `/admin`, `/language`, `/help`, and deep link `/start vac_<id>`.
  - Dynamic 3x2 Reply Keyboard (or 4th row `⚙️ Admin panel` for authorized admins).
  - Secure moderation callback handling with race condition check.
  - Bot Admin Panel callbacks for queue inspection, channel ID updates, and stats.
  - Command menu registration with `api.setMyCommands`.

- [x] **Step 1: Implement `tgcloud/handlers/message.js`**
  - Auto-register or fetch user in `users` table on `/start`. Default language `uz`.
  - Check `isUserAdmin(tgId)`. If admin, append 4th row `[{ text: '⚙️ Admin panel' }]` to the persistent Reply Keyboard.
  - Route `/start vac_<id>`: Send preview card with inline button to launch Mini App with deep link.
  - Route `/admin` or text `'⚙️ Admin panel'`: Verify admin authorization; render admin panel inline menu.
  - Handle channel ID text input states when an admin is updating moderation or public channel settings.
  - Register commands on startup using `api.setMyCommands` across locales (`uz`, `ru`, `en`).

- [x] **Step 2: Implement `tgcloud/handlers/callback_query.js`**
  - Handle `mod_approve:<id>`:
    - Check `isUserAdmin(userTgId)`.
    - Check vacancy status is still `pending` (race condition lock).
    - Update vacancy status to `approved`, set `moderatedByTgId`.
    - Edit message in moderation channel to display `[Tasdiqlandi] Moderator: @username`.
    - Publish to public broadcast channel via `publishToChannel()`.
    - Trigger `notifySubscribers()` and `notifyEmployer()`.
  - Handle `mod_reject:<id>`:
    - Check `isUserAdmin(userTgId)`.
    - Update status to `rejected`.
    - Edit message in moderation channel to display `[Rad etildi] Moderator: @username`.
    - Notify employer via `notifyEmployer()`.
  - Handle `admin:queue`, `admin:stats`, `admin:channels`, `admin:set_channel:*` navigation callbacks.

- [x] **Step 3: Test message and callback query handlers**
  - Verify syntax and run mock invocation via `npx tgcloud run handlers/message` with a `/start` update.

- [x] **Step 4: Commit**
  ```bash
  git add tgcloud/handlers/
  git commit -m "feat(backend): implement secure message and callback handlers with dynamic admin reply keyboard and admin panel"
  ```

---

### Task 4: Mini App Serverless RPC Endpoints

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
- Consumes: `(input, ctx)` where `ctx.initData.user` contains verified Telegram user data.
- Produces: 16 RPC endpoints returning JSON responses with `{ success: true, ... }` or `{ error: string }`.

- [x] **Step 1: Implement user initialization & profile update**
  - `getInitData.js`: Finds or creates user record; returns user profile, role, and language.
  - `updateUser.js`: Updates user language, role (`seeker` / `employer`), phone.

- [x] **Step 2: Implement vacancy query endpoints**
  - `getVacancies.js`: Supports filters (category, region, search keyword, salaryMin).
  - **CRITICAL**: Use `WHERE (salary_min >= :min OR salary_type = 'negotiable')` to prevent excluding negotiable offers.
  - Implement pagination with `limit` (default 15) and `offset`.
  - `getVacancyById.js`: Returns vacancy details and increments `viewsCount`.

- [x] **Step 3: Implement vacancy creation & employer management**
  - `createVacancy.js`: Validates required fields, inserts with `status: 'pending'`, notifies moderation channel via `sendToModeration()`.
  - `closeVacancy.js`: Validates `employerTgId === ctx.initData.user.id`, updates `status: 'closed'`.
  - `getMyVacancies.js`: Returns all vacancies posted by the authenticated employer.

- [x] **Step 4: Implement resume & talent endpoints**
  - `createResume.js`: Upserts user resume (unique per `seekerTgId`).
  - `getMyResume.js`: Retrieves active resume of authenticated user.
  - `getResumes.js`: Filterable talent search for employers (category, region, experience).

- [x] **Step 5: Implement application workflow endpoints**
  - `applyVacancy.js`: Inserts application record with duplicate prevention (`uniqueIndex` on `vacancyId, seekerTgId`).
  - `getMyApplications.js`: Returns candidate's applied vacancies with current status.
  - `getVacancyApplications.js`: Returns applicant list with resumes for an employer's vacancy.
  - `updateApplicationStatus.js`: Updates applicant status (`viewed`, `accepted`, `rejected`), notifies applicant.

- [x] **Step 6: Implement notification subscription endpoints**
  - `getSubscriptions.js`: Lists active category subscriptions for candidate.
  - `toggleSubscription.js`: Adds or removes subscription.

- [x] **Step 7: Verify all endpoints compile cleanly**
  - Execute syntax and dry-run check across `tgcloud/endpoints/*.js`.

- [x] **Step 8: Commit**
  ```bash
  git add tgcloud/endpoints/
  git commit -m "feat(backend): implement complete 16 serverless rpc endpoints"
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
- Consumes: `Telegram.WebApp.colorScheme`, `Telegram.WebApp.themeParams`.
- Produces:
  - `useTranslation()` hook returning localized strings by dot-notation key.
  - `ThemeProvider` synchronizing `data-theme="dark" | "light"` with Telegram client.
  - Design tokens in `src/index.css` with CSS custom properties, glassmorphism card styles, and mobile safe-area paddings.

- [x] **Step 1: Implement translation dictionaries (`uz.js`, `ru.js`, `en.js`)**
  - Complete dictionaries covering navigation, vacancy cards, filters, forms, error alerts, applicant statuses, and empty states.
  - Strictly 0 emojis in strings.

- [x] **Step 2: Implement `src/locales/index.jsx`**
  - Provide `TranslationContext` and `useTranslation()` hook with automatic fallback to Uzbek (`uz`).

- [x] **Step 3: Implement `src/context/ThemeContext.jsx` and `useTheme.js`**
  - Detect `Telegram.WebApp.colorScheme` on mount.
  - Listen for `Telegram.WebApp.onEvent('themeChanged', ...)`.
  - Fallback to `window.matchMedia('(prefers-color-scheme: dark)')` when running in browser.
  - Set `document.documentElement.setAttribute('data-theme', theme)`.

- [x] **Step 4: Implement `src/index.css` design system**
  - Declare CSS variables: `--bg-primary`, `--bg-surface`, `--bg-card`, `--text-primary`, `--text-secondary`, `--text-muted`, `--border`, `--accent-primary`, `--accent-primary-hover`, `--success`, `--danger`, `--warning`.
  - Include mobile safe-area utility classes: `padding-bottom: max(12px, env(safe-area-inset-bottom, 12px))`.
  - Add smooth transitions, modern typography, and glassmorphic card borders.

- [x] **Step 5: Implement UI constants**
  - `src/constants/routes.js`: `VACANCIES: 'vacancies'`, `POST_JOB: 'post_job'`, `RESUMES: 'resumes'`, `PROFILE: 'profile'`.
  - Categories, regions, and salary type mappings.

- [x] **Step 6: Commit**
  ```bash
  git add src/locales/ src/context/ThemeContext.jsx src/hooks/useTheme.js src/index.css src/constants/
  git commit -m "feat(frontend): setup auto theme engine, safe-area design tokens, and i18n dictionaries"
  ```

---

### Task 6: Atomic Common UI Components & API Transport Layer

**Files:**
- Create: `src/services/api.js`
- Create: `src/services/mockData.js`
- Create: `src/context/AuthContext.jsx`
- Create: `src/components/common/Button.jsx`
- Create: `src/components/common/Input.jsx`
- Create: `src/components/common/Select.jsx`
- Create: `src/components/common/Badge.jsx`
- Create: `src/components/common/Modal.jsx`
- Create: `src/components/common/ThemeToggle.jsx`
- Create: `src/components/common/VacancyCard.jsx`
- Create: `src/components/common/ResumeCard.jsx`
- Create: `src/components/common/EmptyState.jsx`
- Create: `src/components/common/Skeleton.jsx`
- Create: `src/components/layout/AppHeader.jsx`
- Create: `src/components/layout/BottomNav.jsx`

**Interfaces:**
- Consumes: `@iconify/react`, `useTranslation()`, `useTheme()`, `Telegram.WebApp.Serverless.call`.
- Produces:
  - `api.call(endpoint, data)`: Invokes Telegram Serverless RPC or routes to `mockData.js` in browser dev.
  - Atomic UI library adhering to strict DRY principles.
  - AppHeader with brand, language switcher, role pill, and theme toggle.
  - BottomNav with 4 primary tabs and safe-area padding.

- [x] **Step 1: Implement `src/services/mockData.js`**
  - Populate demo vacancies (range, fixed, negotiable), demo resumes, applications, and current user.

- [x] **Step 2: Implement `src/services/api.js`**
  - Check if `window.Telegram?.WebApp?.Serverless?.call` is available.
  - If available, execute `window.Telegram.WebApp.Serverless.call(endpoint, data)`.
  - If unavailable (standalone browser dev `npm run dev`), route to `mockData.js` handlers with simulated latency.

- [x] **Step 3: Implement `src/context/AuthContext.jsx`**
  - Call `getInitData` on mount; cache user, role (`seeker` / `employer`), and language.

- [x] **Step 4: Implement atomic building blocks**
  - `Button.jsx`: variants (`primary`, `secondary`, `outline`, `danger`), sizes (`sm`, `md`, `lg`), `loading` spinner.
  - `Input.jsx`: Iconify prefix/suffix slot, label, error helper.
  - `Select.jsx`: Styled native select with custom chevron icon.
  - `Badge.jsx`: Variants (`primary`, `success`, `warning`, `danger`, `neutral`).
  - `Modal.jsx`: Animated backdrop, close action, gesture dismissal.
  - `ThemeToggle.jsx`: Solar sun/moon icon toggle.
  - `EmptyState.jsx`: Centered Iconify icon, title, description, action button.
  - `Skeleton.jsx`: Shimmer placeholder for cards and lines.

- [x] **Step 5: Implement reusable entity cards**
  - `VacancyCard.jsx`: Displays title, company, category badge, salary badge, region, and posted time. Used in search, my postings, and channel preview.
  - `ResumeCard.jsx`: Displays candidate name, title, experience, expected salary, and skills badges.

- [x] **Step 6: Implement layout components**
  - `AppHeader.jsx`: Title, role switch indicator, language toggle, and theme switch.
  - `BottomNav.jsx`: 4 tabs with Iconify icons (`solar:suitcase-tag-linear`, `solar:add-circle-linear`, `solar:users-group-two-rounded-linear`, `solar:user-circle-linear`), active pill indicator, and safe-area inset padding.

- [x] **Step 7: Commit**
  ```bash
  git add src/services/ src/context/AuthContext.jsx src/components/
  git commit -m "feat(frontend): implement api transport with dev mock and atomic reusable ui components"
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
- Consumes: Atomic components, `api.js`, `useTranslation()`, `useDeepLink()`.
- Produces: 4 comprehensive application modules and entry point.

- [x] **Step 1: Implement `src/hooks/useDeepLink.js`**
  - Inspect `window.Telegram?.WebApp?.initDataUnsafe?.start_param` and query param `?startapp=`.
  - Route direct navigation:
    - `vac_<id>`: Open `VacancyDetailModal` for that ID.
    - `jobs`: Navigate to `vacancies` tab.
    - `post_job`: Navigate to `post_job` tab.
    - `my_apps`: Open applications modal in profile.
    - `my_vacs`: Open employer vacancies modal in profile.

- [x] **Step 2: Implement `VacanciesView.jsx` and `VacancyDetailModal.jsx`**
  - `VacanciesView`: Search bar with debounce, horizontal scrollable category pills, salary type filters, paginated list of `VacancyCard`s with `Skeleton` loading.
  - `VacancyDetailModal`: Full job specification, company info, salary breakdown, contact action, and "Submit Application" button.

- [x] **Step 3: Implement `PostJobWizard.jsx`**
  - Multi-step job posting wizard:
    - Step 1: Basic Info (Title, Category, Company, Region).
    - Step 2: Compensation (Salary Type: Range, Fixed, Negotiable; Currency).
    - Step 3: Job Description & Requirements.
    - Step 4: Contacts & Review.
  - Calls `createVacancy` endpoint on completion and displays confirmation state.

- [x] **Step 4: Implement `ResumesView.jsx` and `CreateResumeModal.jsx`**
  - `ResumesView`: Talent browsing for employers, filter by category and experience, `ResumeCard` grid.
  - `CreateResumeModal`: Candidate profile creator (headline, skills tag input, expected salary, bio).

- [x] **Step 5: Implement `ProfileView.jsx` and management modals**
  - User header with role badge (`seeker` or `employer`).
  - Seeker section: "My Applications" modal (`SeekerApplicationsModal`), "Category Subscriptions" modal (`SubscriptionsModal`).
  - Employer section: "My Posted Vacancies" modal (`EmployerVacanciesModal`), "View Applicants" modal with status update actions (`VacancyApplicantsModal`).
  - Language selection dropdown and Telegram theme sync toggle.

- [x] **Step 6: Assemble `App.jsx` and `main.jsx`**
  - Wrap app with `ThemeProvider`, `TranslationProvider`, `AuthProvider`.
  - Call `Telegram.WebApp.ready()` and `Telegram.WebApp.expand()` immediately on mount.
  - Integrate `AppHeader`, active tab view rendering, and `BottomNav`.

- [x] **Step 7: Verify build output**
  - Run: `npm run build`
  - Expected: Zero compile or lint errors; production bundle emitted in `dist/`.

- [x] **Step 8: Commit**
  ```bash
  git add src/hooks/ src/modules/ src/App.jsx src/main.jsx
  git commit -m "feat(frontend): implement feature views, deep link router, and application entry point"
  ```

---

### Task 8: Verification, Documentation & Remote Push

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: Built assets and tested endpoints.
- Produces: Complete repository verification and pushed code on GitHub `main`.

- [x] **Step 1: Execute full production build**
  - Run: `npm run build`
  - Verify `dist/index.html` and assets exist.

- [x] **Step 2: Validate Serverless configuration**
  - Run dry-run checks on `tgcloud.jsonc`.

- [x] **Step 3: Create `README.md`**
  - Document setup, local development (`npm run dev`), Telegram Serverless deployment commands (`npx tgcloud login`, `npx tgcloud push`, `npx tgcloud migrate`).

- [x] **Step 4: Push all changes to GitHub**
  ```bash
  git push origin main
  ```

