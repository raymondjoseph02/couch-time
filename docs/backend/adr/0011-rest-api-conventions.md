# ADR 0011: REST API conventions: versioned paths, cursor pagination, idempotent writes, OpenAPI docs

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-10-04 |
| Phase | Week 2 |
| Related | [PRD §7](../PRD.md#7-api-contract), [ADR 0007](./0007-validation-and-error-format.md) |

## Context

The frontend already calls `/api/v1/videos/...`. With ~50 endpoints coming, we need consistent rules so the API is predictable, the frontend code stays simple, and the API stays documented without hand-maintaining docs.

## Decision

**Style:** resource-oriented REST over JSON.

| Topic | Rule |
|---|---|
| Versioning | URL prefix `/api/v1`. Breaking changes → `/api/v2` (adding fields is not breaking). |
| Naming | Plural nouns (`/videos`), kebab-case paths (`/continue-watching`), camelCase JSON fields. |
| Current user | `/me/...` ([ADR 0010](./0010-authorization-roles.md)). |
| Methods | `GET` read · `POST` create/action · `PUT` idempotent create-or-replace · `PATCH` partial update · `DELETE` remove. |
| Idempotency | `PUT /me/bookmarks/:id` and `PUT /me/progress/:id` can be retried safely; `DELETE` of something missing → 204. |
| Pagination | **Cursor-based**: `?limit=20&cursor=<opaque>` → `{ items, nextCursor }`. The cursor is base64 of the last item's sort key + id. Max `limit` 100. |
| Filtering/sorting | Query params: `?genre=action&sort=popular`. Unknown values → 400. |
| Dates | ISO 8601 UTC strings. |
| Status codes | 200, 201 (+ `Location`), 204, 400, 401, 403, 404, 409, 422, 429, 500. |
| Errors | Problem Details ([ADR 0007](./0007-validation-and-error-format.md)). |
| Caching | `Cache-Control` on public reads (`/genres`: `public, max-age=300`); `private, no-store` on `/me`. ETags on video details (P1). |
| Rate-limit headers | `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`, plus `Retry-After` on 429. |
| Request ID | `X-Request-Id` accepted or generated, and echoed back in responses. |

**Documentation:** generate **OpenAPI 3.1** from the Zod schemas (`@asteasolutions/zod-to-openapi`), served as JSON at `/openapi.json` with Swagger UI or Scalar at `/docs` (dev and staging only). Optionally generate a typed frontend client from it (P2).

## Alternatives considered

| Option | Pros | Cons | Why not chosen |
|---|---|---|---|
| GraphQL | The client picks fields; one endpoint. | Caching, auth per field, N+1 handling: a lot to learn at once. | REST first; GraphQL is a good later experiment. |
| tRPC | End-to-end types with Next.js. | Couples the frontend tightly; non-TS clients are harder. | REST plus OpenAPI keeps the API usable by anything. |
| Offset pagination (`?page=3`) | Simple; jump to any page. | Slow on big tables; duplicates or skips when rows are inserted. | Cursors are correct for feeds and history. |
| Hand-written docs | Full control. | Always out of date. | Generated from the same schemas that validate. |

## Consequences

**Good:** predictable endpoints; safe retries; stable pagination; always-current docs.

**Bad / costs:** cursors can't jump to "page 7" (fine for this UI); OpenAPI generation needs some schema metadata.

## What you'll learn

- REST semantics and what makes a good API.
- Idempotency and why retries need it.
- How cursor pagination works internally (`WHERE (created_at, id) < ($1, $2) ORDER BY created_at DESC, id DESC LIMIT $3`).
- HTTP caching headers.

## Done when

- [ ] `/docs` lists every endpoint with request and response schemas.
- [ ] Bookmarks pagination test: insert while paging; no duplicates and no gaps.
- [ ] Calling `PUT /me/bookmarks/:id` twice leaves one row.

## References

- https://learn.openapis.org
- https://slack.engineering/evolving-api-pagination-at-slack/
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching
- https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/
