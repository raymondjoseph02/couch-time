# ADR 0031: In-house feature flags and A/B experiments with deterministic bucketing; product analytics from events and materialised views

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-10-04 |
| Phase | Week 16 |
| Related | [ADR 0027](./0027-ai-recommendations-hybrid.md), [ADR 0028](./0028-hybrid-semantic-search.md), [ADR 0015](./0015-watch-progress-and-events.md), [PRD §5.18](../PRD.md#518-experiments-analytics-and-audit) |

## Context

The AI features change product behaviour in ways intuition can't judge: does the hybrid recommender *actually* lead to more watching? Is the assistant used? We also need **kill switches** (turn off the LLM search parse if costs spike) and gradual rollouts. And admins want dashboards: daily active profiles, completion rates, top titles, AI spend.

## Decision

**Feature flags**
- `feature_flags (key PK, enabled bool, rollout_percent int, rules jsonb, updated_at, updated_by)`. Rules can target plan, role, profile kind (kids) or an allow-list.
- `isEnabled(key, ctx)` reads from an in-memory cache refreshed every 30 seconds (with Redis pub/sub for instant invalidation on change).
- Every AI feature has a flag: `ai.search_parse`, `ai.rec_reasons`, `ai.concierge`, `ai.enrichment`, so it can be turned off **without a deploy**.

**Experiments**
- `experiments (key, variants jsonb [{name, weight}], status, started_at, ended_at, primary_metric)`.
- **Deterministic bucketing:** `variant = pick(hash(experimentKey + ':' + profileId) mod 10000, weights)`, so a profile always sees the same variant, without storing assignments. Log an `exposure` event the first time a variant is served.
- **Analysis:** a SQL view per experiment computes the primary metric per variant (e.g. play-through per recommendation impression), with a two-proportion z-test and a confidence interval. Rules: decide the sample size up front (rough power calculation) and don't stop early when it "looks significant" (peeking).

**Analytics**
- Events already exist (`view_events`, recommendation impressions/clicks, `ai_usage`, exposures).
- **Materialised views** refreshed by a scheduled job: `daily_active_profiles`, `title_daily_stats (views, completions, avg % watched)`, `rec_performance_daily (row, variant, impressions, clicks, playthroughs)`, `ai_cost_daily (feature, tokens, cost)`.
- `GET /admin/stats/*` endpoints read the views; the admin page charts them.

**Audit log**
- `audit_log (id, actor_user_id, action, entity, entity_id, before jsonb, after jsonb, ip, created_at)`, written in the same transaction as admin changes (publish, rating change, flag change, role promotion, AI suggestion accepted). Append-only; viewable in admin.

## Alternatives considered

| Option | Pros | Cons | Why not chosen |
|---|---|---|---|
| Hosted flags/experiments (LaunchDarkly, GrowthBook, Statsig, PostHog) | Polished UI, stats engine. | Cost or external dependency; hides the mechanics. | Build the simple version to learn; GrowthBook/PostHog self-hosted are good upgrades. |
| Env-var flags | Trivial. | Needs a redeploy to change; no targeting. | Kill switches must be instant. |
| Random assignment per request | Simple. | The same user flips between variants. | Hash bucketing is stable. |
| Separate analytics warehouse (ClickHouse, BigQuery) | Scales for heavy analytics. | Another system plus pipelines. | Materialised views are enough at this scale. |

## Consequences

**Good:** safe rollouts and instant kill switches for AI; evidence-based product decisions; an audit trail for admin actions.

**Bad / costs:** experiment statistics are easy to get wrong (read the references); materialised views need refresh scheduling; flags accumulate (remove stale ones).

## What you'll learn

- Feature-flag architecture and progressive delivery.
- A/B testing fundamentals: randomisation, exposure logging, significance, power, the peeking problem.
- Materialised views and analytical SQL.
- Audit logging for accountability.

## Done when

- [ ] Turning `ai.concierge` off hides the assistant within 30 seconds, with no deploy.
- [ ] A profile's variant is stable across sessions and instances (test).
- [ ] The recommender A/B report shows impressions, play-through rate per variant and a confidence interval.
- [ ] Every admin publish or flag change appears in the audit log with before/after.

## References

- https://martinfowler.com/articles/feature-toggles.html
- Kohavi, Tang & Xu, *Trustworthy Online Controlled Experiments* (2020)
- https://www.evanmiller.org/how-not-to-run-an-ab-test.html
- https://www.postgresql.org/docs/current/rules-materializedviews.html
