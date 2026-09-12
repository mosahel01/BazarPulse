# MarketPulse

A backend-first stock-community platform: users discuss publicly traded stocks, create posts and structured trading ideas, maintain watchlists, vote, and participate in lightweight community moderation.

This is a portfolio-grade software-engineering project. It is **not** a financial-advice product; all user-generated and seeded market content is fictional/demo data.

## Stack

- **Runtime**: Node.js 22+ (tested on 26), TypeScript (strict), ESM
- **HTTP**: Fastify 5 + `@fastify/jwt`, `@fastify/rate-limit`, `@fastify/static`
- **Database**: SQLite + Drizzle ORM (`better-sqlite3`)
- **Auth**: JWT (HS256, 7-day), argon2 password hashing, Google Sign-In (ID-token verification via `jose`)
- **Validation**: Zod (central error mapping → 400 `VALIDATION_ERROR`)
- **Tests**: Vitest, 18 passing integration tests
- **Tooling**: ESLint flat config, Prettier, `typescript-eslint`, `tsx`

## Quick start (development)

```bash
npm install
cp .env.example .env          # set a strong AUTH_SECRET (openssl rand -hex 32)
npm run db:migrate            # create the schema (also done automatically at boot)
npm run db:seed               # optional demo data (see credentials below)
npm run dev                   # tsx watch — http://localhost:3000
```

The database file defaults to `./data/marketpulse.db` and migrations are applied automatically when the server starts, so a fresh clone only needs `npm install` + `.env`.

### Demo seed credentials (DEV ONLY)

All seed users share the password `MarketPulse@2026`:

- `admin` (ADMIN)
- `mod_mechanic` (MODERATOR)
- `sahiltrades`, `vikram__rm`, `priya_invests` … (USER)

Account updates: register/login hit the real API and are stored in the database, protected by JWT stored in `localStorage`. Feed/stocks still render from `demo-data.js` until their endpoints land — the navbar pill shows which source is active.

### Google Sign-In (optional)

1. Google Cloud Console → Credentials → Create an OAuth client ID (Web application).
2. Copy the client ID into `.env` as `GOOGLE_CLIENT_ID=…`.
3. Restart the server. The "Sign in with Google" button appears on the Auth page.

The frontend never sees a secret: it passes the Google ID token to `POST /api/v1/auth/google`, which verifies the signature against Google's JWKS (`https://www.googleapis.com/oauth2/v3/certs`), checks issuer/audience/`email_verified`, and creates or links the account.

## Productions run

```bash
npm run build                 # tsc + copy migrations into dist/
npm start                     # node dist/server.js
```

`npm start` applies pending migrations at boot and serves the frontend from `dist/../frontend`. Never seed a production database: `npm run db:seed` refuses to run with `NODE_ENV=production` unless `SEED_ALLOWED=true` is set deliberately.

## Scripts

| Command                           | Purpose                                              |
| --------------------------------- | ---------------------------------------------------- |
| `npm run dev`                     | Watch-mode dev server                                |
| `npm run build`                   | Type-check and emit `dist/` (including migrations)   |
| `npm start`                       | Run built server                                     |
| `npm run typecheck`               | `tsc --noEmit`                                       |
| `npm run lint`                    | ESLint                                               |
| `npm run format` / `format:check` | Prettier                                             |
| `npm test`                        | Vitest (18 integration tests)                        |
| `npm run db:generate`             | Drizzle migration generation from `src/db/schema.ts` |
| `npm run db:migrate`              | Apply pending migrations                             |
| `npm run db:seed`                 | Seed demo data (blocked in production)               |

## Architecture

- `src/config/` — Zod-validated environment + app config
- `src/db/` — schema, client, migrations, seed
- `src/modules/` — feature modules (auth: repository → service → routes)
- `src/plugins/` — database, JWT auth guard, rate limit, error handler
- `src/common/` — typed errors, Fastify/JWT module augmentation
- `src/routes.ts` — health probes + feature route registration
- `frontend/` — hash-router SPA served by Fastify (real-API-first with demo fallback)

MVP milestones continue per `marketpulse-project-spec.md`. Current status: M0–M3 complete (foundation, database, auth, Google Sign-In) plus a functional demo frontend.
