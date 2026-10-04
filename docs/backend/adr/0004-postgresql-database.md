# ADR 0004: PostgreSQL as the primary database

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-10-04 |
| Phase | Week 2 |
| Related | [PRD §6](../PRD.md#6-data-model), [ADR 0005](./0005-prisma-orm-and-migrations.md), [ADR 0017](./0017-search-postgres-full-text.md) |

## Context

Everything in `server.js` lives in JavaScript objects (`videos`, `views`, `progress`) and is lost on restart. The data is strongly **relational**:

- Videos ↔ genres (many-to-many), videos ↔ people (many-to-many with a role).
- Users → progress, bookmarks and sessions (one-to-many), with uniqueness rules like "one progress row per user and video".
- We need **transactions** (e.g. create user + identity + settings together) and **constraints** (no bookmark for a video that doesn't exist).

We also want full-text search ([ADR 0017](./0017-search-postgres-full-text.md)) and aggregation for trending, ideally without extra infrastructure.

## Decision

We will use **PostgreSQL** (the current major version, e.g. 17) as the single source of truth.

- Locally: the official Docker image in `docker-compose.yml`, with a named volume.
- Tests: a throwaway Postgres per test run via Testcontainers ([ADR 0018](./0018-testing-strategy.md)).
- Production: a managed Postgres (Neon, Supabase, Railway or RDS) with automated backups.
- Extensions: `citext` (case-insensitive email), `pg_trgm` (typo-tolerant search) and `unaccent`.
- IDs: **UUIDv7**, which is time-ordered so it indexes well, and is not guessable like `1, 2, 3`.
- All timestamps are `timestamptz`, stored in UTC.

## Alternatives considered

| Option | Pros | Cons | Why not chosen |
|---|---|---|---|
| MongoDB | Flexible documents; easy start. | Relations (genres, credits, progress) become manual joins or duplicated data; weaker constraints. | The data is relational. Learning SQL is a core goal. |
| MySQL | Popular, fine for this. | Weaker full-text search and fewer handy extensions/types (`citext`, arrays, `tsvector`). | Postgres covers search too, so it's one less system. |
| SQLite | Zero setup. | Single writer; not what you'd deploy for a multi-instance API. | Fine for a toy, not for the production lessons we want. |
| Firebase Firestore | Already using Firebase. | No joins, no SQL; vendor lock-in; hard to do trending aggregations. | Doesn't teach backend fundamentals. |

## Consequences

**Good:** strong integrity (foreign keys, unique constraints, check constraints); transactions; one database for data, search and analytics at this scale; SQL is the most transferable backend skill.

**Bad / costs:** you must design schemas and write migrations; heavy analytics on `view_events` could need partitioning later (a week 8 stretch goal).

## What you'll learn

- SQL: `SELECT`/`JOIN`/`GROUP BY`/window functions. Write them by hand in `psql` before using the ORM.
- Normalisation (1NF to 3NF) and when to denormalise (e.g. copying `duration_seconds` into `watch_progress`).
- Indexes: B-tree vs GIN; partial indexes; reading `EXPLAIN ANALYZE`.
- Transactions and isolation levels (read committed vs serializable). Try causing a race on bookmark insert without a unique constraint.

## Done when

- [ ] `docker compose up postgres` works and the data survives a restart (the volume).
- [ ] Exercise: write the Continue Watching query in raw SQL, then with Prisma, and compare the generated SQL.
- [ ] Exercise: seed 100k `view_events` rows and show a query plan using your index.

## References

- https://www.postgresql.org/docs/current/tutorial.html
- https://use-the-index-luke.com
- https://www.postgresql.org/docs/current/pgtrgm.html
