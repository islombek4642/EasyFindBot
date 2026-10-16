# EasyFindBot — Agent Guidelines & Architecture Rules

This repository contains **EasyFindBot**, a Telegram Serverless Job Board and Talent Platform consisting of a Telegram bot backend (`tgcloud/`) and a React Vite Mini App (`src/`).

## Core Rules for All AI Agents

### 1. Telegram Serverless Backend (`tgcloud/`)
- **Zero NPM Packages at Runtime**: Only import `sdk`, `sdk/db`, `sdk/api` or internal modules from `tgcloud/lib/`.
- **Strict Relative Imports with `.js` Extension**: Every internal import must include `.js` (e.g., `import { users } from '../schema.js';`).
- **No SQLite Foreign Keys**: `PRAGMA foreign_keys = off`. Never use `.references()` or `foreignKey()`.
- **Unified Telegram IDs (`tgId`)**: All relational columns reference Telegram IDs (`employerTgId`, `seekerTgId`, `userTgId`).
- **All Database Calls Must Be Awaited**: SQLite async query builder.
- **Config Management**: No Node.js `process.env`. Use `tgcloud/lib/config.js`.

### 2. Frontend & Atomic Design System (`src/`)
- **Atomic Component Reusability (DRY)**:
  - Never write ad-hoc or duplicate inline cards, inputs, buttons, or modals.
  - All views compose building blocks from `src/components/common/`:
    - `<Button />`, `<Input />`, `<Select />`, `<Badge />`, `<Modal />`, `<ThemeToggle />`, `<VacancyCard />`, `<ResumeCard />`, `<EmptyState />`, `<Skeleton />`.
- **Zero Emojis or Stickers**: Use `@iconify/react` (Solar / Lucide icons) exclusively.
- **Zero Hardcoded Strings**: All text belongs in `src/locales/{uz,ru,en}.js` via `useTranslation()`.
- **Design Tokens & Auto Theme**:
  - All styling consumes CSS custom properties from `src/index.css`.
  - Automatic Day/Night theme synchronization with Telegram (`Telegram.WebApp.colorScheme`, `themeChanged` event).

### 3. Telegram Bot Interaction & Deep Linking
- Zero-friction `/start` onboarding with default `uz` language and persistent 3x2 Reply Keyboard.
- Full `startapp` deep linking navigation support (`jobs`, `post_job`, `my_apps`, `my_vacs`, `vac_<id>`).
