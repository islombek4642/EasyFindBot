# EasyFindBot — Telegram Serverless Job & Talent Platform Spec

## 1. Overview & Goals

**EasyFindBot** is a production-grade Job Board and Recruiting system on Telegram that leverages the **Telegram Serverless (`tgcloud`)** platform. It provides a hybrid experience:
- **Telegram Bot (`handlers/`)**: Handles onboarding, push notifications, subscription alerts, and admin moderation workflows.
- **Telegram Mini App (`src/` & `endpoints/`)**: Provides a premium, app-like SPA for posting vacancies, searching jobs, browsing resumes, and managing applications.
- **Hosted Mini App Front-End**: Built with React and Vite, hosted directly on Telegram Serverless static CDN (`https://app<app_id>.tgcloud.ai`).

### Guiding Principles & Hard Rules
1. **No Emojis or Stickers**: Any visual symbology must exclusively use **Iconify** icons (Solar / Lucide via `@iconify/react`).
2. **Zero Hardcoded Strings**: All text, labels, placehoders, and error messages are centralized in dedicated localization files (`locales/uz.js`, `locales/ru.js`, `locales/en.js`) referenced via typed constant keys.
3. **Telegram Serverless Platform Constraints**:
   - Zero npm packages at runtime inside `tgcloud/` modules.
   - All imports within `tgcloud/` are relative and must include the `.js` extension.
   - Native SQLite via `sdk/db` with **no foreign keys** (`PRAGMA foreign_keys = off`).
   - Two-step deployment: `tgcloud push` for code/assets, `tgcloud migrate` for database schema updates.

---

## 2. System Architecture

```text
EasyFindBot/
├── .agents/
│   └── skills/
│       └── telegram-serverless/
│           └── SKILL.md
├── tgcloud/                              # Telegram Serverless Cloud Modules
│   ├── handlers/                         # Flat update handlers
│   │   ├── message.js                    # /start, commands, inline query routing
│   │   └── callback_query.js             # Admin moderation (approve/reject), actions
│   ├── endpoints/                        # Mini App Serverless RPC
│   │   ├── getInitData.js                # Auth & user state via ctx.initData
│   │   ├── getVacancies.js               # Filtered vacancy search
│   │   ├── getVacancyById.js             # Detailed vacancy view + view count bump
│   │   ├── createVacancy.js              # Post new vacancy -> pending state
│   │   ├── createResume.js               # Post / update resume
│   │   ├── getResumes.js                 # Talent search for employers
│   │   ├── applyVacancy.js               # Candidate application submission
│   │   └── updateUser.js                 # Language & profile update
│   ├── lib/                              # Shared backend logic
│   │   ├── constants/
│   │   │   ├── categories.js             # Standard job categories & regions
│   │   │   ├── statuses.js               # PENDING, APPROVED, REJECTED, CLOSED
│   │   │   └── roles.js                  # SEEKER, EMPLOYER, ADMIN
│   │   └── bot/
│   │       ├── notifier.js               # Push notifications to candidates
│   │       ├── moderator.js              # Admin review notification & card builder
│   │       └── channel.js                # Formatted markdown channel publisher
│   └── schema.js                         # SQLite Drizzle-like table definitions
├── src/                                  # React Mini App Frontend (Vite)
│   ├── assets/                           # Static assets
│   ├── components/
│   │   ├── common/                       # Base components (Button, Input, Select, Badge, Modal)
│   │   └── layout/                       # AppHeader, BottomNav, Container
│   ├── constants/
│   │   ├── categories.js
│   │   ├── regions.js
│   │   ├── routes.js
│   │   └── translations.js
│   ├── locales/
│   │   ├── index.js                      # Language provider & useTranslation hook
│   │   ├── uz.js                         # Uzbek strings
│   │   ├── ru.js                         # Russian strings
│   │   └── en.js                         # English strings
│   ├── modules/
│   │   ├── vacancies/                    # Vacancy list, filter, details
│   │   ├── post-job/                     # Multi-step job posting wizard
│   │   ├── resumes/                      # Resume creator & talent browsing
│   │   └── profile/                      # User dashboard & language switcher
│   ├── services/
│   │   └── api.js                        # Telegram.WebApp.Serverless.call wrapper
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css                         # Design system (variables, glassmorphism, cards)
├── tgcloud.jsonc                         # Static hosting configuration ("source": "dist")
├── package.json
└── vite.config.js
```

---

## 3. Database Schema (`tgcloud/schema.js`)

All tables are defined in `tgcloud/schema.js` using `sdk/db`:

```javascript
import { table, integer, text, boolean, json, index, sql } from 'sdk/db';

export const users = table('users', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  tgId:      integer('tg_id').unique().notNull(),
  username:  text('username'),
  firstName: text('first_name'),
  lastName:  text('last_name'),
  role:      text('role').notNull().default('seeker'), // 'seeker', 'employer', 'admin'
  phone:     text('phone'),
  language:  text('language').notNull().default('uz'), // 'uz', 'ru', 'en'
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
}, (t) => ({
  tgIdIdx: index('idx_users_tg_id').on(t.tgId),
  roleIdx: index('idx_users_role').on(t.role),
}));

export const vacancies = table('vacancies', {
  id:               integer('id').primaryKey({ autoIncrement: true }),
  employerId:       integer('employer_id').notNull(),
  title:            text('title').notNull(),
  companyName:      text('company_name').notNull(),
  category:         text('category').notNull(),
  region:           text('region').notNull(),
  employmentType:   text('employment_type').notNull(), // 'full_time', 'part_time', 'remote', 'internship'
  salaryMin:        integer('salary_min'),
  salaryMax:        integer('salary_max'),
  salaryCurrency:   text('salary_currency').notNull().default('USD'),
  description:      text('description').notNull(),
  requirements:     text('requirements'),
  contacts:         text('contacts').notNull(),
  status:           text('status').notNull().default('pending'), // 'pending', 'approved', 'rejected', 'closed'
  rejectionReason:  text('rejection_reason'),
  channelMessageId: integer('channel_message_id'),
  viewsCount:       integer('views_count').notNull().default(0),
  createdAt:        integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt:        integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
}, (t) => ({
  statusIdx:   index('idx_vacancies_status').on(t.status),
  categoryIdx: index('idx_vacancies_category').on(t.category),
  regionIdx:   index('idx_vacancies_region').on(t.region),
}));

export const resumes = table('resumes', {
  id:              integer('id').primaryKey({ autoIncrement: true }),
  seekerId:        integer('seeker_id').notNull(),
  title:           text('title').notNull(),
  category:        text('category').notNull(),
  region:          text('region').notNull(),
  experienceYears: integer('experience_years').notNull().default(0),
  expectedSalary:  integer('expected_salary'),
  salaryCurrency:  text('salary_currency').notNull().default('USD'),
  skills:          json('skills'), // Array of strings e.g. ["React", "JavaScript"]
  bio:             text('bio'),
  contacts:        text('contacts').notNull(),
  isActive:        boolean('is_active').notNull().default(true),
  createdAt:       integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt:       integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
}, (t) => ({
  seekerIdx:   index('idx_resumes_seeker').on(t.seekerId),
  categoryIdx: index('idx_resumes_category').on(t.category),
}));

export const applications = table('applications', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  vacancyId:   integer('vacancy_id').notNull(),
  seekerId:    integer('seeker_id').notNull(),
  resumeId:    integer('resume_id'),
  coverLetter: text('cover_letter'),
  status:      text('status').notNull().default('applied'), // 'applied', 'viewed', 'accepted', 'rejected'
  createdAt:   integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
}, (t) => ({
  vacancyIdx: index('idx_app_vacancy').on(t.vacancyId),
  seekerIdx:  index('idx_app_seeker').on(t.seekerId),
}));

export const subscriptions = table('subscriptions', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  userId:    integer('user_id').notNull(),
  category:  text('category').notNull(),
  region:    text('region'),
  isActive:  boolean('is_active').notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
}, (t) => ({
  catRegIdx: index('idx_sub_cat_reg').on(t.category, t.region),
}));
```

---

## 4. Moderation & Channel Broadcasting Workflow

1. **Submission**: Employer fills in vacancy form in the Mini App -> calls `Telegram.WebApp.Serverless.call('createVacancy', data)`.
2. **Pending Queue**: Stored in `vacancies` table with `status = 'pending'`.
3. **Admin Alert**: Backend sends an admin review card to the configured `ADMIN_CHAT_ID` via `api.sendMessage` with Inline Keyboard:
   - `[ Tasdiqlash / Approve ]` (`callback_data: "admin:approve:<id>"`)
   - `[ Rad etish / Reject ]` (`callback_data: "admin:reject:<id>"`)
4. **On Approve**:
   - Updates `vacancies.status = 'approved'`.
   - Formats a Telegram Markdown post with job details, company name, salary range, and an inline button to open the Mini App directly (`web_app: { url: 'https://app<id>.tgcloud.ai?startapp=vac_<id>' }`).
   - Sends post to `@CHANNEL_USERNAME` or `CHANNEL_ID`.
   - Saves returned `message_id` into `vacancies.channelMessageId`.
   - Queries `subscriptions` table for seekers subscribed to this category/region and dispatches notifications via `api.sendMessage`.
   - Sends confirmation notification to the employer.
5. **On Reject**:
   - Updates `vacancies.status = 'rejected'`.
   - Sends notification to employer with explanation.

---

## 5. Frontend & Localization Architecture

### Localization Modules (`src/locales/`)
- `src/locales/uz.js`: Full Uzbek dictionary with Latin script.
- `src/locales/ru.js`: Full Russian dictionary.
- `src/locales/en.js`: Full English dictionary.
- `src/locales/index.jsx`: Exports `TranslationProvider` and `useTranslation()`.

### Iconography Strategy
- Zero Unicode emojis or stickers.
- All visual glyphs use `@iconify/react` with the clean Solar / Lucide icon sets:
  - Jobs: `solar:case-round-bold`
  - Resumes: `solar:user-id-bold`
  - Search: `solar:magnifer-linear`
  - Filter: `solar:filter-bold`
  - Salary: `solar:wallet-money-bold`
  - Location: `solar:map-point-wave-bold`
  - Company: `solar:buildings-2-bold`
  - Language: `solar:global-bold`
  - Check / Success: `solar:check-circle-bold`
  - Arrow / Navigation: `solar:alt-arrow-right-linear`

### Mini App Navigation
Bottom Navigation Bar:
1. **Jobs (Vakansiyalar)**: Search, multi-category filter, salary filter, cards list, vacancy detail view.
2. **Post Job (E'lon berish)**: Multi-step vacancy creation wizard (Title, Category, Salary, Requirements, Contacts).
3. **Resumes (Nomzodlar)**: Talent pool for employers, create/update my resume.
4. **Profile (Profil)**: Language selector (`uz` / `ru` / `en`), my submitted vacancies, my applications, role toggle.

---

## 6. Implementation & Verification Plan

### Phase 1: Project Scaffolding & Serverless Backend
1. Initialize Vite React app at project root with Tailwind/Vanilla CSS tokens and `@iconify/react`.
2. Configure `tgcloud/` with `schema.js`, `lib/`, `handlers/`, and `endpoints/`.
3. Configure `tgcloud.jsonc` with `"static": { "source": "dist", "spa": true }`.

### Phase 2: Database Schema & Migration
1. Apply `schema.js` tables.
2. Validate with `npx tgcloud migrate --dry-run`.

### Phase 3: Handlers & Endpoints Implementation
1. Implement `handlers/message.js` (`/start`, language selection, Mini App launch).
2. Implement `handlers/callback_query.js` (Admin review approval, rejection, notifications).
3. Implement `endpoints/` (`getInitData`, `getVacancies`, `getVacancyById`, `createVacancy`, `createResume`, `getResumes`, `applyVacancy`, `updateUser`).
4. Test endpoints offline using `npx tgcloud run`.

### Phase 4: React Mini App (Frontend)
1. Build design tokens & CSS system in `src/index.css`.
2. Implement i18n dictionaries (`uz.js`, `ru.js`, `en.js`) and provider.
3. Build atomic components (`Button`, `Input`, `Select`, `Badge`, `Modal`).
4. Build features: `VacanciesView`, `VacancyDetail`, `PostJobWizard`, `ResumeView`, `ProfileView`.
5. Connect with `src/services/api.js`.

### Phase 5: Verification & End-to-End Testing
1. Test frontend build (`npm run build`).
2. Test handler and endpoint execution via `npx tgcloud run`.
3. Verify zero console errors, zero emojis, complete i18n coverage.
