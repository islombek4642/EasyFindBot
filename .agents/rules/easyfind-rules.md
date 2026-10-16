---
trigger: always_on
description: Strict architectural rules, Telegram Serverless constraints, and Atomic Design System standards for EasyFindBot.
---

# EasyFindBot — Agent Architectural Rules

Every AI agent working on this repository MUST strictly abide by these core principles across all backend and frontend tasks:

## 1. Telegram Serverless Backend (`tgcloud/`)
- **Zero NPM Packages**: Never import or install NPM packages inside `tgcloud/`. Only import platform `sdk`, `sdk/db`, `sdk/api` or internal modules from `tgcloud/lib/`.
- **Strict Relative Imports with `.js`**: Always include the `.js` extension (e.g. `import { users } from '../schema.js';`).
- **No SQLite Foreign Keys**: SQLite runs with `PRAGMA foreign_keys = off`. Never call `.references()` or `foreignKey()` — they throw at runtime. Enforce relational integrity in application code.
- **Unified Telegram IDs (`tgId`)**: All foreign keys and user relations strictly use Telegram ID (e.g. `employerTgId`, `seekerTgId`, `userTgId`), matching `ctx.initData.user.id`.
- **All DB Calls are Asynchronous**: Always use `await db.select()`, `await db.insert()`, `await db.update()`, `await db.delete()`.
- **No Node.js `process.env`**: Configuration lives in `tgcloud/lib/config.js`.

## 2. Strict Reusable Design System & Frontend Architecture (`src/`)
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

## 3. Bot Handlers & Navigation
- `/start` onboarding must be zero-friction: default language `uz` without blocking confirmation dialogs.
- Mount persistent 3x2 Reply Keyboard with native `web_app` buttons for `jobs`, `post_job`, `my_apps`, `my_vacs`.
- Support deep linking via `startapp` routes (`jobs`, `post_job`, `my_apps`, `my_vacs`, `vac_<id>`).
