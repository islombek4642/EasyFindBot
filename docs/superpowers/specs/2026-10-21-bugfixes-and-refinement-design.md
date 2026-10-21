# EasyFindBot — Bugfixes, Architecture Cleanup & UI/UX Refinement Design Spec

> **Date**: 2026-10-21  
> **Status**: Ready for Implementation  
> **Reference Audit**: `PROJECT_BUGS_AUDIT.md`  
> **Explicit Scope Boundary**: Exclude adding the `web_app` button to the persistent bot Reply Keyboard per explicit user instruction. All other 12 audit issues are in-scope.

---

## 1. Executive Summary & Objective

This specification details the end-to-end design for addressing all technical defects, architectural ambiguities, data mismatches, security risks, and mobile UX quirks discovered during the comprehensive codebase audit of **EasyFindBot**.

The goals are:
1. **Consolidate Backend Architecture**: Eliminate stale duplicate root folders (`endpoints/`, `handlers/`, `lib/`, `schema.js`) so that `tgcloud/` remains the single source of truth for Telegram Serverless.
2. **Eliminate Rate-Limit & Performance Bottlenecks**: Remove the 10 sequential Bot API calls executing on every `/start` message and make bot command registration an administrative maintenance action.
3. **Fix Serverless RPC Pagination & Querying**: Ensure `getVacancies.js` and `getResumes.js` accept both `page` and `offset`, enabling correct multi-page infinite loading.
4. **Wire End-to-End Search**: Connect frontend search input to backend database queries (`vacancies.title`, `vacancies.companyName`, `vacancies.description`).
5. **Normalize Entity Payloads**: Ensure talent profiles consistently display real candidate names (`user.firstName`, `user.lastName`) instead of falling back to raw enums or blank strings.
6. **Fortify Security & Data Integrity**: Prevent administrator privilege stripping in `updateUser.js` and eliminate unverified `input.uid` spoofing in production RPC calls.
7. **Refine Mobile & Modal UX**:
   - Prevent modal drag-to-dismiss gesture from intercepting touch scroll inside modal bodies.
   - Maintain body scroll lock when nested modals (`Select` picker) open and close.
   - Display a proper completion confirmation screen in `PostJobWizard` before navigating.
   - Ensure `SubscriptionsModal` accurately reflects active vs inactive subscriptions.
   - Fix missing `roles.seeker` translation key.

---

## 2. Architecture & File System Cleanup

### 2.1 Stale Root Duplication Removal
* **Problem**: The root folder contains `endpoints/`, `handlers/`, `lib/`, and `schema.js` which duplicate `tgcloud/`. `tgcloud push` strictly deploys `tgcloud/`. Modifying root copies creates invisible drift.
* **Specification**:
  - Permanently remove `c:/EasyFindBot/endpoints/`, `c:/EasyFindBot/handlers/`, `c:/EasyFindBot/lib/`, and `c:/EasyFindBot/schema.js`.
  - Validate that all imports in `tgcloud/` strictly reference `../schema.js`, `../lib/`, or `sdk`.
  - Ensure `package.json` dev tooling and `tgcloud.jsonc` point exclusively to `tgcloud/` and `src/`.

---

## 3. Bot Backend & Telegram Handlers (`tgcloud/`)

### 3.1 Rate Limit (429) & Onboarding Optimization (`handlers/message.js`, `lib/bot/setup.js`)
* **Problem**: `/start` handler unconditionally awaits `registerBotCommands()`, which invokes `setMyDescription` (x3), `setMyShortDescription` (x3), `setMyCommands` (x3), and `setChatMenuButton` (x1). This exhausts Telegram API rate limits during traffic bursts. Additionally, strings in `setup.js` are hardcoded.
* **Specification**:
  - Remove `await registerBotCommands()` from `handlers/message.js`.
  - Introduce an admin-only manual command `/setup_commands` (or a dedicated button in the SuperAdmin panel `admin:setup_commands`) that SuperAdmin can invoke on demand.
  - Move all bot descriptions and command descriptions into `tgcloud/lib/locales/{uz, ru, en}.js` so `setup.js` consumes `t(lang, key)`.
  - Leave `buildMainReplyKeyboard` untouched regarding web_app buttons (per user requirement).

### 3.2 Channel Post Language & Formatting Consistency (`lib/bot/channel.js`, `moderator.js`)
* **Problem**: When a vacancy is approved, the post language in the public channel is inherited from the approving moderator (`userLang`). Employment types (e.g. `full_time`) and categories (e.g. `it_tech`) are rendered as raw snake_case enums.
* **Specification**:
  - `publishToChannel` will default to `uz` (or read `channel_language` from the `settings` table, defaulting to `'uz'`), ensuring uniform public posts regardless of moderator's language.
  - Format `employmentType` using translated labels (e.g., `t(lang, 'employment_types.' + vacancy.employmentType)`).
  - Format `category` with localized hashtags (e.g. `#IT #Dasturlash`).

### 3.3 RPC Authentication Guard (`lib/bot/auth.js`)
* **Problem**: `getAuthenticatedUserId` accepts `input.uid` / `input.userId` unconditionally if `ctx.initData` is missing, allowing ID spoofing if the endpoint is called via raw HTTP.
* **Specification**:
  - Support fallback to `input.uid` only if explicit environment flag indicates local development/testing or `MOCK_AUTH === true`.
  - In production tgcloud V8 sandbox, reject unverified fallback or restrict it to unprivileged guest read-only operations.

---

## 4. Serverless RPC Endpoints (`tgcloud/endpoints/`)

### 4.1 Pagination Offset Resolution (`endpoints/getVacancies.js`, `endpoints/getResumes.js`)
* **Specification**:
  - Calculate `safeOffset`:
    ```javascript
    const safeLimit = Math.min(Math.max(Number(limit) || 15, 1), 50);
    const safeOffset = input.offset !== undefined
      ? Math.max(Number(input.offset) || 0, 0)
      : (Math.max(Number(input.page) || 1, 1) - 1) * safeLimit;
    ```
  - Both `offset`-based and `page`-based frontend requests will calculate correct database rows.

### 4.2 End-to-End Server-Side Search (`endpoints/getVacancies.js`)
* **Specification**:
  - When `input.search` is provided, apply case-insensitive matching across `title`, `companyName`, and `description`:
    ```javascript
    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      conditions.push(
        or(
          like(sql`lower(${vacancies.title})`, term),
          like(sql`lower(${vacancies.companyName})`, term),
          like(sql`lower(${vacancies.description})`, term)
        )
      );
    }
    ```

### 4.3 Employer Details Mapping Fix (`endpoints/getVacancyById.js`)
* **Specification**:
  - Remove `companyName: users.lastName`.
  - Return employer's verified display info:
    ```javascript
    const employer = await db.select({
      username: users.username,
      firstName: users.firstName,
      phone: users.phone,
    }).from(users).where(eq(users.tgId, vacancy.employerTgId)).get();
    ```

### 4.4 Admin Role Demotion Prevention (`endpoints/updateUser.js`)
* **Specification**:
  - Before applying `updates.role`, fetch user's current role:
    ```javascript
    const currentUser = await db.select({ role: users.role }).from(users).where(eq(users.tgId, userId)).get();
    if (currentUser?.role === 'admin') {
      // Do not overwrite role for admins via standard updateUser
      delete updates.role;
    }
    ```

### 4.5 Subscriptions Filtering (`endpoints/getSubscriptions.js`)
* **Specification**:
  - Explicitly include `isActive` in response and support filtering active subscriptions:
    ```javascript
    const list = await db.select().from(subscriptions).where(eq(subscriptions.userTgId, userTgId)).all();
    return { success: true, subscriptions: list };
    ```

---

## 5. Frontend & UI/UX Components (`src/`)

### 5.1 Vacancies Discovery & Search Integration (`src/modules/vacancies/VacanciesView.jsx`)
* **Specification**:
  - Pass `search: searchQuery.trim() || undefined` to `api.getVacancies`.
  - Calculate `page: pageNum` and `limit: 15`.
  - Debounce search input (300ms) to prevent unnecessary backend calls.
  - Fix client-side filter fallback to check `v.companyName || v.company`.

### 5.2 Resume Display & Candidate Name Normalization (`src/components/common/ResumeCard.jsx`, `src/modules/resumes/ResumeDetailModal.jsx`)
* **Specification**:
  - Derive candidate name reliably:
    ```javascript
    const candidateName =
      resume.fullName ||
      (resume.user ? [resume.user.firstName, resume.user.lastName].filter(Boolean).join(' ') : '') ||
      (resume.user?.username ? `@${resume.user.username}` : '') ||
      resume.contacts;
    ```
  - Fix missing translation key: change `t('roles.seeker')` to `t('profile.role_seeker')`.

### 5.3 Post Job Confirmation Flow (`src/modules/post-job/PostJobWizard.jsx`, `src/App.jsx`)
* **Specification**:
  - In `PostJobWizard.jsx`: when submission succeeds, set `submitted = true`.
  - Render the success confirmation card with review status, checkmark icon, and an explicit action button: "Vakansiyalarga qaytish" (`t('post_job.view_vacancies_btn')` or `t('common.done')`).
  - Invoke `onSuccess()` ONLY when the user clicks this button, giving employers clear confirmation that their listing was submitted for moderation.

### 5.4 Subscriptions Active State Accuracy (`src/modules/profile/SubscriptionsModal.jsx`)
* **Specification**:
  - In `fetchSubscriptions`:
    ```javascript
    const activeList = list.filter((s) => s.isActive === true || s.isActive === 1 || s.active === 1);
    setActiveCategories(new Set(activeList.map((s) => s.category)));
    ```

### 5.5 Mobile Sheet Gesture & Touch Scroll Conflict (`src/components/common/Modal.jsx`)
* **Specification**:
  - Restrict `onTouchStart`, `onTouchMove`, and `onTouchEnd` exclusively to `modal-sheet-handle-zone` and `modal-header`.
  - Remove touch drag interception from `modal-body`. The modal body will allow native mobile inertia scrolling without accidental dismissals.
  - Implement a modal nesting depth counter so that closing a nested modal (`Select` picker) only removes `document.body.style.overflow = ''` if no other modals remain open.

---

## 6. Verification & Acceptance Criteria
1. `npm run build` passes with zero errors and clean bundle output.
2. Root directory contains only root-level configuration files (`package.json`, `vite.config.js`, `index.html`, etc.); no duplicate backend directories.
3. Live pagination in `VacanciesView` and `ResumesView` loads distinct records across subsequent pages.
4. Live search in `VacanciesView` queries database and correctly matches company name, vacancy title, and description.
5. All resumes display candidate names correctly in cards and detail modals.
6. Admin switching roles in Mini App retains `admin` role in database.
7. Post job wizard shows confirmation screen with moderation badge upon completion.
8. Subscriptions modal accurately toggles and persists active/inactive state across modal close/open cycles.
9. Mobile modal allows natural scrolling without triggering dismissal.
