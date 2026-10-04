# ADR 0003: Express 5 with a layered, module-per-feature architecture (a modular monolith)

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-10-04 |
| Phase | Week 1 |
| Related | [PRD §9](../PRD.md#9-system-architecture-target), [ADR 0013](./0013-transcoding-pipeline-job-queue.md) |

## Context

`server.js` is a single file: routes, data, business rules and helpers all mixed together. That's fine for one route, but the PRD has ~50 endpoints across auth, catalogue, progress, bookmarks, search, admin and media. We need:

1. A web framework.
2. A way to organise code so each part can be understood and tested on its own.
3. A decision on how many deployable services to run.

## Decision

**Framework:** **Express 5**, which you already use. Express 5 forwards rejected promises from `async` handlers to the error handler, so no `express-async-errors` wrapper is needed.

**Architecture:** a **modular monolith**. One API process, organised **by feature module**. Each module has the same layers:

```
modules/videos/
├─ videos.routes.ts      # URL + method → middleware chain → controller
├─ videos.controller.ts  # HTTP only: read req, call service, shape res. No SQL here.
├─ videos.service.ts     # Business rules. No req/res here. Easy to unit test.
├─ videos.repository.ts  # Database access (Prisma). Optional for tiny modules.
├─ videos.schemas.ts     # Zod schemas for input/output (ADR 0007)
└─ videos.test.ts
```

**Rules:**
- Dependencies point **downwards only**: routes → controller → service → repository.
- A module may call another module's **service**, never its repository or tables directly.
- `app.ts` builds and exports the app; `server.ts` calls `listen()`. Tests import `app.ts` with no open port.

**Deployables:** **two processes from one codebase**: `server.ts` (API) and `worker.ts` (background jobs). They share modules and the database. No microservices.

## Alternatives considered

| Option | Pros | Cons | Why not chosen |
|---|---|---|---|
| Fastify | Faster; schema-first; good TS support. | New API to learn; plugin model takes time. | Express is "good enough"; the time goes to backend concepts instead. A good second-project choice. |
| NestJS | Strong structure; DI; decorators; popular in companies. | Lots of magic; you'd learn Nest more than backend fundamentals. | Learn the fundamentals first, then frameworks make sense. |
| Layer-first folders (`controllers/`, `services/`) | Familiar from tutorials. | Changing one feature touches five folders. | Feature folders keep related code together. |
| Microservices | Independent scaling and deploys. | Network calls, distributed transactions and many repos, for one developer. | Massive overhead with no benefit at this scale. |

## Consequences

**Good:** each layer is testable alone; features are easy to find; the worker reuses the same services; you can split out a service later along module boundaries if you ever need to.

**Bad / costs:** more files per feature; you have to resist "just quickly querying the DB from the controller".

## What you'll learn

- The middleware chain: `(req, res, next)`, ordering, and error middleware `(err, req, res, next)`.
- Separation of concerns and dependency direction.
- Why "monolith first" is the usual advice.

## Done when

- [ ] No file in `controllers` imports Prisma; no file in `services` imports `express`. Enforce it with an ESLint `no-restricted-imports` rule.
- [ ] `server.js`'s routes are ported into `modules/videos/` with the same responses.
- [ ] A service unit test runs without starting Express.

## References

- https://expressjs.com/en/guide/migrating-5.html
- Martin Fowler, *MonolithFirst*: https://martinfowler.com/bliki/MonolithFirst.html
