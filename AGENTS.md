# MarketPulse Agent Instructions

## Project

MarketPulse is a backend-first Node.js + TypeScript stock-community application.

## Priorities

1. Correctness
2. Security
3. Tests
4. Maintainability
5. Simplicity

## Stack

- Node.js
- TypeScript
- Fastify
- SQLite
- Drizzle ORM
- Zod
- Vitest
- Podman

## Rules

- Use strict TypeScript.
- Avoid `any` unless there is a documented reason.
- Validate external input.
- Never store plaintext passwords.
- Never commit secrets.
- Use parameterized/safe database operations.
- Enforce authorization on the backend.
- Prefer database constraints for invariants.
- Keep route handlers thin.
- Keep business rules in services/domain logic.
- Do not introduce unnecessary abstractions.
- Do not introduce microservices.
- Do not add infrastructure without a concrete requirement.
- Run relevant tests after changes.
- Run lint/build when appropriate.
- Never claim tests passed unless they were actually run.
- Do not fabricate implementation details in documentation.
- Explain significant architectural changes before implementing them.

## Backend First

The backend is the main deliverable.

The frontend should remain simple and should not drive backend architecture.

## Financial Content

User-generated/demo market content is application data and must not be represented as guaranteed financial advice or fact.
