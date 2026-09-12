# MarketPulse — Backend-First Stock Community Platform

> A portfolio-grade backend project inspired by the problem space of stock discussion, investor communities, watchlists, and trading ideas.
>
> **Primary goal:** demonstrate strong Node.js/TypeScript backend engineering, API design, data modeling, business logic, validation, authentication/authorization, testing, containerization, and practical software architecture.
>
> **Important:** This is a software engineering project. It is not a financial-advice product and must not present generated or user-submitted content as investment advice.

---

## 1. Project Overview

MarketPulse is a backend-first web application where users can discuss publicly traded stocks, create and interact with posts, publish structured trading ideas, maintain watchlists, and participate in lightweight community moderation.

The application should feel like a small, realistic backend system rather than a toy CRUD API.

The project should deliberately emphasize:

- HTTP API design
- TypeScript correctness
- relational data modeling
- database constraints
- authentication
- authorization
- validation
- service-layer business rules
- pagination
- feed generation/ranking
- moderation
- rate limiting where practical
- robust error handling
- automated tests
- API documentation
- containerized deployment
- clean repository structure
- observability-friendly logging
- maintainable code over clever code

The frontend exists only to prove that the API is usable. It should remain intentionally simple and should never become the main focus of the project.

---

# 2. Project Goals

## 2.1 Primary goals

Build a backend that can be discussed confidently in a software-development interview.

A reviewer should be able to see evidence of:

1. Familiarity with Node.js.
2. Practical TypeScript usage.
3. REST API design.
4. Relational database design.
5. SQL/database constraints.
6. Authentication and password security.
7. Authorization and role-based access control.
8. Input validation.
9. Error handling.
10. Pagination and filtering.
11. Non-trivial business logic.
12. Automated testing.
13. Containerization with Podman.
14. API documentation using OpenAPI/Swagger.
15. Reasonable code organization.
16. Awareness of scalability and tradeoffs.

## 2.2 Secondary goals

Build a project that is small enough to finish quickly but rich enough to expand later.

The project should have a clean progression:

```text
MVP
  -> robust API
  -> tests
  -> documentation
  -> feed ranking
  -> moderation
  -> operational polish
```

## 2.3 What success looks like

A user should be able to:

- register
- log in
- view stocks
- view a stock's community feed
- create a post about a stock
- comment on a post
- vote on a post
- create/manage a watchlist
- publish a structured trading idea
- view a personalized feed
- report content
- access moderation endpoints if authorized

A developer should be able to:

- clone the repository
- install dependencies
- run the application locally
- initialize the SQLite database
- run tests
- inspect the API through Swagger/OpenAPI
- run the application with Podman

---

# 3. Non-Goals

The following are intentionally out of scope for the initial project.

## 3.1 No real trading

MarketPulse must not execute trades.

No brokerage integration is required.

No order placement is required.

No payments are required.

## 3.2 No complex financial infrastructure

Do not build:

- an exchange
- a brokerage
- a real-time market-data terminal
- a portfolio accounting system
- an options pricing engine
- a high-frequency trading system

## 3.3 No heavy frontend

Do not build a complicated SPA.

The frontend should be a thin demonstration client. It may use simple HTML/CSS/JavaScript or a very small frontend framework if needed, but backend work takes priority.

## 3.4 No unnecessary microservices

The initial architecture should be a **modular monolith**.

Do not create separate services for users, stocks, posts, moderation, etc.

We want one understandable backend first.

## 3.5 No premature infrastructure

Do not add Kafka, Kubernetes, Redis clusters, Elasticsearch, RabbitMQ, or cloud infrastructure to the MVP.

Where a future scaling concern exists, document the possible next step instead of prematurely implementing it.

---

# 4. Technical Stack

## 4.1 Runtime

- Node.js
- TypeScript

Use a current LTS Node.js release compatible with the project's dependencies.

## 4.2 HTTP framework

Use **Fastify**.

Reasons:

- strong TypeScript ecosystem
- low overhead
- plugin architecture
- straightforward HTTP API development
- useful schema/validation integrations
- clean request/response lifecycle

Do not add Express merely out of habit.

## 4.3 Database

Use **SQLite** for the project.

SQLite is intentional because:

- it is lightweight
- it is easy to run locally
- it requires no database server for development
- the application can be demonstrated on low-end hardware
- relational modeling is still fully relevant

Use a proper SQLite driver/ORM/query layer.

Preferred direction:

- SQLite driver compatible with Node.js
- **Drizzle ORM** for schema/query organization
- migration files

Do not make the project dependent on the ORM for understanding database behavior. SQL concepts should remain clear.

## 4.4 Validation

Use **Zod** for application-level input validation where appropriate.

Validate all externally controlled inputs.

Examples:

- request body
- path parameters
- query parameters
- enum values
- pagination parameters
- authentication input

## 4.5 Authentication

Use a straightforward token-based authentication approach.

Preferred MVP:

- email + password registration
- hashed passwords using a suitable password-hashing algorithm/library
- login endpoint
- signed token/session mechanism

Never store plaintext passwords.

Never log passwords or authentication secrets.

## 4.6 Testing

Use **Vitest**.

Testing should include:

- unit tests for business logic
- integration tests for API/database behavior
- authorization tests
- validation/error cases

## 4.7 API documentation

Use OpenAPI/Swagger integration with Fastify.

The API documentation should be accessible through a local development route such as:

```text
/docs
```

## 4.8 Containerization

Use **Podman**.

The project should provide a Containerfile/Dockerfile-compatible container definition and a simple way to build/run the application.

Podman should be usable without requiring the user to install Docker.

---

# 5. High-Level Architecture

The application is a **modular monolith**.

Conceptually:

```text
                    ┌────────────────────┐
                    │   Simple Frontend   │
                    │ HTML/CSS/JS client  │
                    └─────────┬──────────┘
                              │ HTTP/JSON
                              ▼
                    ┌────────────────────┐
                    │     Fastify API    │
                    ├────────────────────┤
                    │ Authentication     │
                    │ Users               │
                    │ Stocks              │
                    │ Posts               │
                    │ Comments            │
                    │ Votes               │
                    │ Watchlists          │
                    │ Trading Ideas       │
                    │ Moderation          │
                    │ Feed Ranking        │
                    └─────────┬──────────┘
                              │
                  ┌───────────┴───────────┐
                  │                       │
                  ▼                       ▼
          ┌──────────────┐       ┌──────────────┐
          │ Service      │       │ Validation   │
          │ /Business    │       │ /Schemas     │
          │ Logic        │       └──────────────┘
          └──────┬───────┘
                 │
                 ▼
          ┌──────────────┐
          │ Repository / │
          │ DB Access    │
          └──────┬───────┘
                 │
                 ▼
          ┌──────────────┐
          │   SQLite     │
          └──────────────┘
```

The exact source layout may evolve, but separation of concerns should remain clear.

---

# 6. Recommended Repository Structure

Use a structure approximately like this:

```text
marketpulse/
├── src/
│   ├── app.ts
│   ├── server.ts
│   │
│   ├── config/
│   │   ├── env.ts
│   │   └── config.ts
│   │
│   ├── db/
│   │   ├── client.ts
│   │   ├── schema.ts
│   │   ├── seed.ts
│   │   └── migrations/
│   │
│   ├── plugins/
│   │   ├── auth.ts
│   │   ├── db.ts
│   │   └── swagger.ts
│   │
│   ├── common/
│   │   ├── errors/
│   │   ├── types/
│   │   ├── utils/
│   │   └── pagination/
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.schemas.ts
│   │   │   └── auth.types.ts
│   │   │
│   │   ├── users/
│   │   ├── stocks/
│   │   ├── posts/
│   │   ├── comments/
│   │   ├── votes/
│   │   ├── watchlists/
│   │   ├── ideas/
│   │   ├── feed/
│   │   └── moderation/
│   │
│   └── routes.ts
│
├── tests/
│   ├── unit/
│   └── integration/
│
├── frontend/
│   ├── index.html
│   ├── app.js
│   └── styles.css
│
├── scripts/
│
├── data/
│   └── .gitkeep
│
├── .env.example
├── .gitignore
├── Containerfile
├── compose.yaml
├── drizzle.config.ts
├── package.json
├── package-lock.json
├── tsconfig.json
├── vitest.config.ts
├── README.md
└── AGENTS.md
```

This is a recommendation rather than a rigid law. The codebase should stay simple enough that a new developer can understand the flow.

---

# 7. Domain Model

The initial domain contains these major entities:

```text
User
  │
  ├── Posts
  ├── Comments
  ├── Votes
  ├── Watchlists
  ├── Trading Ideas
  └── Reports

Stock
  │
  ├── Posts
  ├── Trading Ideas
  └── Watchlist Memberships

Post
  │
  ├── Comments
  ├── Votes
  └── Reports

Comment
  ├── Votes (optional in MVP)
  └── Reports

Watchlist
  └── Watchlist Items

Trading Idea
  ├── Stock
  └── Author

Report
  ├── Reporter
  ├── Reported Post/Comment
  └── Moderation status
```

---

# 8. Database Schema

The exact column types depend on the chosen SQLite library/ORM, but the logical schema should include the following.

## 8.1 users

Fields:

- id
- username
- email
- password_hash
- role
- created_at
- updated_at
- is_active

Constraints:

- id is primary key
- username is unique
- email is unique
- role is constrained to known values
- email should be normalized consistently

Roles:

```text
USER
MODERATOR
ADMIN
```

## 8.2 stocks

Fields:

- id
- symbol
- company_name
- exchange
- sector
- description
- created_at

Constraints:

- symbol unique

Example data:

```text
RELIANCE
INFY
TCS
HDFCBANK
SBIN
TATASTEEL
ITC
ICICIBANK
```

The initial stock data can be seeded manually.

Do not depend on live market data for the MVP.

## 8.3 posts

Fields:

- id
- author_id
- stock_id (nullable if general community posts are later allowed)
- title
- body
- status
- created_at
- updated_at

Possible status values:

```text
ACTIVE
HIDDEN
DELETED
```

Rules:

- title must have a reasonable maximum length
- body must have a reasonable maximum length
- hidden/deleted content should not appear in normal feeds

## 8.4 comments

Fields:

- id
- post_id
- author_id
- body
- status
- created_at
- updated_at

Status can mirror posts.

## 8.5 post_votes

Fields:

- user_id
- post_id
- value
- created_at
- updated_at

Value:

```text
1   = upvote
-1  = downvote
```

Composite primary key or unique constraint:

```text
(user_id, post_id)
```

A user may have at most one active vote per post.

Voting again can update or remove the existing vote depending on the chosen API semantics.

## 8.6 watchlists

Fields:

- id
- user_id
- name
- created_at
- updated_at

Examples:

```text
My Stocks
Long Term
Watch Closely
```

## 8.7 watchlist_items

Fields:

- watchlist_id
- stock_id
- created_at

Constraint:

```text
UNIQUE(watchlist_id, stock_id)
```

## 8.8 trading_ideas

Fields:

- id
- author_id
- stock_id
- direction
- entry_price
- target_price
- stop_loss_price
- thesis
- status
- created_at
- updated_at

Direction:

```text
BULLISH
BEARISH
NEUTRAL
```

Possible lifecycle:

```text
OPEN
HIT_TARGET
HIT_STOP
EXPIRED
CANCELLED
```

The application should not claim that an idea is financially correct. Status is simply an application state based on whatever future data source/rules are implemented.

## 8.9 reports

Fields:

- id
- reporter_id
- post_id (nullable)
- comment_id (nullable)
- reason
- description
- status
- reviewed_by
- reviewed_at
- created_at

Report status:

```text
OPEN
REVIEWING
RESOLVED
DISMISSED
```

A report must target either a post or a comment, not neither.

---

# 9. Database Design Principles

The database layer must use proper relational constraints wherever practical.

Examples:

- foreign keys for relationships
- unique constraints for usernames/emails/symbols
- composite uniqueness for votes/watchlist items
- non-null constraints where appropriate
- check constraints when supported and useful
- indexes for frequently queried columns

Likely indexes include:

```text
posts(stock_id, created_at)
posts(author_id, created_at)
comments(post_id, created_at)
post_votes(post_id)
watchlists(user_id)
trading_ideas(stock_id, created_at)
reports(status, created_at)
```

Do not blindly index every column.

The README should explain why important indexes exist.

---

# 10. Authentication

## 10.1 Registration

Endpoint:

```http
POST /api/v1/auth/register
```

Request:

```json
{
  "username": "rahul",
  "email": "rahul@example.com",
  "password": "strong-password"
}
```

Requirements:

- validate input
- normalize email
- enforce username/email uniqueness
- securely hash password
- never return password hash
- return authenticated user information and authentication credential according to the selected auth design

## 10.2 Login

```http
POST /api/v1/auth/login
```

Requirements:

- validate credentials
- return authentication credential
- avoid revealing whether the email or username exists through overly specific errors

## 10.3 Authenticated requests

Protected endpoints must authenticate the requesting user.

The authenticated user should be available to request handlers through a typed request context.

---

# 11. Authorization

Authorization must be explicit.

## USER

Can:

- manage own profile where supported
- create own posts
- edit/delete own posts subject to rules
- comment
- vote
- manage own watchlists
- create/manage own trading ideas
- report content

## MODERATOR

Can additionally:

- review reports
- hide violating posts/comments
- resolve reports
- inspect moderation metadata

## ADMIN

Can additionally:

- manage users
- manage roles
- perform moderator-level actions
- seed/manage stock metadata where exposed through admin routes

Never rely on the frontend to enforce authorization.

The backend is the source of truth.

---

# 12. REST API

All endpoints should use a versioned API prefix:

```text
/api/v1
```

Use JSON consistently.

Responses should have predictable shapes.

---

## 12.1 Health

```http
GET /health
```

Response:

```json
{
  "status": "ok"
}
```

Optionally provide a more detailed readiness route:

```http
GET /health/ready
```

which can verify database availability.

---

# 13. Auth Endpoints

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/me
```

`/me` should return the authenticated user without secrets.

---

# 14. User Endpoints

Potential endpoints:

```text
GET   /api/v1/users/:username
PATCH /api/v1/users/me
```

Do not expose sensitive information.

A public user response might include:

```json
{
  "id": "...",
  "username": "rahul",
  "createdAt": "..."
}
```

---

# 15. Stock Endpoints

```text
GET /api/v1/stocks
GET /api/v1/stocks/:symbol
GET /api/v1/stocks/:symbol/posts
GET /api/v1/stocks/:symbol/ideas
```

Supported filters may include:

```text
?search=infy
?sector=technology
?page=1&pageSize=20
```

Search should be implemented carefully and documented.

The initial dataset can be static/seeded.

---

# 16. Post Endpoints

```text
POST   /api/v1/posts
GET    /api/v1/posts/:id
PATCH  /api/v1/posts/:id
DELETE /api/v1/posts/:id
GET    /api/v1/posts
```

Create example:

```json
{
  "stockSymbol": "TATASTEEL",
  "title": "Possible breakout above resistance",
  "body": "Discussion about the recent price action..."
}
```

Rules:

- only authenticated users can create posts
- users can edit their own posts
- moderators/admins can moderate content
- deleted/hidden posts should not appear in ordinary listings
- ownership checks must happen server-side

---

# 17. Comment Endpoints

```text
POST   /api/v1/posts/:postId/comments
GET    /api/v1/posts/:postId/comments
PATCH  /api/v1/comments/:id
DELETE /api/v1/comments/:id
```

Rules:

- only authenticated users can comment
- a hidden/deleted post should not accept normal comments
- users may edit/delete their own comments
- moderators may moderate comments

---

# 18. Voting

Endpoint:

```text
PUT    /api/v1/posts/:id/vote
DELETE /api/v1/posts/:id/vote
```

Request:

```json
{
  "value": 1
}
```

`value` must be either `1` or `-1`.

The API must guarantee one active vote per user per post.

Possible response:

```json
{
  "postId": "123",
  "userVote": 1,
  "upvotes": 42,
  "downvotes": 7,
  "score": 35
}
```

Score:

```text
score = upvotes - downvotes
```

Do not allow duplicate vote records.

---

# 19. Watchlists

## Create watchlist

```http
POST /api/v1/watchlists
```

Request:

```json
{
  "name": "My Stocks"
}
```

## List watchlists

```http
GET /api/v1/watchlists
```

## Get one watchlist

```http
GET /api/v1/watchlists/:id
```

## Rename

```http
PATCH /api/v1/watchlists/:id
```

## Delete

```http
DELETE /api/v1/watchlists/:id
```

## Add stock

```http
POST /api/v1/watchlists/:id/stocks
```

```json
{
  "symbol": "INFY"
}
```

## Remove stock

```http
DELETE /api/v1/watchlists/:id/stocks/:symbol
```

Only the watchlist owner can mutate a watchlist.

---

# 20. Trading Ideas

A trading idea is a structured post-like object with explicit fields.

Endpoint:

```text
POST   /api/v1/ideas
GET    /api/v1/ideas
GET    /api/v1/ideas/:id
PATCH  /api/v1/ideas/:id
DELETE /api/v1/ideas/:id
```

Example:

```json
{
  "stockSymbol": "INFY",
  "direction": "BULLISH",
  "entryPrice": 1450,
  "targetPrice": 1550,
  "stopLossPrice": 1400,
  "thesis": "Discussion of the user's reasoning."
}
```

Validation examples:

- prices must be positive
- direction must be a known enum
- thesis cannot be empty
- target/stop values should be validated according to direction if such business rules are implemented

Do not assume that the idea is correct.

The backend stores and exposes user-submitted ideas as application data.

---

# 21. Feed

The feed is one of the most important backend features because it introduces actual business logic beyond CRUD.

Endpoint:

```http
GET /api/v1/feed
```

Possible query parameters:

```text
?page=1
&pageSize=20
&stock=INFY
```

The MVP can begin with chronological ordering.

Then implement a ranking score.

---

# 22. Post Ranking Algorithm

The project should eventually support a deterministic feed score.

Example conceptual formula:

```text
score =
    (upvotes * 2)
  + (comments * 1.5)
  + recencyBonus
  - (downvotes * 1)
```

A more realistic implementation can use a time-decay function.

For example:

```text
ageHours = hoursSince(createdAt)
recencyBonus = 20 / (ageHours + 2)
```

This is only an example. The actual formula should be chosen deliberately and documented.

Requirements:

- ranking must be deterministic
- hidden/deleted posts must be excluded
- pagination must still work
- query should remain understandable
- performance considerations should be documented

The README should explain:

1. why chronological ordering is useful initially
2. why ranking was added
3. how the score works
4. what the limitations are
5. how ranking might evolve at larger scale

---

# 23. Moderation

Moderation is a major domain feature.

## Report content

```http
POST /api/v1/reports
```

Example:

```json
{
  "postId": "123",
  "reason": "SPAM",
  "description": "Repeated promotional content."
}
```

Supported reasons could include:

```text
SPAM
HARASSMENT
MISINFORMATION
PROMOTION
OFF_TOPIC
OTHER
```

These are moderation categories for application handling, not authoritative judgments about financial truth.

## Moderator queue

```text
GET /api/v1/moderation/reports
```

Moderator/admin only.

## Review a report

```text
PATCH /api/v1/moderation/reports/:id
```

Example:

```json
{
  "status": "RESOLVED"
}
```

## Hide a post

```text
POST /api/v1/moderation/posts/:id/hide
```

## Restore a post

```text
POST /api/v1/moderation/posts/:id/restore
```

Equivalent comment endpoints may be added.

---

# 24. Error Handling

Create a consistent error response.

Example:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": [
      {
        "field": "email",
        "message": "Invalid email address"
      }
    ]
  }
}
```

Suggested error codes:

```text
VALIDATION_ERROR
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
CONFLICT
RATE_LIMITED
INTERNAL_ERROR
```

HTTP status codes should match semantics:

```text
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity   (if chosen consistently)
429 Too Many Requests
500 Internal Server Error
```

Do not leak stack traces or internal SQL errors to clients in production mode.

Server logs may contain useful diagnostics, but must not include secrets.

---

# 25. Validation Rules

Every user-controlled endpoint must validate input.

Examples:

## Username

- minimum length
- maximum length
- allowed characters
- normalized comparison rules

## Email

- valid format
- normalized case

## Password

- minimum length
- no arbitrary maximum that is too low
- never stored directly

## Post title

- non-empty
- maximum length

## Post body

- non-empty
- maximum length

## Stock symbol

- normalized to a consistent format
- must correspond to an existing stock

## Pagination

Accept something like:

```text
page >= 1
1 <= pageSize <= 100
```

Do not allow unbounded page sizes.

---

# 26. Pagination

List endpoints should support pagination.

Basic MVP format:

```text
?page=1&pageSize=20
```

Response example:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 124,
    "totalPages": 7
  }
}
```

If a cursor-based approach is later implemented, document why it is preferable for some feeds.

Do not implement cursor pagination everywhere just to appear sophisticated.

---

# 27. Security Requirements

Minimum expectations:

- passwords must be securely hashed
- secrets must come from environment variables
- authentication secrets must not be committed
- SQL queries must use parameterization/ORM-safe APIs
- authorization must be enforced server-side
- request bodies must be validated
- sensitive fields must not be serialized accidentally
- error messages must not expose internals
- reasonable rate limiting should be added to authentication endpoints
- CORS should be configured deliberately if the frontend is served separately

## Environment variables

Provide:

```text
PORT
HOST
DATABASE_URL or SQLITE_DATABASE_PATH
AUTH_SECRET
NODE_ENV
```

Use `.env.example` with placeholders.

Never commit `.env`.

---

# 28. Rate Limiting

At minimum, authentication routes should be protected from trivial abuse.

Potentially rate-limit:

```text
POST /auth/register
POST /auth/login
POST /posts
POST /comments
POST /reports
```

The MVP can use an in-memory solution suitable for a single-process local deployment.

The README must explicitly state that distributed deployments would require a shared rate-limit store or gateway-level enforcement.

---

# 29. Logging

Use structured logs where practical.

At minimum log:

- startup
- shutdown
- request failures
- unexpected errors
- important moderation actions where appropriate

Do not log:

- passwords
- auth tokens
- secret environment values
- unnecessary personal data

A production-grade logging library is fine, but do not over-engineer logging for the MVP.

---

# 30. Testing Strategy

Testing is required, not optional.

## 30.1 Unit tests

Test business logic such as:

- post ranking score
- validation helpers
- authorization decisions
- trading-idea validation rules
- pagination calculation

## 30.2 Integration tests

Test the HTTP + database path.

Examples:

### Registration

```text
POST /auth/register
-> 201
-> user exists in DB
```

### Duplicate registration

```text
POST /auth/register
-> 409
```

### Login

```text
POST /auth/login
-> 200
-> credential returned
```

### Protected endpoint

```text
POST /posts without auth
-> 401
```

### Post creation

```text
authenticated POST /posts
-> 201
-> post exists
```

### Voting

```text
user votes
-> one vote exists

same user votes again
-> existing vote changes rather than duplicate row
```

### Authorization

```text
User A cannot edit User B's post
-> 403
```

### Moderation

```text
USER cannot hide a post
-> 403

MODERATOR can hide a post
-> 200
```

### Pagination

Verify page boundaries and page size limits.

---

# 31. Test Database Strategy

Do not run destructive tests against the developer's normal database.

Use a separate test database, ideally an isolated temporary SQLite database.

The test setup should:

1. create/reset schema
2. seed required fixtures
3. execute tests
4. clean up

Tests should be repeatable.

---

# 32. API Documentation

Swagger/OpenAPI should expose all public API routes.

Documentation should include:

- request body schemas
- query parameters
- path parameters
- authentication requirements
- response shapes
- common error responses

The documentation should be usable by someone who has never seen the source code.

---

# 33. Frontend Scope

The frontend is intentionally minimal.

Its job is to demonstrate the backend.

## Required pages/views

### Login/Register

Simple forms.

### Home feed

Display:

- post title
- stock symbol
- author
- score
- comment count
- timestamp

### Stock page

Display:

- stock information
- recent posts
- recent trading ideas

### Post page

Display:

- title
- body
- author
- voting controls
- comments
- comment form

### Watchlist

Display:

- watchlists
- contained stocks

### Trading ideas

Display:

- stock
- direction
- entry
- target
- stop loss
- thesis
- status

### Moderation (optional frontend)

A very basic moderator-only report view is sufficient.

Do not spend significant development time on:

- animations
- elaborate visual design
- complex component systems
- responsive perfection
- design systems

A clean, functional interface is enough.

---

# 34. Frontend Technology Rule

The frontend must remain lightweight.

Possible choices:

### Simplest

```text
HTML
CSS
Vanilla JavaScript
```

### Slightly richer

A minimal React/Vite client is acceptable if it can be built quickly and kept separate from backend concerns.

However, the backend should remain the dominant part of the repository and the portfolio explanation.

---

# 35. Containerization with Podman

Provide a `Containerfile`.

The container should:

- install production dependencies
- build TypeScript
- run the production server
- avoid running as root inside the container if practical

Example conceptual flow:

```text
podman build -t marketpulse .
podman run --rm -p 3000:3000 marketpulse
```

SQLite persistence must be handled intentionally.

For local development, mount a host data directory or use a volume.

Do not accidentally store the database only inside an ephemeral container layer.

---

# 36. Podman Development Environment

A `compose.yaml` may be provided if it makes local development easier.

Do not create a fake multi-service architecture.

The initial application can be one service:

```text
marketpulse-api
```

with SQLite backed by a volume.

If a future Redis service is documented, keep it optional and outside the MVP.

---

# 37. Database Migrations

Database schema changes must use migrations.

Do not rely on manually modifying the database file.

Provide commands such as:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

The exact scripts can vary based on the selected Drizzle workflow.

---

# 38. Seed Data

Provide a development seed script.

Seed:

### Users

At least:

```text
admin
moderator
user1
user2
```

Do not put real user credentials/secrets in the repository.

Use clearly documented development-only credentials or a safe seed mechanism.

### Stocks

Seed a meaningful set of Indian listed companies, for example:

```text
RELIANCE
TCS
INFY
HDFCBANK
ICICIBANK
SBIN
ITC
TATASTEEL
BHARTIARTL
HINDUNILVR
```

The seed dataset is application fixture data, not live financial data.

### Posts

Create several realistic discussion posts.

### Comments

Create realistic comments.

### Votes

Seed enough votes to demonstrate feed ranking.

### Trading ideas

Seed a handful of sample ideas.

All sample financial content must be clearly understood as fictional/demo data.

---

# 39. API Response Conventions

Keep response shapes consistent.

For single resources:

```json
{
  "data": {
    "id": "123"
  }
}
```

For collections:

```json
{
  "data": [],
  "pagination": {}
}
```

Alternatively, if a simpler convention is chosen, apply it consistently throughout the API.

Consistency matters more than a particular envelope convention.

---

# 40. HTTP Semantics

Use appropriate status codes.

Examples:

```text
201 Created      successful resource creation
200 OK           normal retrieval/update
204 No Content   successful deletion when appropriate
400 Bad Request  malformed request
401 Unauthorized missing/invalid authentication
403 Forbidden    authenticated but not permitted
404 Not Found    resource does not exist
409 Conflict     uniqueness/state conflict
422             validation failure if chosen
429             rate limit exceeded
500             unexpected server error
```

Avoid returning `200` for every possible outcome.

---

# 41. API Versioning

Use:

```text
/api/v1
```

from the beginning.

This allows a future `v2` without rewriting the routing model.

Do not build multiple API versions during the MVP.

---

# 42. Caching Considerations

Do not add Redis to the MVP.

However, identify cacheable reads in the README, such as:

- stock metadata
- popular feed results
- public profile data

Explain that a future deployment could use Redis or an HTTP caching layer.

The exercise is to demonstrate awareness of the tradeoff, not to deploy every technology imaginable.

---

# 43. Concurrency and Transactions

The implementation should use database transactions where multiple writes must behave atomically.

Important examples:

- voting updates
- moderation state changes + audit metadata
- watchlist creation + item insertion if implemented together

Be careful about race conditions around:

- duplicate votes
- duplicate watchlist items
- unique usernames/emails

Database constraints must backstop application logic.

Never rely exclusively on:

```text
if (!exists) insert
```

for concurrency-sensitive uniqueness.

---

# 44. Moderation Audit Trail

For a stronger version of the project, add:

```text
moderation_actions
```

Fields could include:

- id
- moderator_id
- action_type
- target_type
- target_id
- reason
- created_at

This provides an audit trail.

This is optional for the first MVP but highly desirable for the portfolio version.

---

# 45. Future Scalability Discussion

The final README should include a section titled something like:

```text
Scaling the system
```

Discuss hypothetical evolution:

```text
SQLite
  -> PostgreSQL

in-memory rate limiting
  -> Redis / gateway-level limiting

local feed calculation
  -> precomputed ranking / queue workers

single process
  -> horizontally scaled API servers

simple stock fixtures
  -> dedicated market-data ingestion service
```

Do not actually implement all of this.

The purpose is to demonstrate architectural awareness.

---

# 46. Market Data Strategy

The MVP must use seeded/static stock metadata.

Do not require a paid market-data provider to run the repository.

Optional future integration:

```text
Market data provider
        |
        v
 ingestion process
        |
        v
 normalized market data
        |
        v
 application/API
```

If a mock market-data provider is created, isolate it behind an interface.

For example:

```ts
interface MarketDataProvider {
  getQuote(symbol: string): Promise<Quote | null>;
}
```

Then a fake implementation can be used in development/testing.

This demonstrates dependency inversion without requiring a real financial API.

---

# 47. Architecture Principles

The project should follow these principles.

## Keep route handlers thin

Routes should primarily:

- parse/validate input
- call application/service logic
- map the result to an HTTP response

They should not contain hundreds of lines of business logic.

## Keep business rules in services/domain logic

Examples:

- can a user edit this post?
- can a user vote?
- how is a feed item ranked?
- is this trading idea internally valid?

## Keep database access organized

Avoid spreading raw SQL or ORM calls randomly across route handlers.

## Prefer explicit code

Readable code wins over overly clever abstractions.

## Avoid useless abstractions

Do not introduce an interface for every single class merely to look enterprise-grade.

---

# 48. TypeScript Requirements

Enable strict TypeScript.

Recommended expectations:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true
  }
}
```

The exact set can be adjusted when dependency compatibility requires it.

Avoid:

```ts
any
```

unless there is a clearly justified boundary.

Use:

- discriminated unions
- typed request/response models
- inferred database types where appropriate
- explicit domain types for important concepts

Do not duplicate types unnecessarily if they can be derived safely.

---

# 49. Code Quality

Use a linter and formatter.

Expected scripts:

```text
npm run dev
npm run build
npm run start
npm run lint
npm run format
npm run test
npm run test:watch
npm run db:generate
npm run db:migrate
npm run db:seed
```

The exact scripts may vary, but basic development operations should be one command away.

CI should eventually run:

```text
install
lint
build
test
```

---

# 50. Git Workflow

Commit meaningful milestones rather than one giant final commit.

Example sequence:

```text
chore: initialize TypeScript Node project
feat: add database schema and migrations
feat: implement authentication
feat: add stock endpoints
feat: add posts and comments
feat: add voting
feat: add watchlists
feat: add trading ideas
feat: add feed ranking
feat: add moderation
feat: add API documentation
feat: add Podman container
chore: add integration tests
```

Do not fabricate commits for functionality that does not exist.

---

# 51. README Requirements

The README is part of the portfolio project.

It should include:

## Project description

What MarketPulse is and why it exists.

## Features

List important capabilities.

## Architecture

Include a simple architecture diagram.

## Tech stack

Explain why each major technology was selected.

## Local setup

Give exact commands.

## Environment variables

Document `.env.example`.

## Database

Explain SQLite, migrations, and seed data.

## API

Explain Swagger/OpenAPI location.

## Testing

Explain test strategy.

## Podman

Explain build/run commands.

## Security

Describe password hashing, auth, authorization, validation, and rate limiting.

## Feed ranking

Explain the scoring algorithm.

## Design tradeoffs

Explain what was intentionally left out.

## Future improvements

Discuss PostgreSQL, Redis, background jobs, real market data, and horizontal scaling.

## Disclaimer

State that the application contains user-generated/demo financial content and is not financial advice.

---

# 52. Example Local Developer Workflow

A developer should be able to do:

```bash
# clone
 git clone <repo>
 cd marketpulse

# install
npm install

# create environment
cp .env.example .env

# database
npm run db:migrate
npm run db:seed

# development server
npm run dev
```

Then open:

```text
http://localhost:3000
```

and:

```text
http://localhost:3000/docs
```

---

# 53. Example Podman Workflow

Build:

```bash
podman build -t marketpulse .
```

Run:

```bash
podman run --rm \
  -p 3000:3000 \
  -v "$(pwd)/data:/app/data" \
  marketpulse
```

The exact paths can be adjusted based on the final container image.

The important requirement is persistent SQLite storage.

---

# 54. Development Milestones

Build the project incrementally.

## Milestone 1 — Foundation

Deliver:

- package.json
- TypeScript configuration
- Fastify server
- `/health`
- ESLint
- Prettier
- environment handling
- basic error handling
- basic Git setup

## Milestone 2 — Database

Deliver:

- SQLite connection
- Drizzle schema
- migrations
- seed data
- database integration tests

## Milestone 3 — Authentication

Deliver:

- registration
- login
- authenticated request context
- password hashing
- authorization foundation

## Milestone 4 — Stocks

Deliver:

- stock listing
- stock details
- stock search/filter
- stock feed endpoints

## Milestone 5 — Social Layer

Deliver:

- posts
- comments
- ownership checks
- deletion/editing

## Milestone 6 — Voting

Deliver:

- upvote
- downvote
- remove vote
- unique vote constraint
- vote counts

## Milestone 7 — Watchlists

Deliver:

- watchlist CRUD
- stock membership management
- ownership checks

## Milestone 8 — Trading Ideas

Deliver:

- create/read/update/delete
- direction validation
- lifecycle state

## Milestone 9 — Feed

Deliver:

- chronological feed
- pagination
- ranked feed
- ranking tests

## Milestone 10 — Moderation

Deliver:

- reporting
- moderator queue
- hide/restore
- role-based authorization
- moderation audit log if time allows

## Milestone 11 — Quality

Deliver:

- integration tests
- Swagger/OpenAPI
- structured errors
- lint/format/build
- security review

## Milestone 12 — Podman

Deliver:

- Containerfile
- persistent SQLite volume
- documented build/run commands

## Milestone 13 — Minimal Frontend

Deliver:

- login/register
- feed
- stock page
- post page
- watchlist
- ideas

The backend remains the primary deliverable.

---

# 55. Definition of Done

The MVP is complete when all of the following are true:

- [ ] project builds with TypeScript
- [ ] lint passes
- [ ] tests pass
- [ ] server starts with documented commands
- [ ] SQLite migrations work from a clean database
- [ ] seed command works
- [ ] registration works
- [ ] login works
- [ ] `/auth/me` works
- [ ] protected routes reject unauthenticated requests
- [ ] users cannot modify resources owned by other users
- [ ] stocks can be listed/viewed
- [ ] posts can be created/read/edited/deleted according to permissions
- [ ] comments work
- [ ] voting works without duplicate votes
- [ ] watchlists work
- [ ] trading ideas work
- [ ] feed supports pagination
- [ ] feed ranking works and is tested
- [ ] reporting works
- [ ] moderators can review/hide content
- [ ] error responses are consistent
- [ ] API documentation is available
- [ ] Podman image builds
- [ ] Podman container starts
- [ ] SQLite data persists through container restarts when using the documented volume
- [ ] README is complete
- [ ] frontend demonstrates the core backend flows

---

# 56. Portfolio/Interview Talking Points

The implementation should make it possible to discuss questions like:

## Why SQLite?

Because the MVP is lightweight, self-contained, and designed for local development. The schema and SQL access patterns remain transferable to PostgreSQL.

## Why a modular monolith?

Because the domain is not large enough to justify distributed services yet. A modular monolith keeps deployment and debugging simple while maintaining boundaries that could later be extracted.

## Why Fastify?

Because it provides a strong Node.js HTTP foundation with good TypeScript support and a plugin-oriented architecture.

## Why validation at the API boundary?

Because external input is untrusted and domain logic should receive typed/validated data.

## Why database constraints if we already check in application code?

Because application checks alone are vulnerable to race conditions. The database should enforce invariants such as uniqueness.

## How would you scale it?

Discuss:

- PostgreSQL
- caching
- horizontal API instances
- centralized rate limiting
- background workers
- feed precomputation
- market-data ingestion

## What is the hardest part?

The likely interesting areas are:

- feed ranking
- authorization
- concurrent voting
- moderation state transitions
- data consistency

---

# 57. What Not to Let an AI Coding Agent Do

The coding agent must not:

- rewrite the entire application without approval
- add unnecessary dependencies
- introduce microservices without a clear reason
- add Redis just because it is commonly used
- add Docker Compose infrastructure that is not needed
- replace SQLite with PostgreSQL without discussion
- create fake abstractions everywhere
- use `any` as an escape hatch
- disable TypeScript strictness to make compilation pass
- silently swallow errors
- commit secrets
- fabricate test results
- claim functionality is complete without running it
- delete working code merely to simplify the agent's task

Before making major architectural changes, the agent should explain the change and its tradeoff.

---

# 58. AI Coding Agent Working Style

The coding agent should work incrementally.

For each feature:

1. inspect the existing code
2. explain the intended implementation briefly
3. make a small coherent change
4. run relevant tests/lint/build
5. inspect failures
6. fix failures
7. summarize changed files
8. identify any remaining risks

The agent should not make huge speculative changes.

The agent should prefer existing project conventions over inventing new ones.

When a requirement is ambiguous, choose the simplest defensible implementation and document the assumption.

---

# 59. Suggested AGENTS.md Rules

Create an `AGENTS.md` in the repository root with rules along these lines:

```md
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
```

---

# 60. Future Features

Potential future features, intentionally outside the MVP:

- real-time stock quotes
- price snapshots
- alerts
- notification system
- direct messages
- following users
- topic/community subscriptions
- advanced search
- full-text search
- trending stocks
- richer feed personalization
- image attachments
- post bookmarking
- content recommendation
- background jobs
- WebSocket updates
- PostgreSQL deployment
- Redis caching
- external market data providers
- CI/CD deployment
- cloud deployment
- observability with metrics/tracing

Add features only after the core backend is solid.

---

# 61. Final Product Philosophy

MarketPulse should be:

```text
small enough to understand
        +
real enough to discuss
        +
complex enough to demonstrate engineering
        =
strong portfolio project
```

The most important outcome is not the number of features.

The most important outcome is that the repository demonstrates that its author understands how a backend system is designed, implemented, validated, tested, secured, and operated.

The implementation should favor **boring, correct engineering** over flashy complexity.

---

# 62. Final Build Order

Use this order unless a concrete technical reason requires deviation:

```text
1. Repository + Git
2. Node + TypeScript
3. Fastify server
4. Config/env handling
5. SQLite + Drizzle
6. Migrations + seeds
7. Error handling
8. Authentication
9. Users/roles
10. Stocks
11. Posts
12. Comments
13. Votes
14. Watchlists
15. Trading ideas
16. Pagination
17. Feed
18. Feed ranking
19. Reports
20. Moderation
21. Tests
22. OpenAPI/Swagger
23. Rate limiting/security hardening
24. Podman
25. Simple frontend
26. README
27. Final review
```

Do not jump directly to the frontend.

Do not build every feature simultaneously.

Do not optimize prematurely.

Build a reliable backend first.
