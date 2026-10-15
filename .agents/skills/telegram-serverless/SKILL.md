---
name: telegram-serverless
description: "Comprehensive guide, CLI reference, database DSL, handler architecture, Mini App endpoints, and best practices for building Telegram bots and Mini Apps with Telegram Serverless (tgcloud)."
---

# Telegram Serverless (`tgcloud`) Development Skill

Telegram Serverless lets you run backend code for your bot and Mini App directly on Telegram's infrastructure without provisioning servers, containers, or webhooks. Code executes in isolated, fast V8 sandboxes directly adjacent to the Bot API and a built-in SQLite database.

---

## 1. Mental Model & Architecture

You operate across three layers:
1. **Local project**: Plain JavaScript ES modules in `tgcloud/`, optional Mini App front-end in the project root, and config in `tgcloud.jsonc`.
2. **Cloud runtime**: Deployed modules, isolated SQLite database, hosted static Mini App files (`https://app<app_id>.tgcloud.ai/`).
3. **`tgcloud` CLI / BotFather**: The sync and management bridge (`push`, `migrate`, `run`, `status`, etc.).

### Project Structure

```bash
my-bot/
├── tgcloud/                  # ONLY contents of this folder are deployed to the backend
│   ├── handlers/             # Telegram update handlers (FLAT, no subdirectories)
│   │   ├── message.js        # Receives Message object
│   │   ├── callback_query.js # Receives CallbackQuery object
│   │   └── ...               # Any other Telegram update type (inline_query, etc.)
│   ├── endpoints/            # Functions called by Mini App (FLAT, no subdirectories)
│   │   ├── getProfile.js     # Called via Telegram.WebApp.Serverless.call('getProfile')
│   │   └── ...
│   ├── lib/                  # Reusable shared code (CAN have nested subdirectories)
│   │   ├── db/helpers.js
│   │   └── utils/format.js
│   └── schema.js             # Single source of truth for SQLite database tables
├── tgcloud.jsonc             # Project configuration (Mini App static hosting, etc.)
├── AGENTS.md                 # Agent guidance in repo
├── docs/                     # Documentation (e.g. tgcloud-sdk.md)
├── package.json              # Dev tooling and CLI dependencies
└── .tgcloud/                 # Machine-local state & tokens (GIT-IGNORED)
```

---

## 2. Critical Constraints & Golden Rules

> [!IMPORTANT]
> **Keep these strict platform rules in mind at all times:**

1. **NO NPM Packages at Runtime**:
   - Only the platform `sdk` and your own internal files inside `tgcloud/` can be imported.
   - Any external library must be implemented as plain JS in `tgcloud/lib/`.
2. **Strict Relative Imports with `.js` Extension**:
   - `import { users } from '../schema.js';` ✅
   - `import { helper } from '../lib/utils.js';` ✅
   - `import { db, api, fetch } from 'sdk';` ✅
   - `import { users } from '../schema';` ❌ (Must include `.js`)
   - `import config from '../../config.js';` ❌ (Cannot import outside `tgcloud/`)
3. **NO Foreign Keys**:
   - SQLite runs with `PRAGMA foreign_keys = off`.
   - `.references()` and `foreignKey()` **THROW AT RUNTIME** and prevent deployment.
   - Model relations as simple columns (`userId: integer('user_id')`) and maintain relational integrity in application code.
4. **All Database Calls are Asynchronous**:
   - Always `await db.select()...`, `await db.insert()...`, `await db.update()...`, `await db.delete()...`, `await db.run(...)`.
5. **Two-Step Deploy Flow**:
   - Code and DB are decoupled: `npx tgcloud push` uploads code and static assets, but **never** mutates database schema.
   - `npx tgcloud migrate` reviews and applies database schema migrations.
6. **Handlers Directory is Flat & Sparse**:
   - One file per update type (`handlers/message.js`, `handlers/callback_query.js`).
   - If an update type is not handled, do **NOT** leave an empty file. Delete or omit it so Telegram does not trigger an execution for unhandled events.

---

## 3. Database & Schema DSL (`sdk/db`)

Built on a Drizzle-compatible fluent API powered by SQLite.

### Declaring Tables (`tgcloud/schema.js`)

```javascript
import { table, integer, text, boolean, json, blob, real, index, uniqueIndex, check, sql } from 'sdk/db';

export const users = table('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tgId: integer('tg_id').unique().notNull(),
  name: text('name').notNull(),
  role: text('role').default('job_seeker'), // e.g., 'candidate', 'employer', 'admin'
  phone: text('phone'),
  isActive: boolean('is_active').default(true),
  metadata: json('metadata'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
}, (t) => ({
  tgIdIdx: index('idx_users_tg_id').on(t.tgId),
  roleIdx: index('idx_users_role').on(t.role),
}));
```

### Supported Column Types & Modes

| Type Factory | Storage | Modes / Notes |
|---|---|---|
| `integer(name, opts)` | INTEGER | `{ mode: 'timestamp' }` (seconds -> Date), `{ mode: 'timestamp_ms' }` (ms -> Date), `{ mode: 'boolean' }` |
| `text(name, opts)` | TEXT | `{ mode: 'json' }` (auto `JSON.stringify` / `JSON.parse`) |
| `boolean(name)` | INTEGER | Shorthand for `integer(name, { mode: 'boolean' })` |
| `json(name)` | TEXT | Shorthand for `text(name, { mode: 'json' })` |
| `real(name)` | REAL | Floating point numbers (alias `float()`) |
| `numeric(name)` | NUMERIC | Arbitrary numeric data |
| `blob(name)` | BLOB | Reads/writes `Uint8Array` (No Node.js `Buffer`!) |

### Modifiers

- `.primaryKey({ autoIncrement: true })`
- `.notNull()`
- `.unique()`
- `.default(value)` or `.default(sql\`(unixepoch())\`)`
- `.deprecated('reason')` (Used for safe drops during migration)

### Query Operations (`db`)

```javascript
import { db } from 'sdk';
import { eq, ne, and, or, desc, asc, like, inArray, isNull, sql } from 'sdk/db';
import { users } from '../schema.js';

// Select
const user = await db.select().from(users).where(eq(users.tgId, 12345678)).get();
const allActive = await db.select().from(users).where(eq(users.isActive, true)).orderBy(desc(users.createdAt)).limit(20).all();

// Count
const totalUsers = await db.$count(users);
const activeCount = await db.$count(users, eq(users.isActive, true));

// Insert & Upsert
const [newUser] = await db.insert(users)
  .values({ tgId: 12345, name: 'Ali' })
  .onConflictDoUpdate({
    target: users.tgId,
    set: { name: 'Ali Updated' },
  })
  .returning()
  .run();

// Update
await db.update(users).set({ role: 'employer' }).where(eq(users.tgId, 12345)).run();

// Delete
await db.delete(users).where(eq(users.id, 10)).run();

// Raw SQL
const result = await db.all(sql`SELECT * FROM users WHERE metadata->>'skills' LIKE '%JavaScript%'`);
```

---

## 4. Telegram Bot API Integration (`sdk/api`)

The `api` export wraps the complete Telegram Bot API.

```javascript
import { api, BotApiError, InputFile } from 'sdk';

// Standard call (unwrapped result, throws BotApiError on failure)
const sentMsg = await api.sendMessage({
  chat_id: chatId,
  text: "Xush kelibsiz!",
  reply_markup: {
    inline_keyboard: [
      [{ text: "Rezyume qoldirish", callback_data: "action_cv" }],
      [{ text: "Vakansiya qidirish", callback_data: "action_jobs" }]
    ]
  }
});

// Handling Errors
try {
  await api.deleteMessage({ chat_id, message_id });
} catch (err) {
  if (err instanceof BotApiError && err.code === 400) {
    // Message already deleted
  } else {
    throw err;
  }
}

// Uploading files with raw bytes (InputFile)
const resumeBytes = ...; // Uint8Array
await api.sendDocument({
  chat_id,
  document: new InputFile(resumeBytes, 'resume.pdf', { type: 'application/pdf' }),
  caption: 'Foydalanuvchi rezyumesi'
});

// Downloading files directly by file_id (up to 20MB)
const fileBytes = await api.getFileContent(file_id); // Returns Uint8Array
```

---

## 5. Handlers Architecture (`tgcloud/handlers/`)

Telegram passes the unwrapped payload as argument 1 and `ctx` as argument 2.

### `tgcloud/handlers/message.js`
```javascript
import { api } from 'sdk';
import { db } from 'sdk';
import { eq } from 'sdk/db';
import { users } from '../schema.js';

export default async function (message, ctx) {
  const chatId = message.chat.id;
  const userId = message.from?.id;
  const text = message.text;

  if (text === '/start') {
    await api.sendMessage({
      chat_id: chatId,
      text: "Assalomu alaykum! Ish topish botiga xush kelibsiz.",
    });
    return;
  }
  // Process message...
}
```

### `tgcloud/handlers/callback_query.js`
```javascript
import { api } from 'sdk';

export default async function (callbackQuery, ctx) {
  const data = callbackQuery.data;
  const msg = callbackQuery.message;

  await api.answerCallbackQuery({
    callback_query_id: callbackQuery.id,
    text: "Qabul qilindi!"
  });

  // Handle data action
}
```

---

## 6. Mini App Integration & Endpoints (`tgcloud/endpoints/`)

Endpoints are backend RPC functions invoked from Telegram Mini Apps using `Telegram.WebApp.Serverless.call`.

### Backend Endpoint: `tgcloud/endpoints/createVacancy.js`
```javascript
import { db, EndpointError } from 'sdk';
import { vacancies } from '../schema.js';

export default async function (input, ctx) {
  // ctx.initData is verified by Telegram platform automatically!
  const user = ctx.initData?.user;
  if (!user) {
    throw new EndpointError('Unauthorized user', { code: 'NO_AUTH' });
  }

  const { title, salary, description, category } = input;
  if (!title || !description) {
    throw new EndpointError('Sarlavha va tavsif to\'ldirilishi shart', { code: 'INVALID_INPUT' });
  }

  const [created] = await db.insert(vacancies).values({
    userId: user.id,
    title,
    salary,
    description,
    category,
  }).returning().run();

  return { success: true, vacancyId: created.id };
}
```

### Frontend Call:
```javascript
Telegram.WebApp.Serverless.call('createVacancy', {
  title: 'Senior Frontend Developer',
  salary: '2000$',
  description: 'React va Telegram Mini App bo\'yicha tajriba...',
  category: 'IT'
}, function (err, result) {
  if (err) {
    console.error('Xatolik:', err.message, err.parameters);
    alert(err.message);
    return;
  }
  alert('Vakansiya joylandi! ID: ' + result.vacancyId);
});
```

---

## 7. CLI Quick Reference (`@tgcloud/cli`)

| Command | Action |
|---|---|
| `npx tgcloud login` | Connect bot using CLI Access Token from `@BotFather` |
| `npx tgcloud status` | Compare local files against deployed cloud state |
| `npx tgcloud diff` | Detailed line-by-line diff with cloud |
| `npx tgcloud push` | Deploy modules in `tgcloud/` and Mini App static build |
| `npx tgcloud push handlers/message.js` | Targeted push of specific module |
| `npx tgcloud migrate` | Interactive schema migration check & apply |
| `npx tgcloud migrate --safe --yes` | Apply safe changes non-interactively |
| `npx tgcloud run <module> '<json5>'` | Run handler or endpoint locally without deploying |
| `npx tgcloud webhook` | Check webhook delivery status & synchronization |
| `npx tgcloud webhook sync` | Re-align webhook allowed updates with deployed handlers |
| `npx tgcloud pull` | Pull cloud modules to local files |
| `npx tgcloud reset` | Discard local changes and reset to cloud revision |

### Local Testing with `tgcloud run`

```bash
# Test message handler:
npx tgcloud run handlers/message '{ chat: { id: 100 }, from: { id: 100 }, text: "/start" }'

# Test Mini App endpoint with simulated initData:
npx tgcloud run endpoints/createVacancy '{ title: "Dev", description: "Exp" }' --ctx '{ initData: { user: { id: 100 } } }'
```

---

## 8. BotFather Serverless Setup Checklist

1. Open [@BotFather](https://t.me/BotFather) in Telegram.
2. Select `/mybots` -> Your Bot.
3. Click **Serverless** -> **Turn On**.
4. Click **CLI Access** -> **Access Token** -> Copy token (`app<id>:<secret>`).
5. In project: `npx tgcloud login` (enter token).
6. Verify status: `npx tgcloud status`.
