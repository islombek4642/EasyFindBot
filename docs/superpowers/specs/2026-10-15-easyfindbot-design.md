# EasyFindBot — Telegram Serverless Job & Talent Platform Spec

## 1. Overview & Goals

**EasyFindBot** is a production-grade Job Board and Recruiting system on Telegram that leverages the **Telegram Serverless (`tgcloud`)** platform. It provides a hybrid experience:
- **Telegram Bot (`handlers/`)**: Handles onboarding, push notifications, subscription alerts, and secure admin moderation workflows.
- **Telegram Mini App (`src/` & `endpoints/`)**: Provides a premium, app-like SPA for posting vacancies, searching jobs, browsing resumes, and managing applications.
- **Hosted Mini App Front-End**: Built with React and Vite, hosted directly on Telegram Serverless static CDN (`https://app<app_id>.tgcloud.ai`).

### Guiding Principles & Hard Rules
1. **No Emojis or Stickers**: Any visual symbology must exclusively use **Iconify** icons (Solar / Lucide via `@iconify/react`).
2. **Zero Hardcoded Strings**: All text, labels, placeholders, and error messages are centralized in dedicated localization files (`locales/uz.js`, `locales/ru.js`, `locales/en.js`) referenced via typed constant keys.
3. **Automatic Day / Night Theme Adaptation**:
   - Mini App dynamically detects and synchronizes with Telegram theme settings via `Telegram.WebApp.colorScheme` and `Telegram.WebApp.themeParams`.
   - Subscribes to `Telegram.WebApp.onEvent('themeChanged', ...)`.
   - Standalone / browser dev fallback to `window.matchMedia('(prefers-color-scheme: dark)')`.
4. **Unified User Identification (`tgId`)**:
   - All relations across all tables strictly use Telegram ID (`tgId` / `employerTgId` / `seekerTgId` / `userTgId`), matching `ctx.initData.user.id` from Telegram Serverless runtime.
5. **Telegram Serverless Platform Constraints**:
   - Zero npm packages at runtime inside `tgcloud/` modules.
   - All imports within `tgcloud/` are relative and must include the `.js` extension.
   - Native SQLite via `sdk/db` with **no foreign keys** (`PRAGMA foreign_keys = off`). Relational integrity is enforced in application code.
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
│   │   ├── message.js                    # /start, deep link routing, help, launcher
│   │   └── callback_query.js             # Admin moderation (approve/reject with auth check)
│   ├── endpoints/                        # Mini App Serverless RPC
│   │   ├── getInitData.js                # Auth & user state via ctx.initData
│   │   ├── getVacancies.js               # Filtered vacancy search with pagination
│   │   ├── getVacancyById.js             # Detailed vacancy view + view count bump
│   │   ├── createVacancy.js              # Post new vacancy -> pending state
│   │   ├── closeVacancy.js               # Close/archive vacancy by employer
│   │   ├── getMyVacancies.js             # Employer's postings with status
│   │   ├── createResume.js               # Post / update resume
│   │   ├── getResumes.js                 # Talent search for employers
│   │   ├── getMyResume.js                # Retrieve authenticated user's resume
│   │   ├── applyVacancy.js               # Candidate application submission (unique check)
│   │   ├── getMyApplications.js          # Candidate view of applied vacancies & status
│   │   ├── getVacancyApplications.js     # Employer view of applicants for a vacancy
│   │   ├── updateApplicationStatus.js    # Employer status change (viewed, accepted, rejected)
│   │   ├── getSubscriptions.js           # Seeker active notification subscriptions
│   │   ├── toggleSubscription.js         # Subscribe/unsubscribe category & region
│   │   └── updateUser.js                 # Language & profile update
│   ├── lib/                              # Shared backend logic
│   │   ├── config.js                     # Admin IDs, Channel IDs, bot configuration
│   │   ├── constants/
│   │   │   ├── categories.js             # Standard job categories & regions
│   │   │   ├── statuses.js               # PENDING, APPROVED, REJECTED, CLOSED
│   │   │   ├── salaryTypes.js            # RANGE, FIXED, NEGOTIABLE
│   │   │   └── roles.js                  # SEEKER, EMPLOYER, ADMIN
│   │   └── bot/
│   │       ├── notifier.js               # Push notifications to candidates & employers
│   │       ├── moderator.js              # Admin review notification & card builder
│   │       └── channel.js                # Formatted markdown channel publisher
│   └── schema.js                         # SQLite Drizzle-like table definitions
├── src/                                  # React Mini App Frontend (Vite)
│   ├── assets/                           # Static assets
│   ├── components/
│   │   ├── common/                       # Base components (Button, Input, Select, Badge, Modal, ThemeToggle)
│   │   └── layout/                       # AppHeader, BottomNav, Container
│   ├── constants/
│   │   ├── categories.js
│   │   ├── regions.js
│   │   ├── routes.js
│   │   └── translations.js
│   ├── context/
│   │   ├── ThemeContext.jsx              # Automatic Telegram Day/Night theme provider
│   │   └── AuthContext.jsx               # Current user, active role, initData cache
│   ├── hooks/
│   │   ├── useDeepLink.js                # Handles ?startapp=vac_<id> direct navigation
│   │   └── useTheme.js                   # Day/Night theme state hook
│   ├── locales/
│   │   ├── index.js                      # Language provider & useTranslation hook
│   │   ├── uz.js                         # Uzbek strings
│   │   ├── ru.js                         # Russian strings
│   │   └── en.js                         # English strings
│   ├── modules/
│   │   ├── vacancies/                    # Vacancy list, search, filter chips, details modal
│   │   ├── post-job/                     # Multi-step job posting wizard
│   │   ├── resumes/                      # Resume creator & talent browsing
│   │   └── profile/                      # User dashboard, my vacancies, my applications, language switcher
│   ├── services/
│   │   └── api.js                        # Telegram.WebApp.Serverless.call wrapper + dev mock
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css                         # Design system (variables, glassmorphism, day/night tokens)
├── tgcloud.jsonc                         # Static hosting configuration ("source": "dist")
├── package.json
└── vite.config.js
```

---

## 3. Database Schema (`tgcloud/schema.js`)

All tables are defined in `tgcloud/schema.js` using `sdk/db`. All foreign associations strictly reference `tgId` (integer):

```javascript
import { table, integer, text, boolean, json, index, uniqueIndex, sql } from 'sdk/db';

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
  tgIdIdx: uniqueIndex('idx_users_tg_id').on(t.tgId),
  roleIdx: index('idx_users_role').on(t.role),
}));

export const vacancies = table('vacancies', {
  id:               integer('id').primaryKey({ autoIncrement: true }),
  employerTgId:     integer('employer_tg_id').notNull(),
  title:            text('title').notNull(),
  companyName:      text('company_name').notNull(),
  category:         text('category').notNull(),
  region:           text('region').notNull(),
  employmentType:   text('employment_type').notNull(), // 'full_time', 'part_time', 'remote', 'internship'
  salaryType:       text('salary_type').notNull().default('range'), // 'range', 'fixed', 'negotiable'
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
  moderatedByTgId:  integer('moderated_by_tg_id'),
  createdAt:        integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt:        integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
}, (t) => ({
  employerIdx: index('idx_vacancies_employer').on(t.employerTgId),
  statusIdx:   index('idx_vacancies_status').on(t.status),
  categoryIdx: index('idx_vacancies_category').on(t.category),
  regionIdx:   index('idx_vacancies_region').on(t.region),
}));

export const resumes = table('resumes', {
  id:              integer('id').primaryKey({ autoIncrement: true }),
  seekerTgId:      integer('seeker_tg_id').notNull(),
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
  seekerIdx:   index('idx_resumes_seeker').on(t.seekerTgId),
  categoryIdx: index('idx_resumes_category').on(t.category),
}));

export const applications = table('applications', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  vacancyId:   integer('vacancy_id').notNull(),
  seekerTgId:  integer('seeker_tg_id').notNull(),
  resumeId:    integer('resume_id'),
  coverLetter: text('cover_letter'),
  status:      text('status').notNull().default('applied'), // 'applied', 'viewed', 'accepted', 'rejected'
  createdAt:   integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt:   integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
}, (t) => ({
  vacancyIdx:   index('idx_app_vacancy').on(t.vacancyId),
  seekerIdx:    index('idx_app_seeker').on(t.seekerTgId),
  uniqueAppIdx: uniqueIndex('idx_app_unique').on(t.vacancyId, t.seekerTgId),
}));

export const subscriptions = table('subscriptions', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  userTgId:  integer('user_tg_id').notNull(),
  category:  text('category').notNull(),
  region:    text('region'),
  isActive:  boolean('is_active').notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
}, (t) => ({
  userTgIdIdx: index('idx_sub_user_tg_id').on(t.userTgId),
  uniqueSubIdx: uniqueIndex('idx_sub_unique').on(t.userTgId, t.category, t.region),
}));
```

---

## 4. Moderation, Configuration & Channel Broadcasting Workflow

### 4.1. Configuration (`tgcloud/lib/config.js`)
Since the V8 sandbox has no Node `process.env`, configuration is centralized in `tgcloud/lib/config.js`:
```javascript
export const config = {
  adminTgIds: [/* Telegram IDs of authorized moderators */],
  channelId: '@EasyFindJobs',       // or -100xxxxxxxxxx numeric channel ID
  channelUsername: 'EasyFindJobs',
  botUsername: 'EasyFindBot',
  defaultCurrency: 'USD',
  paginationLimit: 15,
};
```

### 4.2. Moderation Workflow
1. **Submission**: Employer submits vacancy via Mini App -> `createVacancy` endpoint sets `status = 'pending'`.
2. **Admin Alert**: Backend sends an admin review card to all configured `config.adminTgIds` via `api.sendMessage` with Inline Keyboard:
   - `[ Tasdiqlash / Approve ]` (`callback_data: "admin:approve:<id>"`)
   - `[ Rad etish / Reject ]` (`callback_data: "admin:reject:<id>"`)
3. **Authorization Check (`callback_query.js`)**:
   - Before processing approval/rejection, verifies `config.adminTgIds.includes(callbackQuery.from.id)`.
   - If unauthorized: answers callback with alert `"Sizda administrator huquqi yo'q"`.
4. **On Approve**:
   - Updates `vacancies.status = 'approved'`, records `moderatedByTgId`.
   - Formats a clean Telegram post with title, company, salary (range/fixed/negotiable), requirements, and inline button opening Mini App deep link (`t.me/EasyFindBot/app?startapp=vac_<id>`).
   - Dispatches post to channel with error handling (logging error without failing transaction).
   - Queries `subscriptions` matching vacancy category & region and dispatches push alerts.
   - Dispatches notification to employer that vacancy is now live.
5. **On Reject**:
   - Updates `vacancies.status = 'rejected'`.
   - Dispatches notification to employer.

---

## 5. Automatic Day / Night Theme Architecture

### 5.1. Synchronization Strategy
The Mini App operates within Telegram's WebApp view where Telegram exposes:
- `Telegram.WebApp.colorScheme`: `'light'` | `'dark'`
- `Telegram.WebApp.themeParams`:
  - `bg_color`, `secondary_bg_color`, `text_color`, `hint_color`, `link_color`, `button_color`, `button_text_color`

### 5.2. Implementation (`src/context/ThemeContext.jsx` & `src/index.css`)
1. On initialization, read `Telegram.WebApp.colorScheme`. If undefined (outside Telegram), inspect `window.matchMedia('(prefers-color-scheme: dark)').matches`.
2. Apply `dark` or `light` class to `document.documentElement` and set CSS variables.
3. Listen to `Telegram.WebApp.onEvent('themeChanged', applyTheme)`.
4. Provide a toggle button in `ProfileView` for manual override with `localStorage` persistence.
5. Design tokens define harmonious color palettes:
   - **Dark Mode**: Deep slate background (`#0B0F19`), card background (`#151D2F`), border (`rgba(255,255,255,0.08)`), text (`#F8FAFC`), muted (`#94A3B8`), accent (`#38BDF8`).
   - **Light Mode**: Clean background (`#F8FAFC`), card background (`#FFFFFF`), border (`#E2E8F0`), text (`#0F172A`), muted (`#64748B`), accent (`#0284C7`).

---

## 6. Telegram Bot Interaction & Deep Linking UX

### 6.1. Zero-Friction Onboarding & Persistent Reply Keyboard
When a user launches the bot with `/start`:
1. **Default Language**: The user's language defaults to Uzbek (`uz`) immediately without blocking questions or preliminary confirmation steps (can also inspect `message.from.language_code` with fallback `uz`).
2. **Welcome Message**:
   > *"Assalomu alaykum, {firstName}!*  
   > *EasyFindBot — ish va xodim topish platformasiga xush kelibsiz.*  
   > *Quyidagi menyudan kerakli bo'limni tanlang:"*
3. **Persistent Reply Keyboard (Chat pastki doimiy tugmalari)**:
   The bot immediately delivers a clean 3x2 Reply Keyboard utilizing native `web_app` buttons:
   ```text
   ┌──────────────────────────────┬──────────────────────────────┐
   │   🔍 Ish qidirish (Ilova)    │   📢 E'lon berish (Ilova)    │
   ├──────────────────────────────┼──────────────────────────────┤
   │    💼 Mening arizalarim      │     🏢 Mening e'lonlarim     │
   ├──────────────────────────────┼──────────────────────────────┤
   │    🌐 Tilni o'zgartirish     │        ℹ️ Bot haqida         │
   └──────────────────────────────┴──────────────────────────────┘
   ```
   - **`🔍 Ish qidirish (Ilova)`** (`web_app: { url: 'https://app<id>.tgcloud.ai?startapp=jobs' }`): Launches Mini App directly at the Vacancy Search view.
   - **`📢 E'lon berish (Ilova)`** (`web_app: { url: 'https://app<id>.tgcloud.ai?startapp=post_job' }`): Launches Mini App directly at the Post Job multi-step wizard.
   - **`💼 Mening arizalarim`** (`web_app: { url: 'https://app<id>.tgcloud.ai?startapp=my_apps' }`): Launches Mini App directly opening the user's submitted applications dashboard.
   - **`🏢 Mening e'lonlarim`** (`web_app: { url: 'https://app<id>.tgcloud.ai?startapp=my_vacs' }`): Launches Mini App directly opening employer's posted vacancies and applicant review modal.
   - **`🌐 Tilni o'zgartirish`**: Sends an inline message with 3 options: `[ 🇺🇿 O'zbekcha ]` `[ 🇷🇺 Русский ]` `[ 🇬🇧 English ]`. Upon click, updates user's language in SQLite and updates the Reply Keyboard in selected language.
   - **`ℹ️ Bot haqida`**: Sends a structured message explaining platform purpose, official channel link, and contact/support details.

### 6.2. Mini App Deep Linking Routes (`src/hooks/useDeepLink.js`)
The Mini App parses `Telegram.WebApp.initDataUnsafe?.start_param`:
- `startapp=jobs`: Navigates to Vacancies tab (`VacanciesView`).
- `startapp=post_job`: Navigates to Post Job tab (`PostJobWizard`).
- `startapp=my_apps`: Navigates to Profile tab and opens `SeekerApplicationsModal`.
- `startapp=my_vacs`: Navigates to Profile tab and opens `EmployerVacanciesModal`.
- `startapp=vac_<id>`: Automatically calls `getVacancyById(<id>)` and opens `VacancyDetailModal` with full description and apply form.

### 6.3. Bot Direct Link Handling (`/start vac_<id>`)
- When a user enters the bot via `/start vac_<id>`:
  - `handlers/message.js` parses the vacancy ID.
  - Queries `vacancies` table and sends a preview card (Title, Company, Salary, Region).
  - Attaches an inline button: `[ 📄 To'liq ko'rish va ariza topshirish ]` with `web_app: { url: 'https://app<id>.tgcloud.ai?startapp=vac_<id>' }`.

### 6.4. Bot Command Menu (`setMyCommands`) & Command Routing
The bot registers official slash commands appearing in Telegram's native command menu ("/" button):
- `/start` — Botni qayta ishga tushirish va asosiy menyu
- `/app` — Mini App platformasini ochish
- `/language` — Muloqot tilini o'zgartirish (O'zbekcha / Русский / English)
- `/help` — Qo'llanma va yordam

In `handlers/message.js`:
- `/start`: Initializes user record, sends welcome message, and mounts 3x2 Reply Keyboard.
- `/app`: Sends a direct inline WebApp button launching the Mini App.
- `/language`: Dispatches the inline language selection menu (`uz`, `ru`, `en`).
- `/help`: Dispatches user guide, tips for seekers and employers, and official support contacts.
- Bot initialization/startup registers these command sets across languages (`uz`, `ru`, `en`) via `api.setMyCommands`.

---

## 7. Mini App Navigation & Feature Set

Bottom Navigation Bar:
1. **Jobs (Vakansiyalar)**:
   - Keyword search input.
   - Category chips & region dropdown filter.
   - Salary filter (Range / Negotiable).
   - Infinite scroll / "Yana yuklash" pagination.
   - Vacancy card & detail modal with "Apply" button.
2. **Post Job (E'lon berish)**:
   - Step 1: Title, Company Name, Category, Region, Employment Type.
   - Step 2: Salary Type (Range, Fixed, Negotiable), Salary Min/Max, Currency.
   - Step 3: Description, Requirements, Contact info.
   - Submission creates pending vacancy.
3. **Resumes (Nomzodlar)**:
   - Talent pool for employers (search by skill/category).
   - "Mening rezyumem" creator/editor for job seekers.
4. **Profile (Profil)**:
   - Language selector (`uz` / `ru` / `en`).
   - Theme mode indicator & toggle (Auto Telegram / Light / Dark).
   - Role switcher (`seeker` / `employer`).
   - **Ish beruvchi uchun**: "Mening e'lonlarim" (`getMyVacancies`), "Kelgan arizalar" (`getVacancyApplications`), arizalarni qabul qilish/rad etish (`updateApplicationStatus`), e'lonni yopish (`closeVacancy`).
   - **Nomzod uchun**: "Mening arizalarim" (`getMyApplications`), "Obunalarim" (`getSubscriptions`, `toggleSubscription`).

---

## 8. Implementation & Verification Plan

### Phase 1: Project Scaffolding & Serverless Backend
1. Initialize Vite React app at project root with Vanilla CSS design system, `@iconify/react`.
2. Configure `tgcloud/` with `schema.js`, `lib/config.js`, `lib/constants/`, `handlers/`, and `endpoints/`.
3. Configure `tgcloud.jsonc` with `"static": { "source": "dist", "spa": true }`.

### Phase 2: Database Schema & Migration
1. Apply `schema.js` tables with unified `tgId` keys, unique application and subscription indexes.
2. Validate with `npx tgcloud migrate --dry-run` and apply schema.

### Phase 3: Handlers & Comprehensive Endpoints
1. `handlers/message.js` (`/start`, deep link routing, language selection).
2. `handlers/callback_query.js` (Moderator auth verification, approve/reject workflow).
3. Implement all 16 endpoints:
   - `getInitData`, `getVacancies`, `getVacancyById`, `createVacancy`, `closeVacancy`, `getMyVacancies`.
   - `createResume`, `getResumes`, `getMyResume`.
   - `applyVacancy`, `getMyApplications`, `getVacancyApplications`, `updateApplicationStatus`.
   - `getSubscriptions`, `toggleSubscription`, `updateUser`.
4. Test endpoints offline using `npx tgcloud run`.

### Phase 4: React Mini App Frontend
1. Build design tokens & auto day/night theme engine (`src/index.css`, `ThemeContext.jsx`).
2. Implement i18n dictionaries (`uz.js`, `ru.js`, `en.js`) and provider.
3. Build atomic components (`Button`, `Input`, `Select`, `Badge`, `Modal`).
4. Implement API transport layer (`src/services/api.js`) with dev mock adapter for local browser development.
5. Build features: `VacanciesView`, `VacancyDetailModal`, `PostJobWizard`, `ResumesView`, `ProfileView` (Employer & Seeker dashboards).
6. Implement `useDeepLink.js` for seamless channel-to-modal navigation.

### Phase 5: Verification & End-to-End Testing
1. Test frontend build (`npm run build`).
2. Validate zero console warnings, zero emojis, complete i18n coverage.
3. Validate automatic theme detection in dark and light modes.
4. Verify complete end-to-end user flows for both Seekers and Employers.
