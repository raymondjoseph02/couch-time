# ADR 0026: Store vector embeddings in PostgreSQL with pgvector, behind a pluggable embedding provider

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-10-04 |
| Phase | Week 15 |
| Related | [ADR 0027](./0027-ai-recommendations-hybrid.md), [ADR 0028](./0028-hybrid-semantic-search.md), [ADR 0004](./0004-postgresql-database.md), [ADR 0013](./0013-transcoding-pipeline-job-queue.md) |

## Context

The AI features need **semantic similarity**: "find titles *like* this one" and "find titles matching *a slow-burn heist with a twist*", even when they share no keywords or genres. The standard tool is an **embedding**: a model turns text into a vector (e.g. 1024 numbers) so that similar meanings sit close together, compared by cosine distance.

Two decisions:
1. **Where to store and search vectors.**
2. **Which model makes them.** Claude (our LLM, [ADR 0029](./0029-llm-integration-claude.md)) **does not offer an embeddings endpoint**, so this must be a separate provider.

## Decision

**Storage: `pgvector` inside our existing Postgres**
- `CREATE EXTENSION vector;`
- `title_embeddings (title_id PK, model text, dims int, content_hash text, embedding vector(1024), updated_at)`.
- Index: **HNSW** with cosine ops (`USING hnsw (embedding vector_cosine_ops)`). Query with `ORDER BY embedding <=> $1 LIMIT k`, **combined with normal SQL filters** (published, maturity rating ≤ profile limit, not completed). That combination is the main reason to keep vectors in Postgres.
- `chunk_embeddings` (optional, week 18) for subtitle/transcript chunks, to enable "find the scene where…".

**What gets embedded (the "document" per title):** a templated text block built from the title, genres, AI-enriched tags/moods ([ADR 0030](./0030-ai-media-enrichment-pipeline.md)), description, director and top cast, e.g.:
```
Title: In the Grey. Kind: movie. Year: 2026. Genres: Action, Thriller.
Moods: tense, slick. Themes: heist, betrayal. Director: Guy Ritchie. Cast: Jake Gyllenhaal, Henry Cavill.
Synopsis: A covert team of elite operatives…
```
`content_hash` = SHA-256 of that text, so a title is re-embedded **only when its document changes**.

**Provider: pluggable, behind an interface**
```ts
interface EmbeddingProvider {
  model: string; dims: number;
  embed(texts: string[], kind: "document" | "query"): Promise<number[][]>;
}
```
- **Local / free (default for learning):** an open-source embedding model run locally, e.g. via Ollama or `@huggingface/transformers` (choose a small, well-ranked model from the MTEB leaderboard, such as a `bge` or `nomic-embed` family model). No API costs, and you see the full pipeline.
- **Hosted (production option):** a hosted embeddings API (Voyage AI is the provider Anthropic's docs point to for embeddings; OpenAI, Cohere or Google also work). Pick by checking the current MTEB scores, price and dimensions *when you get to week 15*, and record the choice in a short ADR.
- Some models use different input types for **documents vs queries**. The interface's `kind` handles that.
- **Changing model = re-embedding everything.** The `model` column lets old and new vectors coexist during a backfill; queries only compare vectors from the same model.

**Pipeline:** an `embed-title` BullMQ job, triggered by an outbox event on title create/update ([ADR 0024](./0024-notifications-outbox.md)) and by enrichment completing; a nightly job catches stragglers. Batch 32–128 texts per call.

## Alternatives considered

| Option | Pros | Cons | Why not chosen |
|---|---|---|---|
| Dedicated vector DB (Qdrant, Weaviate, Pinecone) | Built for vectors; scales further. | Another system; filtering by our SQL rules means syncing data. | At thousands of titles pgvector is plenty; filters stay in SQL. |
| Brute-force cosine in Node | No extension. | O(n) per query; doesn't scale. | Fine as a first exercise, not for the product. |
| Asking the LLM for similar titles | No embeddings. | Expensive, slow, non-deterministic, can't search our catalogue. | Embeddings are the right tool for retrieval. |
| IVFFlat index | Smaller and faster to build. | Lower recall; needs training lists. | HNSW is the better default now. |

## Consequences

**Good:** semantic search and recommendations with SQL filters; one database; provider can be swapped.

**Bad / costs:** a re-embedding backfill whenever the model changes; vector indexes use memory; quality depends on the document template (iterate on it!).

## What you'll learn

- What embeddings are and why cosine similarity works.
- Approximate nearest neighbour (ANN) search and the HNSW index (recall vs speed: `ef_search`).
- Designing the text you embed; asymmetric (query vs document) retrieval.
- Backfills and versioning derived data.

## Done when

- [ ] Every published title has an embedding; editing a description triggers a re-embed (the hash changes) and nothing else is re-embedded.
- [ ] `similar(titleId)` returns sensible neighbours; write down 5 spot checks.
- [ ] `EXPLAIN ANALYZE` shows the HNSW index used, and the filter applied.
- [ ] Swapping the provider (local ↔ hosted) needs only config plus a backfill.

## References

- https://github.com/pgvector/pgvector
- https://huggingface.co/spaces/mteb/leaderboard
- https://docs.claude.com/en/docs/build-with-claude/embeddings
- HNSW paper (Malkov & Yashunin, 2016)
