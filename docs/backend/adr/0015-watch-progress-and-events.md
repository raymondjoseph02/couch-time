# ADR 0015: Watch progress as one upserted row per user and video; view events as an append-only log

| Field | Value |
|---|---|
| Status | Accepted; amended by [ADR 0021](./0021-profiles-and-parental-controls.md) (personal data keyed by `profile_id` from week 10) |
| Date | 2026-10-04 |
| Phase | Week 5 (progress), Week 8 (events) |
| Related | [PRD §5.5](../PRD.md#55-watch-progress-and-history), [ADR 0014](./0014-redis-caching-and-rate-limiting.md), [ADR 0016](./0016-trending-and-recommendations.md) |

## Context

The frontend player (details page) already sends progress every ~10 seconds and on pause, and reads `progress`/`action`/`startAt` from each video to show **Play** vs **Resume** and to seek. The prototype stores this in a JS object (`progress[userId][videoId]`), lost on restart, and counts "views" whenever a trailer is opened.

Two different kinds of data are mixed up:
1. **State:** "where is user U in video V *right now*?" One value, overwritten often.
2. **History/analytics:** "what happened?" (plays, completions). Append-only, used for trending and recommendations.

Load estimate: 1,000 concurrent viewers × 1 save per 10 seconds = **100 writes/s**, enough to matter for a small database if handled naively.

## Decision

**Progress (state)**
- Table `watch_progress (user_id, video_id)` composite PK ([PRD §6](../PRD.md#62-tables)).
- `PUT /me/progress/:videoId { position, clientTime }` does a single **upsert**:
  ```sql
  INSERT INTO watch_progress (user_id, video_id, position_seconds, duration_seconds, client_updated_at, updated_at, completed_at)
  VALUES ($1, $2, $3, $4, $5, now(), CASE WHEN $3 >= $4 * 0.95 THEN now() END)
  ON CONFLICT (user_id, video_id) DO UPDATE
    SET position_seconds = EXCLUDED.position_seconds,
        client_updated_at = EXCLUDED.client_updated_at,
        updated_at = now(),
        completed_at = EXCLUDED.completed_at
    WHERE watch_progress.client_updated_at < EXCLUDED.client_updated_at;  -- ignore stale/out-of-order saves
  ```
- **Completion:** at 95% or more, `completed_at` is set. Continue Watching filters `completed_at IS NULL`; the response gives `action: "play"`, `startAt: 0`. This matches the current server behaviour.
- **Rewatch:** starting a completed video again and saving below 95% clears `completed_at`.
- **Write load:** rate limit at 30/min per user ([ADR 0014](./0014-redis-caching-and-rate-limiting.md)). **Stretch (week 8):** buffer saves in a Redis hash `progress:buffer` and flush to Postgres every 5 seconds in one batched upsert; measure the difference with k6.
- **Read path:** video responses add per-user fields by fetching the user's progress rows for the returned video ids in **one query** (`WHERE user_id = $1 AND video_id = ANY($2)`), never one query per video.

**History**
- `/me/history` = `watch_progress` rows ordered by `updated_at desc` (including completed). "Remove from history" deletes the row.

**View events (analytics)**
- Table `view_events`, append-only: `trailer_play`, `play` (first progress save of a session), `complete`.
- Written via `POST /videos/:id/events` from the client, and server-side on certain transitions (first save → `play`, crossing 95% → `complete`).
- **Deduplicated:** at most one `play` per (user or session, video) per 30 minutes, using a Redis `SET NX EX`.
- Guests are identified by an anonymous `session_key` cookie (random, no personal data).
- Retention: raw events kept for 90 days, then summarised (week 8 stretch: monthly partitions, drop old ones).

## Alternatives considered

| Option | Pros | Cons | Why not chosen |
|---|---|---|---|
| Insert a new row per save | Full history. | 100 rows/s of mostly useless data; Continue Watching needs `DISTINCT ON`. | State and events are different things. |
| Store progress only in Redis | Very fast. | Durability; harder joins. | Postgres is the source of truth; Redis is an optional buffer. |
| `localStorage` only (status quo) | No backend. | Not cross-device (G2). | It's what we're replacing. |
| Count views when the trailer is opened (status quo) | Simple. | Inflated; trivially gamed. | Events with dedup are more honest. |

## Consequences

**Good:** O(1) rows per user-video; out-of-order saves can't move progress backwards; cheap Continue Watching via an index; honest view counts.

**Bad / costs:** two related tables to keep consistent; the Redis buffer (if built) adds failure modes (flush before shutdown!).

## What you'll learn

- Upserts and conditional updates; race conditions with concurrent requests.
- Modelling state vs events (a taste of event sourcing).
- Batching writes and measuring the effect.
- Avoiding N+1 when merging per-user data into lists.

## Done when

- [ ] Send saves at t=100 then t=90 (older `clientTime`) → position stays 100.
- [ ] Watch to 96% → it disappears from Continue Watching and the button shows **Play**.
- [ ] Trending input counts at most 1 play per user per 30 minutes, even when spamming play/pause.
- [ ] `GET /videos?limit=20` runs a constant number of queries regardless of the result count (check the Prisma logs).

## References

- https://www.postgresql.org/docs/current/sql-insert.html#SQL-ON-CONFLICT
- Martin Kleppmann, *Designing Data-Intensive Applications*, ch. 11 (stream processing, event logs)
