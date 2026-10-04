# Couch Time Backend: Learning Plan

This folder holds the plan for building the Couch Time backend from scratch: what to build, how to build it, and in what order. It is written for **you to learn backend development** by building something real over **about 18 working weeks** (≈4.5 months with a holiday break), in three phases:

| Phase | Weeks | You end up with |
|---|---|---|
| 1. Core platform | 1–9 | A deployed streaming backend: accounts, catalogue, uploads → HLS, progress, bookmarks, search, trending |
| 2. Product depth | 10–14 | Profiles and kids mode, ratings and lists, series and episodes, live notifications, watch parties, Stripe subscriptions |
| 3. AI | 15–18 | Semantic search, AI recommendations with reasons and A/B tests, the Couch Concierge chat assistant, auto subtitles and metadata |

Every phase ends with something complete, so you can stop after any of them.

## How the folder is organised

| File | What it is | When to read it |
|---|---|---|
| [PRD.md](./PRD.md) | **Product Requirements Document.** Lists every feature the backend must support (~110 requirements), the data model, the full API contract, quality targets and the week-by-week plan. | First, end to end. Come back to it at the start of each week. |
| [adr/](./adr/) | **Architecture Decision Records.** One short document per big technical choice: what was decided, why, what else was considered and what it costs. | Read the ADR for a topic just before you start building that part. |
| [adr/0000-template.md](./adr/0000-template.md) | The template for writing your own ADRs. | When you make a decision that isn't covered yet. |
| [STEPS.md](./STEPS.md) | **Step-by-step checklist**: what to do, in order, week by week (starting with a week 0 for setup and SQL basics), linking to the PRD and ADRs. | Every working session. This is your to-do list. |
| [EXTERNAL-NEEDS.md](./EXTERNAL-NEEDS.md) | **Checklist of everything external**: accounts, software, data sources, secrets, attribution and estimated costs. | Before week 1, and before weeks 9, 14 and 15. |

## The ADRs

| # | Decision | Phase |
|---|---|---|
| [0001](./adr/0001-record-architecture-decisions.md) | Record architecture decisions | Week 1 |
| [0002](./adr/0002-nodejs-typescript-runtime.md) | Node.js and TypeScript | Week 1 |
| [0003](./adr/0003-express-layered-architecture.md) | Express with a layered architecture | Week 1 |
| [0004](./adr/0004-postgresql-database.md) | PostgreSQL as the main database | Week 2 |
| [0005](./adr/0005-prisma-orm-and-migrations.md) | Prisma for database access and migrations | Week 2 |
| [0006](./adr/0006-configuration-and-secrets.md) | Validated configuration and secrets | Week 1 |
| [0007](./adr/0007-validation-and-error-format.md) | Zod validation and a single error format | Week 2 |
| [0008](./adr/0008-authentication-jwt-cookies.md) | Your own JWTs in httpOnly cookies, with refresh tokens | Week 3 |
| [0009](./adr/0009-social-and-wallet-login.md) | Google (Firebase) and wallet sign-in | Week 4 |
| [0010](./adr/0010-authorization-roles.md) | Role-based authorization | Week 4 |
| [0011](./adr/0011-rest-api-conventions.md) | REST API conventions, pagination and OpenAPI | Week 2 |
| [0012](./adr/0012-object-storage-for-media.md) | S3-compatible object storage for media | Week 6 |
| [0013](./adr/0013-transcoding-pipeline-job-queue.md) | Transcoding with ffmpeg workers on a job queue | Weeks 6–7 |
| [0014](./adr/0014-redis-caching-and-rate-limiting.md) | Redis for caching, rate limiting and queues | Week 5 |
| [0015](./adr/0015-watch-progress-and-events.md) | Watch progress and view events | Week 5 |
| [0016](./adr/0016-trending-and-recommendations.md) | Trending and recommendations | Week 8 |
| [0017](./adr/0017-search-postgres-full-text.md) | Search with PostgreSQL full-text search | Week 5 |
| [0018](./adr/0018-testing-strategy.md) | Testing strategy | Every week |
| [0019](./adr/0019-observability.md) | Logging, health checks and metrics | Week 8 |
| [0020](./adr/0020-local-dev-ci-deployment.md) | Docker Compose, CI and deployment | Weeks 1 and 9 |
| **Phase 2: Product depth** | | |
| [0021](./adr/0021-profiles-and-parental-controls.md) | Profiles own personal data; kids mode and PIN | Week 10 |
| [0022](./adr/0022-series-and-episodes-model.md) | `titles` / seasons / episodes model | Week 11 |
| [0023](./adr/0023-realtime-websockets-watch-party.md) | WebSockets for watch parties, SSE for one-way streams | Weeks 12, 13 and 17 |
| [0024](./adr/0024-notifications-outbox.md) | Notifications through a transactional outbox | Week 12 |
| [0025](./adr/0025-payments-stripe.md) | Stripe subscriptions; webhooks drive entitlements | Week 14 |
| **Phase 3: AI** | | |
| [0026](./adr/0026-embeddings-and-pgvector.md) | Embeddings in pgvector, behind a pluggable provider | Week 15 |
| [0027](./adr/0027-ai-recommendations-hybrid.md) | Two-stage hybrid recommender with LLM-written reasons | Week 16 |
| [0028](./adr/0028-hybrid-semantic-search.md) | Hybrid keyword + vector search; LLM query parsing | Week 15 |
| [0029](./adr/0029-llm-integration-claude.md) | Claude integration and the Couch Concierge assistant | Weeks 15–18 |
| [0030](./adr/0030-ai-media-enrichment-pipeline.md) | AI enrichment: subtitles, translation, tags, review queue | Week 18 |
| [0031](./adr/0031-experiments-and-feature-flags.md) | Feature flags, A/B experiments, analytics, audit log | Weeks 11 and 16 |
| **Data sources** | | |
| [0032](./adr/0032-catalogue-data-and-video-sources.md) | Info from TMDB; ~6 self-hosted, legally usable films stream; MovieLens ratings | Weeks 2, 6–7, 16 |

## How to use this plan

1. **One week at a time.** Each week in the PRD has goals, tasks, things to learn and a "done when" checklist. Don't move on until the checklist passes.
2. **Read the ADR first, then build.** Each ADR explains *why*. If you disagree once you know more, that's good: write a new ADR that **supersedes** the old one. That's how real teams work.
3. **Keep the frontend working.** The Next.js app in this repo is your client. Each feature in the PRD names the screen that uses it, so you can see your backend working.
4. **Commit small, write tests as you go.** See [ADR 0018](./adr/0018-testing-strategy.md).
5. **Stuck for more than an hour?** Write down what you tried, cut the problem down to the smallest example, then ask.

## Status

| Field | Value |
|---|---|
| Created | 4 October 2026 |
| Updated | 4 October 2026: v1.1 adds Phases 2 and 3 (ADRs 0021–0031); v1.2 adds data and video sources (ADR 0032, PRD §15) |
| Planned duration | 18 working weeks (5 October 2026 to 21 February 2027, with a 2-week holiday break), at 10–15 hours per week |
| Starting point | `server.js`: Express in plain JavaScript, data kept in memory, one hardcoded video, unverified JWT decoding |
