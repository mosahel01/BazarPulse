# MarketPulse

A stock-community platform: stock discussion, trading ideas, watchlists, voting, and a prediction game. Backend-first with a demo frontend. Not financial advice — all market content is demo data.

## Stack

Node.js · TypeScript · Fastify · SQLite + Drizzle · JWT auth · Google Sign-In · Zod · Vitest

## Quick start

```bash
npm install
cp .env.example .env    # set AUTH_SECRET (openssl rand -hex 32)
npm run dev             # http://localhost:3000
```

Migrations apply automatically at boot. `npm run db:seed` loads optional demo data (seeded users share password `MarketPulse@2026`).

## Production

```bash
npm run build && npm start
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Type-check + emit `dist/` |
| `npm start` | Run built server |
| `npm test` | Vitest |
| `npm run lint` | ESLint |
| `npm run db:seed` | Seed demo data |