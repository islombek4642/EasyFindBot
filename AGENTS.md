# EasyFindBot — Agent Guidelines & Architecture Rules

This repository contains **EasyFindBot**, a Telegram Serverless Job Board and Talent Platform consisting of a Telegram bot backend (`tgcloud/`) and a React Vite Mini App (`src/`).

## Core Rules for All AI Agents

### 1. Separation of Concerns (SoC) — Strictly Enforced Across All Layers
All AI agents must strictly uphold clean architectural boundaries and single-responsibility principles. Never blur responsibilities between layers:
- **Backend Layers (`tgcloud/`)**:
  - `handlers/`: Exclusively handles Telegram webhook updates, parses message/callback inputs, and delegates immediately to services in `tgcloud/lib/bot/`. Never embed raw database queries or business orchestration in handler files.
  - `endpoints/`: Exclusively handles Mini App RPC requests. Validates incoming payload, checks session (`ctx.initData.user`), invokes database or helper logic, and returns formatted JSON.
  - `lib/bot/`: Dedicated business logic and external integration modules (`auth.js`, `admin.js`, `moderator.js`, `channel.js`, `notifier.js`, `settings.js`).
  - `lib/constants/`: Pure immutable domain enums and lookup arrays (`roles.js`, `statuses.js`, `categories.js`, `salaryTypes.js`).
  - `schema.js`: Pure data schema definition with SQLite table mappings and indices.
- **Frontend Layers (`src/`)**:
  - `services/api.js`: Exclusively handles network transport (`Telegram.WebApp.Serverless.call`) and dev mock data. Never manipulates UI state or DOM directly.
  - `context/`: Exclusively manages application-wide state (`AuthContext`, `ThemeContext`, `TranslationContext`).
  - `components/common/`: Pure presentational atomic building blocks (`Button`, `Input`, `Select`, `Badge`, `Modal`, `VacancyCard`, `ResumeCard`, `EmptyState`, `Skeleton`). Decoupled from specific route or business workflows; purely prop-driven.
  - `components/layout/`: Pure visual layout chrome (`AppHeader`, `BottomNav`).
  - `modules/`: Feature-level page views assembling common components, invoking context and API actions.
  - `locales/`: Pure localization dictionaries (`uz.js`, `ru.js`, `en.js`). Zero copy or text inside components.
  - `index.css`: Pure design tokens and utility rules. Zero inline hardcoded styling in JSX.

### 2. Telegram Serverless Backend (`tgcloud/`)
- **Zero NPM Packages at Runtime**: Only import `sdk`, `sdk/db`, `sdk/api` or internal modules from `tgcloud/lib/`.
- **Strict Relative Imports with `.js` Extension**: Every internal import must include `.js` (e.g., `import { users } from '../schema.js';`).
- **No SQLite Foreign Keys**: `PRAGMA foreign_keys = off`. Never use `.references()` or `foreignKey()`.
- **Unified Telegram IDs (`tgId`)**: All relational columns reference Telegram IDs (`employerTgId`, `seekerTgId`, `userTgId`).
- **All Database Calls Must Be Awaited**: SQLite async query builder.
- **Config Management**: No Node.js `process.env`. Use `tgcloud/lib/config.js` and dynamic `settings` table.

### 3. Frontend & Atomic Design System (`src/`)
- **Atomic Component Reusability (DRY)**:
  - Never write ad-hoc or duplicate inline cards, inputs, buttons, or modals.
  - All views compose building blocks from `src/components/common/`.
- **Zero Emojis or Stickers**: Use `@iconify/react` (Solar / Lucide icons) exclusively.
- **Zero Hardcoded Strings**: All text belongs in `src/locales/{uz,ru,en}.js` via `useTranslation()`.
- **Design Tokens & Auto Theme**:
  - All styling consumes CSS custom properties from `src/index.css`.
  - Automatic Day/Night theme synchronization with Telegram (`Telegram.WebApp.colorScheme`, `themeChanged` event).

### 4. Telegram Bot Interaction & Deep Linking
- Zero-friction `/start` onboarding with default `uz` language and persistent Reply Keyboard.
- Dynamic 4th row `⚙️ Admin panel` mounted exclusively for authorized administrators.
- Full `startapp` deep linking navigation support (`jobs`, `post_job`, `my_apps`, `my_vacs`, `vac_<id>`).
- Direct URL buttons (`https://t.me/<bot>/app?startapp=vac_<id>`) for public channel posts (Telegram rejects `web_app` buttons in channels).
