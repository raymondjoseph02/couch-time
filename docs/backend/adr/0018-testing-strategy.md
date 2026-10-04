# ADR 0018: Testing pyramid with Vitest, Supertest and Testcontainers (a real Postgres and Redis in tests)

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-10-04 |
| Phase | Every week, starting in week 1 |
| Related | [ADR 0003](./0003-express-layered-architecture.md), [ADR 0020](./0020-local-dev-ci-deployment.md) |

## Context

`server.js` has no tests, and the prototype bugs we hit (field name mismatches, out-of-order progress, a hanging route) are exactly what tests catch. Auth and authorization rules especially **must** be tested, because their failures are silent and serious. Tests must also run in CI on every push.

Mocking the database is tempting but hides real bugs: SQL errors, constraint violations, transaction behaviour, `ON CONFLICT` logic.

## Decision

**Tools:** **Vitest** (fast, TS-native, Jest-compatible API), **Supertest** for HTTP, **Testcontainers** for throwaway Postgres and Redis, and **k6** for load tests (week 8).

**Pyramid**

| Level | What | Database | Share | Example |
|---|---|---|---|---|
| Unit | Pure functions and services with fakes | none | ~50% | `formatDuration`, trending score maths, cursor encode/decode, SIWE message builder |
| Integration | HTTP → real middleware → real DB | Testcontainers Postgres + Redis | ~45% | "PUT progress twice with older clientTime keeps the newer position" |
| End-to-end | Frontend + backend together | docker compose | ~5% | Sign up → bookmark → appears on the bookmarks page (Playwright, P1) |

**Rules**
- Each integration test file gets a clean schema: run migrations once per worker, then `TRUNCATE … CASCADE` between tests (fast), or wrap each test in a transaction rolled back at the end.
- **Factories** (`test/factories.ts`: `makeUser()`, `makeVideo({ published: true })`), not shared fixture files.
- An auth helper: `loginAs(user)` returns an agent with cookies.
- **Every endpoint** has a happy path plus its auth rules (401/403) tested. **Every bug** fixed gets a regression test first.
- External services are faked at the boundary: Firebase `verifyIdToken`, email sending (use Mailpit locally, a fake in tests), S3 (use the MinIO Testcontainer for media tests, a fake for others).
- ffmpeg tests use a 3-second sample video committed in `test/fixtures/`.
- Coverage: services 80%+ lines; CI fails below the threshold.
- Tests must be **deterministic**: no real time or randomness. Inject a clock (`now()`), seed randomness.

## Alternatives considered

| Option | Pros | Cons | Why not chosen |
|---|---|---|---|
| Jest | Very common. | Slower; ESM/TS config friction. | Vitest has the same API with less setup. |
| Mock Prisma everywhere | Fast; no Docker. | Misses SQL/constraint bugs; tests check mocks, not behaviour. | Real DB integration tests catch real bugs. |
| SQLite in tests | Fast. | Different SQL dialect than production (no `tsvector`, `citext`…). | Test what you run. |
| Only E2E tests | Realistic. | Slow, flaky, hard to debug. | The pyramid balances speed and confidence. |

## Consequences

**Good:** confidence to refactor; auth rules locked in; CI catches regressions; tests document behaviour.

**Bad / costs:** Docker is needed to run integration tests; the first Testcontainers start takes ~5 seconds; writing tests takes ~30–40% of your time (normal and worth it).

## What you'll learn

- What to test at which level, and why.
- Test isolation and deterministic tests.
- TDD on bug fixes (red → green → refactor).
- Load testing basics: virtual users, p95, finding the bottleneck.

## Done when

- [ ] `npm test` runs unit + integration in under 60 seconds locally.
- [ ] CI runs the same tests on every push ([ADR 0020](./0020-local-dev-ci-deployment.md)).
- [ ] Each ADR's "Done when" items that can be automated are automated.
- [ ] A k6 report for catalogue + progress endpoints is saved in `docs/backend/load-tests/`.

## References

- https://vitest.dev
- https://node.testcontainers.org
- https://github.com/ladjs/supertest
- https://grafana.com/docs/k6/latest/
- Martin Fowler, *The Practical Test Pyramid*: https://martinfowler.com/articles/practical-test-pyramid.html
