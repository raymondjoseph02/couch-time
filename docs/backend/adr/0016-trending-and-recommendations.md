# ADR 0016: Trending as a scheduled time-decayed score; recommendations from genre overlap and co-watching

| Field | Value |
|---|---|
| Status | Accepted; recommendations extended by [ADR 0027](./0027-ai-recommendations-hybrid.md) (these rules become one candidate source and the A/B baseline) |
| Date | 2026-10-04 |
| Phase | Week 8 |
| Related | [ADR 0015](./0015-watch-progress-and-events.md), [ADR 0014](./0014-redis-caching-and-rate-limiting.md), `Trending.tsx`, details page "You Might Also Like" |

## Context

- The prototype's trending sorts by an all-time in-memory counter, so an old video with many past opens stays on top forever.
- The details page shows six placeholder images under "You Might Also Like".
- Computing either on every request would scan `view_events`, which is too slow as it grows.

## Decision

**Trending (DISC-3)**
- A **scheduled job** (a BullMQ repeatable job every 15 minutes, run by the worker) computes, for each published video:

  ```
  score = Σ over events in the last 7 days of  weight(type) × 0.5 ^ (age_hours / 24)
  weights: complete = 3, play = 1, trailer_play = 0.2
  ```

  i.e. each event loses half its value every 24 hours (exponential decay).
- Implemented as **one SQL `UPDATE … FROM (SELECT … GROUP BY video_id)`** into `videos.trending_score`; videos with no recent events decay to 0.
- `GET /videos/trending` = `ORDER BY trending_score DESC` using the partial index, cached in Redis until the next run.
- Before any events exist (fresh install), fall back to newest published.

**Recommendations: "You Might Also Like" (DISC-4)**
- **Step 1, content-based:** videos sharing the most genres with V (then same director/cast), excluding V and, for signed-in users, completed videos. Pure SQL with `COUNT(*)` over `video_genres` joins.
- **Step 2, co-watch (item-to-item collaborative filtering, simplified):** "users who played V also played W", counted over the last 90 days of `play` events. Precomputed nightly into a `video_related (video_id, related_id, score)` table.
- Final list = co-watch results (if at least 3 users overlap), topped up with content-based results, limited to 12. Cached per video for 1 hour.

**Personal rows (DISC-5, P2):** "Because you watched X" = the related list of the user's most recent completed video.

## Alternatives considered

| Option | Pros | Cons | Why not chosen |
|---|---|---|---|
| All-time counts | Simple. | Stale; old hits never leave. | Recency matters for "trending". |
| Compute per request | Always fresh. | Scans events on every page view. | Precompute and cache. |
| Redis sorted sets updated per event (`ZINCRBY`) | Real-time. | Decay needs extra tricks; data lives outside SQL. | A good stretch experiment; compare it to the SQL job. |
| ML recommender (matrix factorisation, embeddings) | Better at scale. | Needs data you don't have; a separate skill set. | Out of scope (PRD non-goals). |
| Search-engine "more like this" | Text similarity. | Another system. | Genres and co-watch are enough for v1. |

## Consequences

**Good:** cheap reads; explainable results; a natural introduction to scheduled jobs and aggregation SQL; it degrades gracefully with little data.

**Bad / costs:** up to 15 minutes of staleness; co-watch needs enough users to be meaningful (you'll mostly see content-based results at first); one more scheduled job to monitor.

## What you'll learn

- Aggregations, `GROUP BY`, CTEs and window functions; `UPDATE … FROM`.
- Time-decay ranking (compare with the Hacker News and Reddit formulas).
- Precomputation vs on-demand trade-offs.
- Scheduled/repeatable jobs and making them safe to run twice.

## Done when

- [ ] A seeded event generator (a script creating fake users and plays) produces a visibly different trending order over simulated days.
- [ ] Watching a new video several times moves it up within one job interval.
- [ ] "You Might Also Like" shows real videos and never the current one or drafts.
- [ ] `EXPLAIN ANALYZE` of the trending update with 1M events finishes in under a few seconds (add an index on `view_events (created_at)` if needed).

## References

- https://medium.com/hacking-and-gonzo/how-hacker-news-ranking-algorithm-works-1d9b0cf2c08d
- https://www.postgresql.org/docs/current/tutorial-window.html
- Amazon's item-to-item collaborative filtering (Linden et al., 2003)
- https://docs.bullmq.io/guide/job-schedulers
