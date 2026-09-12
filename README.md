# MarketPulse

A backend-first stock-community platform: users discuss publicly traded stocks, create posts and structured trading ideas, maintain watchlists, vote, and participate in lightweight community moderation.

This is a portfolio-grade software-engineering project. It is **not** a financial-advice product; all user-generated and seeded market content is fictional/demo data.

> Detailed implementation notes (architecture, stack rationale, API, testing, Podman, feed ranking, tradeoffs, and scaling discussion) land here as development proceeds.

## Status

MVP in progress. Current milestone: **M1 — Foundation** (Fastify server, config, health checks, error handling). Verification for M1 is green: `typecheck`, `lint`, `build`, `test` (3 passing), and the dev & production servers respond on `/health`.

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:3000/health and browse the spec file (`marketpulse-project-spec.md`) for the roadmap. `/docs` (Swagger) arrives with the API surface.
