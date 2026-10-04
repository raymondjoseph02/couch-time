# ADR 0005: Prisma for database access and schema migrations

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-10-04 |
| Phase | Week 2 |
| Related | [ADR 0004](./0004-postgresql-database.md) |

## Context

With PostgreSQL chosen, we need a way to:

1. Define and evolve the schema over 9 weeks (≈15 tables), safely and repeatably on every machine and in CI.
2. Query from TypeScript with types that match the tables.
3. Still write raw SQL where an ORM gets in the way (search ranking, trending aggregation).

## Decision

We will use **Prisma ORM**:

- `prisma/schema.prisma` is the source of truth for tables.
- `prisma migrate dev` creates SQL migration files during development. **Commit them, and review the generated SQL every time.**
- `prisma migrate deploy` runs in CI and on release ([ADR 0020](./0020-local-dev-ci-deployment.md)). Never run `db push` in production.
- Use the typed client for normal CRUD, and **`prisma.$queryRaw` with tagged templates** (parameterised, safe) for search, trending and anything with window functions.
- Things Prisma's schema can't express (generated `tsvector` columns, partial indexes, trigram indexes) go into **hand-edited migration SQL**.
- One shared `PrismaClient` instance per process (`lib/prisma.ts`), closed on shutdown.
- `prisma/seed.ts` creates the dev catalogue (30+ videos, genres, people, one admin).

## Alternatives considered

| Option | Pros | Cons | Why not chosen |
|---|---|---|---|
| Drizzle | SQL-like API; lightweight; great types. | Less hand-holding on migrations; fewer tutorials. | Strong option. Prisma's migration workflow is gentler for a first backend. Worth trying in a later project. |
| Kysely (query builder) | Typed SQL; no magic. | You write all the schema/migration tooling yourself. | More SQL practice, but slower progress. |
| Raw `pg` driver | Maximum SQL learning. | Manual types; easy to forget parameterisation. | Use it in the week 2 exercises, not for the whole app. |
| TypeORM / Sequelize | Mature. | Weaker types (TypeORM decorators drift); older patterns. | Prisma or Drizzle are the modern defaults. |

## Consequences

**Good:** typed queries; reviewed, versioned migrations; quick CRUD; raw SQL is available when needed.

**Bad / costs:** some features need raw SQL migrations; it's easy to cause **N+1 queries** (a loop of `findUnique` calls), so watch the query logs; Prisma hides SQL, so you must read the generated SQL on purpose to learn.

## What you'll learn

- Migrations as code: why every environment applies the same ordered scripts.
- Safe schema changes on live data: add a nullable column → backfill → make it required (expand/contract).
- SQL injection, and why tagged-template `$queryRaw` is safe while string concatenation is not.
- The N+1 problem and how `include`/`select` fix it.

## Done when

- [ ] `npx prisma migrate reset` rebuilds the database and seeds it from scratch.
- [ ] Prisma query logging is on in dev, and you've removed at least one N+1 you caused.
- [ ] Exercise: write a migration that renames a column with zero downtime (two migrations, expand then contract).

## References

- https://www.prisma.io/docs/orm/prisma-migrate
- https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries
- https://orm.drizzle.team (for comparison)
