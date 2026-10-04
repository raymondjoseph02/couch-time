# ADR 0028: Hybrid search: keyword + vector results merged with Reciprocal Rank Fusion; LLM query parsing for natural-language filters

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-10-04 |
| Phase | Week 15 |
| Related | Extends [ADR 0017](./0017-search-postgres-full-text.md); uses [ADR 0026](./0026-embeddings-and-pgvector.md), [ADR 0029](./0029-llm-integration-claude.md) |

## Context

Keyword search ([ADR 0017](./0017-search-postgres-full-text.md)) is great for names ("beekeeper", "statham") and bad for descriptions of what you want ("something funny and short for a family night", "a 90s-style space movie that isn't too scary"). Semantic (vector) search is the opposite. Users also embed **filters** in sentences: "*under 2 hours*", "*from the 90s*", "*for kids*".

## Decision

**1. Query understanding (only for "natural" queries)**
- Heuristic gate: queries of at least 4 words, or containing words like "something", "like", "movie about" or "for a…", go through parsing; short queries skip it (fast path, no LLM cost).
- **Claude** ([ADR 0029](./0029-llm-integration-claude.md)) parses the query with **structured output** (a Zod schema → `output_config.format`) at **low effort**, into:
  ```ts
  { semanticQuery: string;            // the "vibe" part to embed
    keywords: string[];               // names/titles to keyword-match
    genres?: string[]; yearFrom?: number; yearTo?: number;
    maxMinutes?: number; maxMaturity?: Rating; kind?: "movie" | "series" }
  ```
- **Never trust the parse blindly:** genres are validated against the `genres` table, numbers are clamped, and `maxMaturity` can only be **stricter** than the profile's limit, never looser.
- Results are cached by normalised query text (24 hours). If the LLM fails or times out (> 1.5 seconds), fall back to plain hybrid search with no filters.

**2. Retrieval (both, in parallel)**
- Keyword: the existing `tsvector` + trigram query → top 50 with rank.
- Vector: embed `semanticQuery` (query-type embedding) → pgvector top 50 with the same SQL filters.

**3. Fusion: Reciprocal Rank Fusion (RRF)**
```
rrf(doc) = Σ over lists  1 / (60 + rank_in_list(doc))
```
- Then a small boost from `trending_score` and the profile's genre affinity. RRF needs no score normalisation, which is why it's the common default.

**4. Response:** results + `interpretedAs` (the parsed filters, shown as removable chips in the UI, e.g. `< 2h × 1990s ×`) so users can see and correct what the AI understood.

**Evaluation:** a hand-labelled set of ~40 queries with expected relevant titles (in `test/search-eval.json`). Track NDCG@10 for keyword-only vs vector-only vs hybrid; run it in CI against the seeded catalogue.

## Alternatives considered

| Option | Pros | Cons | Why not chosen |
|---|---|---|---|
| Vector-only search | One path. | Fails on exact names, rare words, typos. | Hybrid beats both alone in most benchmarks. |
| LLM re-ranks every result list | Better relevance. | Latency + cost on every keystroke. | A P2 experiment for the final results page only. |
| Let the LLM write SQL | Flexible. | Injection risk; unpredictable. | Structured filters into fixed, parameterised queries only. |
| Weighted score sum instead of RRF | Tunable. | Scores from BM25 and cosine aren't comparable without normalisation. | RRF is robust and simple. |

## Consequences

**Good:** search understands intent and filters; users see the interpretation; LLM use is gated and cached; it degrades to keyword search if AI is down.

**Bad / costs:** two retrievals per query; a labelled eval set to maintain; parse latency on long queries (hidden behind the suggest-as-you-type UX).

## What you'll learn

- Lexical vs semantic retrieval and why hybrid works.
- Rank fusion; search relevance evaluation (NDCG).
- Using an LLM as a **parser** with a strict schema, and defending against bad output.
- Graceful degradation and caching for AI features.

## Done when

- [ ] "funny space movie under 2 hours from the 90s" → filters `{genres:[Comedy, Sci-Fi], yearFrom:1990, yearTo:1999, maxMinutes:120}` shown as chips, with sensible results.
- [ ] On the eval set, hybrid NDCG@10 is at least as good as both single methods (report saved).
- [ ] "show me R-rated horror" on a kids profile never returns R-rated titles.
- [ ] With the LLM disabled (feature flag), search still works.

## References

- Cormack et al., *Reciprocal Rank Fusion outperforms Condorcet and individual rank learning methods* (SIGIR 2009)
- https://github.com/pgvector/pgvector#hybrid-search
- https://docs.claude.com/en/docs/build-with-claude/structured-outputs
