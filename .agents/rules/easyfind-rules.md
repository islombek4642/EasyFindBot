---
trigger: always_on
description: Strict architectural rules, Separation of Concerns, Telegram Serverless constraints, and Atomic Design System standards for EasyFindBot.
---

# EasyFindBot — Agent Architectural Rules

Every AI agent working on this repository MUST strictly abide by these core principles across all backend and frontend tasks:

## 1. Separation of Concerns (SoC) — Strictly Enforced Across All Layers
All agents must uphold clean architectural boundaries. Never mix layer responsibilities:
- **Telegram Handlers (`tgcloud/handlers/`)**: Exclusively responsible for incoming Telegram webhooks (updates), parsing commands and callback data, and delegating immediately to service modules in `tgcloud/lib/bot/`. Do NOT embed raw SQL queries or direct business workflows in handlers.
- **Serverless RPC Endpoints (`tgcloud/endpoints/`)**: Exclusively responsible for handling Mini App requests, validating input parameters, verifying `ctx.initData.user`, executing data queries, and returning standard JSON results.
- **Domain Services & Integrations (`tgcloud/lib/bot/`)**: Dedicated modules for domain logic (`auth.js`, `admin.js`, `moderator.js`, `channel.js`, `notifier.js`, `settings.js`).
- **Data Definition (`tgcloud/schema.js`)**: Pure SQLite schema definitions and indexes.
- **Constants (`tgcloud/lib/constants/`)**: Pure domain constants and enumerations.
- **API Transport (`src/services/api.js`)**: Pure data transport layer invoking `Telegram.WebApp.Serverless.call` with mock fallback for standalone dev. Zero UI or DOM logic.
- **State Management (`src/context/`)**: Application state only (`AuthContext`, `ThemeContext`, `TranslationContext`).
- **Atomic Presentation Components (`src/components/common/`)**: Pure presentational components receiving data via props. Decoupled from specific backend routes or global application flows.
- **Layout (`src/components/layout/`)**: Application navigation shell (`AppHeader`, `BottomNav`).
- **Feature Modules (`src/modules/`)**: High-level page views composing common components and consuming context.
- **Localization (`src/locales/`)**: Pure translation dictionaries (`uz.js`, `ru.js`, `en.js`). Zero hardcoded text in UI.
- **Styling (`src/index.css`)**: Pure CSS design tokens and base styles. Zero hardcoded inline CSS in JSX.

## 2. Telegram Serverless Backend (`tgcloud/`)
- **Zero NPM Packages**: Never import or install NPM packages inside `tgcloud/`. Only import platform `sdk`, `sdk/db`, `sdk/api` or internal modules from `tgcloud/lib/`.
- **Strict Relative Imports with `.js`**: Always include the `.js` extension (e.g. `import { users } from '../schema.js';`).
- **No SQLite Foreign Keys**: SQLite runs with `PRAGMA foreign_keys = off`. Never call `.references()` or `foreignKey()` — they throw at runtime. Enforce relational integrity in application code.
- **Unified Telegram IDs (`tgId`)**: All foreign keys and user relations strictly use Telegram ID (e.g. `employerTgId`, `seekerTgId`, `userTgId`), matching `ctx.initData.user.id`.
- **All DB Calls are Asynchronous**: Always use `await db.select()`, `await db.insert()`, `await db.update()`, `await db.delete()`.
- **No Node.js `process.env`**: Configuration lives in `tgcloud/lib/config.js` and dynamic `settings` table.

## 3. Strict Reusable Design System & Frontend Architecture (`src/`)
- **Atomic Component Reusability (DRY)**:
  - Never write ad-hoc or duplicated inline markup for buttons, inputs, modals, or entity cards.
  - All views must compose pre-built atomic building blocks from `src/components/common/`:
    - `<Button />`: standard variants (`primary`, `secondary`, `outline`, `danger`), sizes (`sm`, `md`, `lg`), loading state.
    - `<Input />`: icon slot, label, error helper.
    - `<Select />`: unified styled select dropdown.
    - `<Badge />`: status, category, salary pills.
    - `<Modal />`: smooth transition drawer/dialog with backdrop.
    - `<VacancyCard />`: unified job listing card reused across search and management views.
    - `<ResumeCard />`: unified talent listing card.
    - `<EmptyState />`: unified placeholder for empty lists with Iconify icon and action button.
    - `<Skeleton />`: shimmer loading state.
- **Zero Hardcoded Strings**: All UI copy, placeholders, error alerts, and button labels must reside in `src/locales/{uz,ru,en}.js` and be accessed via `useTranslation()`.
- **Zero Emojis or Stickers**: Use `@iconify/react` exclusively (Solar / Lucide sets).
- **Zero Hardcoded Colors or Inline Styles**: All styling must consume CSS design tokens declared in `src/index.css`.
- **Automatic Day / Night Theme Adaptation**:
  - Dynamically detect and synchronize with `Telegram.WebApp.colorScheme` and `Telegram.WebApp.themeParams`.
  - Listen for `themeChanged` event.

## 4. Bot Handlers & Navigation
- `/start` onboarding must be zero-friction: default language `uz` without blocking confirmation dialogs.
- Mount persistent Reply Keyboard with dynamic 4th row `⚙️ Admin panel` for authorized administrators.
- Support deep linking via `startapp` routes (`jobs`, `post_job`, `my_apps`, `my_vacs`, `vac_<id>`).
- Direct URL buttons (`https://t.me/<bot>/app?startapp=vac_<id>`) for public channel posts.
