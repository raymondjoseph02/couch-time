# ADR 0002: Use Node.js (LTS) with TypeScript in strict mode

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-10-04 |
| Phase | Week 1 |
| Related | [ADR 0003](./0003-express-layered-architecture.md), [ADR 0018](./0018-testing-strategy.md) |

## Context

The prototype `server.js` is plain JavaScript (CommonJS, `require`). It works, but:

- Nothing checks that the response shape matches what the frontend expects. The frontend's `type.tsx` already had to guess the fields (`url` vs `src`).
- As the code grows to ~15 modules, renaming a field or changing a function signature without types is error-prone.
- The frontend is already TypeScript, so you know the language.

We need a runtime and language for the API and the worker.

## Decision

We will use:

- **Node.js, the current LTS release**, pinned in `.nvmrc` and the `engines` field.
- **TypeScript with `"strict": true`**, plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
- **ES modules** (`"type": "module"`).
- **`tsx`** to run TypeScript directly in development (`tsx watch src/server.ts`), and **`tsc`** to build for production (`dist/`).
- The same language for the API and the worker, so they can share types and code.

Later (P2), consider sharing request/response types with the frontend through a small `@couchtime/contracts` package, or by generating a client from the OpenAPI spec ([ADR 0011](./0011-rest-api-conventions.md)).

## Alternatives considered

| Option | Pros | Cons | Why not chosen |
|---|---|---|---|
| Keep plain JavaScript | No build step. | No safety net; shapes drift from the frontend. | Type errors are the most common bug in this kind of codebase. |
| Go | Fast, simple deploys, great concurrency. | New language *and* new backend concepts at once. | Too much new at the same time. Good for a second project. |
| Python (FastAPI) | Great typing via Pydantic; nice docs. | Context-switching from the TS frontend. | Shared types with the frontend matter more here. |
| Bun or Deno | Fast; built-in TS. | Smaller ecosystem for ffmpeg, BullMQ, Prisma edge cases; less learning material. | Node is what most jobs use. Revisit later. |

## Consequences

**Good:** compile-time checks; better editor autocomplete; the same language front to back; the skills transfer directly to jobs.

**Bad / costs:** a build step; some libraries have weak types (wrap them); strict mode will feel slow at first. That's the point.

## What you'll learn

- The Node.js event loop: why `await`ing a database call doesn't block other requests, and why a CPU-heavy loop (like transcoding in-process) *does*. That is why ffmpeg runs in a worker ([ADR 0013](./0013-transcoding-pipeline-job-queue.md)).
- ES modules vs CommonJS.
- What `strict` actually turns on (`strictNullChecks`, `noImplicitAny`, …).

## Done when

- [ ] `npm run typecheck` (`tsc --noEmit`) passes with zero errors and zero `any` in `src/`.
- [ ] `npm run build && node dist/server.js` starts the server.
- [ ] Exercise: write a 20-line script that blocks the event loop for 5 seconds and show that a second HTTP request waits.

## References

- https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick
- https://www.typescriptlang.org/tsconfig#strict
- https://github.com/privatenumber/tsx
