# ADR 0010: Role-based access (`viewer`, `admin`) plus ownership checks in services

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-10-04 |
| Phase | Week 4 |
| Related | [PRD §3](../PRD.md#3-users-and-roles), [ADR 0008](./0008-authentication-jwt-cookies.md) |

## Context

Authentication answers *who are you*; authorization answers *what may you do*. We have three kinds of caller (guest, viewer, admin), and per-user data (progress, bookmarks, sessions) that must only ever be read or changed by its owner. **Broken object-level authorization** (user A reading user B's data by changing an id in the URL) is the #1 risk in the OWASP API Top 10.

## Decision

1. **Roles:** a `users.role` enum with `viewer` (default) and `admin`. The role goes into the access token claims, so most checks need no database lookup.
2. **Route-level middleware:**
   - `optionalAuth`: attaches `req.user` if a valid token is present (for "G" routes that add per-user fields).
   - `requireAuth`: 401 if not signed in.
   - `requireRole('admin')`: 403 if the role doesn't match. Applied once to the whole `/admin` router.
3. **Object-level checks live in services, by construction:** per-user routes live under `/me/...` and take the user id **only from the token**, never from the URL or body. For example `bookmarkService.add(userId = req.user.id, videoId)`. Users simply can't address someone else's rows.
4. **Visibility rules** (drafts and unpublished videos) are enforced in the video repository's base query (`publishedOnly` unless the caller is an admin), so search, trending and related videos can't leak drafts.
5. **Promoting admins:** a CLI script (`npm run user:promote -- email@x.com`). There is no API to self-promote.

## Alternatives considered

| Option | Pros | Cons | Why not chosen |
|---|---|---|---|
| Fine-grained permissions (`video:publish`, `user:read`) | Flexible. | Overkill for two roles. | Upgrade path if roles multiply (write a new ADR). |
| Policy engine (Casbin, OPA) | Powerful, declarative. | Another system to learn. | Too much for v1. |
| Read the role from the DB on every request | Role changes apply instantly. | A query per request. | A 15-minute delay is acceptable; force a re-login on demotion by revoking sessions. |

## Consequences

**Good:** simple and auditable; the `/me` design removes a whole class of IDOR bugs; draft leaks are prevented in one place.

**Bad / costs:** role changes apply on the next token refresh (up to 15 minutes); if roles grow, this needs revisiting.

## What you'll learn

- 401 vs 403.
- IDOR / BOLA vulnerabilities and designing APIs that prevent them.
- "Secure by default" query design.

## Done when

- [ ] Integration tests: guest → 401 on `/me/*`; viewer → 403 on `/admin/*`; a draft video → 404 for viewers and 200 for admins.
- [ ] No `/me` route accepts a `userId` parameter.

## References

- OWASP API Security Top 10, API1 (BOLA): https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/
- OWASP Authorization Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
