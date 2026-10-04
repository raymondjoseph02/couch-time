# ADR 0017: Search with PostgreSQL full-text search plus trigram similarity (no separate search engine in v1)

| Field | Value |
|---|---|
| Status | Accepted; extended by [ADR 0028](./0028-hybrid-semantic-search.md) (becomes the keyword half of hybrid search) |
| Date | 2026-10-04 |
| Phase | Week 5 |
| Related | [ADR 0004](./0004-postgresql-database.md), `SearchBar.tsx` (Cmd+K) |

## Context

`SearchBar.tsx` currently returns hardcoded results ("Mock search function - replace with actual API call"). Requirements: search titles, descriptions and cast (DISC-1); tolerate typos; fast autocomplete under 100 ms (DISC-2); never show drafts. The catalogue will be hundreds to a few thousand videos, not millions.

## Decision

Use **PostgreSQL** for search.

**Full-text search (`/search`)**
- A generated `search_vector` column on `videos`, weighted:
  ```sql
  ALTER TABLE videos ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C')
  ) STORED;
  CREATE INDEX videos_search_idx ON videos USING GIN (search_vector);
  ```
- Cast and crew names: a `people_text` column maintained by the service (or trigger) when credits change, weighted `B`. (A generated column can't reference another table.)
- Query: `websearch_to_tsquery('english', $q)` (supports quotes and `-exclude`), ranked by `ts_rank_cd`, then `trending_score` as a tie-breaker, with `ts_headline` for highlighted snippets (P1).

**Typo tolerance and autocomplete (`/search/suggest`)**
- `CREATE EXTENSION pg_trgm; CREATE INDEX videos_title_trgm ON videos USING GIN (title gin_trgm_ops);`
- Suggest: `WHERE title % $q OR title ILIKE $q || '%' ORDER BY similarity(title, $q) DESC LIMIT 8`.
- `/search` falls back to trigram matching when full-text search returns 0 results (so "intersteler" finds "Interstellar").
- `unaccent` for accent-insensitive matching (P1).

**Frontend:** debounce input by 200 ms, cancel stale requests (`AbortController`), and keep the existing Cmd+K UI.

**Upgrade path:** if relevance or speed becomes a problem (tens of thousands of titles, multi-language, facets), add **Meilisearch** or **Typesense**, synced from Postgres by a job, in a new ADR.

## Alternatives considered

| Option | Pros | Cons | Why not chosen |
|---|---|---|---|
| `ILIKE '%q%'` | Trivial. | No ranking, no typos, can't use a normal index. | Too weak. |
| Meilisearch / Typesense | Excellent typo tolerance, instant search, facets. | Another service plus data sync. | Not needed at this size; a great follow-up. |
| Elasticsearch / OpenSearch | Very powerful. | Heavy to run; steep learning curve. | Far too much for v1. |
| Algolia | Hosted, superb UX. | Cost; vendor lock-in; hides the learning. | Same. |

## Consequences

**Good:** no new infrastructure; transactional consistency (a published video is searchable immediately); real ranking; typo tolerance.

**Bad / costs:** English-only stemming unless configured per language; relevance tuning is manual; `people_text` must be kept in sync.

## What you'll learn

- How search engines work: tokenising, stemming, stop words, inverted indexes (GIN), ranking.
- Trigram similarity and why it handles typos.
- Debouncing and request cancellation on the client.

## Done when

- [ ] "intersteler" → Interstellar; "beekeeper statham" → The Beekeeper (title + cast).
- [ ] Draft videos never appear in search.
- [ ] `/search/suggest` p95 under 100 ms with 5,000 seeded videos.
- [ ] The `SearchBar` mock is deleted.

## References

- https://www.postgresql.org/docs/current/textsearch.html
- https://www.postgresql.org/docs/current/pgtrgm.html
- https://www.meilisearch.com/docs (for the upgrade path)
