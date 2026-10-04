# ADR 0014: Redis for caching, rate limiting and the job queue

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-10-04 |
| Phase | Week 5 |
| Related | [ADR 0013](./0013-transcoding-pipeline-job-queue.md), [ADR 0015](./0015-watch-progress-and-events.md), [ADR 0008](./0008-authentication-jwt-cookies.md) |

## Context

Several needs share one shape: **fast, shared, short-lived state** that every API instance can see.

- **Rate limiting** (sign-in attempts, progress writes, view events) must count across instances; in-memory counters reset on restart and differ per instance.
- **Caching** hot, rarely-changing reads (genres, spotlight, video details) cuts database load.
- **The job queue** ([ADR 0013](./0013-transcoding-pipeline-job-queue.md)) needs a broker.
- **Short-lived records:** wallet nonces (5 minutes), the "sign out everywhere" deny-list, the progress write buffer ([ADR 0015](./0015-watch-progress-and-events.md)).

## Decision

Use **Redis** (or Valkey, which is API-compatible) via **`ioredis`**:

**Caching: cache-aside with explicit invalidation**

| Key | TTL | Invalidated when |
|---|---|---|
| `genres:v1` | 1 h | admin changes genres |
| `spotlight:v1` | 5 min | publish / feature change |
| `video:{id}:v1` (public part only) | 10 min | admin edits that video; transcode completes |
| `trending:v1:{limit}` | until the next trending run | trending job writes new scores |

- **Never cache per-user data inside public keys.** Per-user fields (`progress`, `action`, `startAt`) are merged in *after* reading the shared cached object.
- Bump the `:v1` suffix to invalidate everything after a format change.
- If Redis is down, **fall through to the database** (the cache is an optimisation, not a dependency) and log a warning.

**Rate limiting:** `rate-limiter-flexible` with the Redis store.

| Route | Limit | Key |
|---|---|---|
| `POST /auth/signin` | 5 / 15 min | email + IP |
| `POST /auth/*` (others) | 20 / 15 min | IP |
| `PUT /me/progress/:id` | 30 / min | user |
| `POST /videos/:id/events` | 60 / min | user or session |
| Everything else | 300 / min | user or IP |

- Rate-limited requests return 429 with `Retry-After` and RateLimit headers ([ADR 0011](./0011-rest-api-conventions.md)).
- Behind a proxy, set `app.set('trust proxy', 1)` so `req.ip` is the client, not the load balancer.

**Separation:** use logical DBs or key prefixes (`cache:`, `rl:`, `bull:`), and in production consider two instances: a cache (evictable, `allkeys-lru`) and a queue (`noeviction`, so BullMQ never loses jobs).

## Alternatives considered

| Option | Pros | Cons | Why not chosen |
|---|---|---|---|
| In-process memory (`lru-cache`, `express-rate-limit` memory store) | Zero infrastructure. | Per-instance; lost on restart. | Fine for week 3; replaced in week 5. |
| Memcached | Simple cache. | No data structures; not usable for queues or rate limits. | Redis covers all three needs. |
| Postgres for everything | One system. | Rate limiting on every request adds DB writes. | Wrong tool for hot counters. |
| HTTP/CDN caching only | Free speed. | Can't cache anything personalised; still worth adding (`Cache-Control`). | Complementary, not a replacement. |

## Consequences

**Good:** shared state across instances; measurable latency wins; one extra system covers three needs.

**Bad / costs:** another service to run; **cache invalidation bugs** (stale data) are a real risk, so test them; eviction settings matter (cache vs queue).

## What you'll learn

- Redis data types (strings, hashes, sorted sets, TTLs) and atomic ops (`INCR`, `SET NX EX`).
- Rate-limiting algorithms: fixed window vs sliding window vs token bucket.
- Cache-aside, write-through and TTL vs explicit invalidation; the "thundering herd" and how a short lock or stale-while-revalidate helps.
- Graceful degradation when a dependency is down.

## Done when

- [ ] Measured before/after p95 latency for `GET /videos/:id` with the cache, recorded in the PR description.
- [ ] Editing a video in admin shows the change immediately (invalidation test).
- [ ] Stopping Redis: catalogue reads still work (slower), and the logs warn.
- [ ] A 6th sign-in attempt within 15 minutes → 429 with `Retry-After`.

## References

- https://redis.io/docs/latest/develop/data-types/
- https://github.com/animir/node-rate-limiter-flexible
- https://redis.io/docs/latest/develop/use/patterns/
- Cloudflare's "How we built rate limiting": https://blog.cloudflare.com/counting-things-a-lot-of-different-things/
