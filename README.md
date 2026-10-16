# EasyFindBot — Telegram Serverless Job Board & Talent Platform

> Production-grade Telegram Serverless (`tgcloud`) bot backend and React Vite Mini App designed for job discovery, talent scouting, and automated channel moderation across Uzbekistan and Central Asia.

---

## 🌟 Key Features

- **⚡ Telegram Serverless Backend (`tgcloud/`)**:
  - Runs in a high-performance V8 isolate sandbox with SQLite native database (`sdk/db`).
  - Zero external npm packages required at runtime in the backend.
  - Strict Separation of Concerns (SoC) between webhook updates (`handlers/`), Mini App RPC endpoints (`endpoints/`), and business domain logic (`lib/bot/`).
- **🌐 100% Zero Hardcoded Strings (Trilingual Localized)**:
  - Both bot messages and Mini App UI are localized across **Uzbek (`uz`)**, **Russian (`ru`)**, and **English (`en`)**.
  - Bot responses resolve dynamically via `t(lang, key, params)` using `tgcloud/lib/locales/`.
  - Frontend Mini App uses React `useTranslation()` context from `src/locales/`.
- **👑 Dynamic Two-Tier Administration & Live Channel Moderation**:
  - 1 immutable Super Admin configured in `tgcloud/lib/config.js`.
  - Dynamic moderators/admins managed through SQLite `users` table (`role = 'admin'`).
  - Moderation channel (`moderation_channel_id`) and public job board channel (`public_channel_id`) configured dynamically via the in-bot Admin Panel without redeploying code.
  - Public channel posts utilize direct Telegram URL buttons (`https://t.me/<bot>/app?startapp=vac_<id>`) ensuring compliance with Telegram Bot API guidelines.
- **🎨 Modern Atomic Design System & Mini App UI (`src/`)**:
  - Exclusively powered by `@iconify/react` (Solar / Lucide icon sets) — zero unicode emojis or stickers.
  - Automatic Day/Night theme synchronization with Telegram (`Telegram.WebApp.colorScheme` & `themeChanged`).
  - Pure CSS design tokens (`src/index.css`) with glassmorphism, responsive bottom drawer modals, and shimmer loading skeletons.
  - Standalone browser development mode with comprehensive mock transport (`src/services/mockData.js`).
- **🔗 Seamless Telegram Deep Linking (`startapp`)**:
  - `/start vac_<id>`: Instantly opens vacancy modal.
  - `jobs`: Opens job discovery feed.
  - `post_job`: Launches 4-step employer posting wizard.
  - `my_apps`: Direct access to submitted candidate applications.
  - `my_vacs`: Direct access to posted vacancies & applicant reviews.

---

## 📂 Project Architecture

```
EasyFindBot/
├── tgcloud.jsonc                     # Telegram Cloud serverless configuration
├── package.json                      # Frontend dependencies & build scripts
├── vite.config.js                    # Vite bundler configuration
│
├── tgcloud/                          # Telegram Serverless Backend
│   ├── schema.js                     # SQLite schema definitions & indexes
│   ├── handlers/                     # Telegram webhook event handlers
│   │   ├── message.js                # Commands (/start, /admin, /help, text input)
│   │   └── callback_query.js         # Moderation buttons, language picker, admin navigation
│   ├── endpoints/                    # 16 Mini App RPC Serverless endpoints
│   │   ├── getInitData.js            # User session & active resume resolver
│   │   ├── getVacancies.js           # Filtered vacancy search with negotiable salary handling
│   │   ├── getVacancyById.js         # Vacancy details & view counter
│   │   ├── createVacancy.js          # Employer job posting endpoint
│   │   ├── closeVacancy.js           # Employer archive endpoint
│   │   ├── getMyVacancies.js         # Employer vacancies list
│   │   ├── createResume.js           # Candidate talent profile creator
│   │   ├── getResumes.js             # Talent directory search
│   │   ├── getMyResume.js            # Candidate active resume
│   │   ├── applyVacancy.js           # Candidate job application submission
│   │   ├── getMyApplications.js      # Candidate submitted applications
│   │   ├── getVacancyApplications.js # Employer candidate applicant review
│   │   ├── updateApplicationStatus.js# Accept / reject application status
│   │   ├── getSubscriptions.js       # Category notifications
│   │   ├── toggleSubscription.js     # Instant category subscription toggle
│   │   └── updateUser.js             # Role & language synchronization
│   └── lib/                          # Core Domain Logic & Services
│       ├── config.js                 # Super admin & default settings
│       ├── logger.js                 # Structured real-time logging
│       ├── constants/                # Roles, statuses, categories, salary types
│       ├── locales/                  # Backend localization (uz.js, ru.js, en.js, index.js)
│       └── bot/                      # auth, admin, moderator, channel, notifier, settings
│
└── src/                              # React Mini App (Frontend)
    ├── main.jsx                      # Entry point (Theme, Translation, Auth providers)
    ├── App.jsx                       # Root layout & tab router
    ├── index.css                     # Global design tokens, theme variables & atomic utilities
    ├── constants/                    # Routes, categories with Solar icons, regions
    ├── context/                      # AuthContext, ThemeContext
    ├── hooks/                        # useAuth, useTheme, useDeepLink
    ├── locales/                      # Frontend localization (uz.js, ru.js, en.js)
    ├── services/                     # Serverless API transport & mockData fallback
    ├── components/
    │   ├── common/                   # Atomic building blocks (Button, Input, Select, Badge,
    │   │                             # Modal, VacancyCard, ResumeCard, EmptyState, Skeleton)
    │   └── layout/                   # AppHeader, BottomNav
    └── modules/
        ├── vacancies/                # VacanciesView, VacancyDetailModal
        ├── post-job/                 # PostJobWizard (4-step multi-step form)
        ├── resumes/                  # ResumesView, CreateResumeModal
        └── profile/                  # ProfileView, EmployerVacanciesModal,
                                      # VacancyApplicantsModal, SeekerApplicationsModal,
                                      # SubscriptionsModal
```

---

## 🛠️ Local Development

### 1. Prerequisites
- Node.js 18+ installed on your machine.
- Git.

### 2. Install Dependencies
```bash
git clone https://github.com/islombek4642/EasyFindBot.git
cd EasyFindBot
npm install
```

### 3. Run Mini App Locally (Browser Mode)
```bash
npm run dev
```
Open `http://localhost:5173` in your browser. The application automatically detects that it is running outside Telegram and switches to the built-in realistic mock data adapter (`src/services/mockData.js`). All role switches, job postings, filters, and resume updates will function interactively in memory.

### 4. Build Production Bundle
```bash
npm run build
```
Generates production-optimized static assets in the `dist/` folder.

---

## 🚀 Telegram Serverless Deployment (`tgcloud`)

### 1. Authenticate with Telegram Cloud CLI
```bash
npx tgcloud login
```

### 2. Push Code and Deploy Endpoints
```bash
npx tgcloud push
```

### 3. Run Database Migrations
```bash
npx tgcloud migrate
```

### 4. Monitor Live Backend Logs
```bash
npx tgcloud logs
```

---

## 📱 Bot Commands & Deep Linking

| Command / Route | Description |
| :--- | :--- |
| `/start` | Onboards user in Uzbek, registers in DB, mounts Persistent Keyboard |
| `/start vac_<id>` | Deep links directly to specific job opening in Mini App |
| `/admin` | Displays admin panel to Super Admin & dynamic moderators |
| `/language` | Opens language selection keyboard |
| `/about` | Bot information, features, and platform mission |
| `/help` | User manual and support guide |
| `jobs` (startapp) | Opens Mini App directly on Vacancies Feed tab |
| `post_job` (startapp) | Opens Mini App directly on Post Job Wizard |
| `my_apps` (startapp) | Opens candidate's submitted job applications |
| `my_vacs` (startapp) | Opens employer's posted vacancies & candidate applicants |

---

## 📄 License
MIT License. Created for the Telegram Serverless ecosystem.
