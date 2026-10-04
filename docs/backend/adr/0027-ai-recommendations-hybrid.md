# ADR 0027: Two-stage hybrid recommender: candidate generation, then re-ranking, with LLM-written explanations; measured offline and by A/B tests

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-10-04 |
| Phase | Week 16 |
| Related | Extends [ADR 0016](./0016-trending-and-recommendations.md); uses [ADR 0026](./0026-embeddings-and-pgvector.md), [ADR 0029](./0029-llm-integration-claude.md), [ADR 0031](./0031-experiments-and-feature-flags.md); [PRD §5.15](../PRD.md#515-ai-recommendations) |

## Context

[ADR 0016](./0016-trending-and-recommendations.md) gave us explainable rules: trending, genre overlap and co-watch. They work, but they are not personal and they can't capture *taste* ("slow, moody thrillers", not just "Thriller"). The PRD now asks for **AI recommendations**: personalised home rows, "Because you watched X", and a short **reason** under each pick.

Recommenders in industry are almost always **multi-stage**: cheaply fetch a few hundred candidates from several sources, then carefully rank a short list. They are also **measured**. "It looks good to me" isn't evidence.

## Decision

**Signals collected (per profile)**
- Implicit: plays, completion %, rewatches, abandon after under 5 minutes (a negative signal), time of day, device.
- Explicit: thumbs up/down ratings, bookmarks, "not interested" (PRD §5.10).
- All of it comes from `watch_progress`, `ratings`, `bookmarks` and `view_events`, already in Postgres.

**Stage 1: candidate generation** (≈300 candidates, union of sources, each tagged with its source)

| Source | How |
|---|---|
| **Taste vector** | `taste_vectors (profile_id, embedding, updated_at)` = the weighted average of embeddings of titles the profile engaged with (weight = completion × recency decay, thumbs-up ×2, thumbs-down subtracts). Updated by a job after each completion or rating. Query: pgvector nearest neighbours. |
| **Item-to-item** | Embedding neighbours of the last 3 titles watched ("Because you watched X"). |
| **Co-watch** | `video_related` from [ADR 0016](./0016-trending-and-recommendations.md). |
| **Trending** | Top trending, for freshness and cold start. |
| **New & unseen** | Recently published, for exploration. |

All candidates pass the **same base filters**: published, maturity ≤ profile, not completed, not "not interested", and the plan's entitlement.

**Stage 2: re-ranking** (a transparent scoring function first, learnable later)
```
score = w1·cos(taste, item) + w2·cowatch + w3·trending_norm + w4·freshness
        + w5·genre_affinity − w6·already_seen_similar − w7·abandon_penalty
```
- Weights start hand-tuned in config. **Stretch:** learn them with logistic regression on (impression → played?) logs, offline in a notebook, exporting the weights.
- **Diversity:** Maximal Marginal Relevance (MMR, λ≈0.7) so a row isn't 10 near-identical films.
- **Cold start:** a new profile gets an onboarding picker ("choose 3 you like" → seeds the taste vector) and falls back to trending-by-genre.

**Explanations ("Because you liked *Heat* and tense heists")**
- Reasons are built from **facts we already know** (source + top overlapping tags), then turned into a natural one-liner by **Claude** ([ADR 0029](./0029-llm-integration-claude.md)), using structured output so the response is always `{ reason: string }`, at low effort.
- The LLM only **phrases** the reason; it **never chooses** the items. That keeps it fast, cheap, safe and testable.
- Reasons are cached per (profile, title, source-signature) for 24 hours; only the top ~10 of each row get one.

**Serving**
- Home rows are precomputed per active profile by a job (every few hours, and after a completion), stored in Redis `recs:{profileId}:{row}` with the generation time; computed on the fly for profiles not cached yet.
- `GET /me/recommendations?row=for-you|because-you-watched|…` returns items plus the reason and a **`recId`**. The client sends impressions/clicks with that `recId` so we can measure.

**Measurement**
- **Offline:** a held-out evaluation (for each profile, hide the last 20% of watches, generate recommendations from the rest) → Recall@10, NDCG@10, coverage and novelty. Run it in CI on a seeded synthetic dataset to catch regressions. Generate the synthetic users with a script that gives them consistent hidden tastes.
- **Online:** an A/B test of the old rules (ADR 0016) vs the hybrid using feature flags ([ADR 0031](./0031-experiments-and-feature-flags.md)); the primary metric is play-through rate (rec clicked AND watched over 10 minutes) per impression.

## Alternatives considered

| Option | Pros | Cons | Why not chosen |
|---|---|---|---|
| Ask an LLM to pick recommendations from the whole catalogue | Impressive demo. | Expensive per request, slow, hallucinates titles, hard to filter or measure, prompt-injection surface. | LLMs explain and assist; retrieval and ranking do the picking. |
| Matrix factorisation / ALS | Classic collaborative filtering. | Needs lots of interaction data; separate training infrastructure. | Good stretch once synthetic data exists; embeddings work with little data. |
| Two-tower neural model | State of the art at scale. | Data, training and serving infrastructure. | Far beyond this project's data. |
| Managed recommender (AWS Personalize, Recombee) | Fast to start. | Cost; black box. | Learning goal. |

## Consequences

**Good:** personal, diverse and explainable recommendations; every claim is measurable; LLM costs stay small and bounded.

**Bad / costs:** more jobs and caches; synthetic data only approximates real users; the weights need iterative tuning.

## What you'll learn

- How real recommender systems are structured (retrieval → ranking → re-ranking/diversity).
- Implicit vs explicit feedback; cold start; exploration vs exploitation.
- Offline metrics (Recall@K, NDCG) and why they don't always match online results.
- Using an LLM for the right job (generation/explanation) instead of everything.

## Done when

- [ ] Two synthetic profiles with opposite tastes get clearly different "For You" rows.
- [ ] Offline eval report saved (`docs/backend/evals/recs-YYYY-MM-DD.md`): hybrid beats ADR 0016 rules on Recall@10.
- [ ] Every rec shows a reason; reasons never mention a title the user hasn't watched as "because you watched".
- [ ] A kids profile never receives an out-of-rating rec (test).
- [ ] `/me/recommendations` p95 under 150 ms from cache, under 600 ms cold (excluding reason generation, which is filled in asynchronously).

## References

- Covington et al., *Deep Neural Networks for YouTube Recommendations* (2016), for the two-stage architecture
- MMR: Carbonell & Goldstein (1998)
- https://eugeneyan.com/writing/system-design-for-discovery/
- https://www.evidentlyai.com/ranking-metrics/ndcg-metric
