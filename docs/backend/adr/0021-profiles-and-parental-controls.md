# ADR 0021: Multiple viewing profiles per account; personal data belongs to the profile, not the user

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-10-04 |
| Phase | Week 10 |
| Related | [PRD §5.9](../PRD.md#59-profiles-and-parental-controls), amends [ADR 0015](./0015-watch-progress-and-events.md), [ADR 0010](./0010-authorization-roles.md) |

## Context

Streaming accounts are usually shared by a household. If everyone uses one identity, recommendations and Continue Watching mix everybody's taste ("why is a cartoon in my trending?"). Kids need a profile limited by maturity rating. Weeks 1–9 attach progress, bookmarks and events to `user_id`, so adding profiles later means **moving data to a new owner**. That's a realistic schema migration, and a good thing to learn.

## Decision

- New table `profiles (id, user_id FK, name, avatar_key, is_kids bool, max_maturity_rating enum, language, created_at)`. Up to **5 profiles per user**. A default profile is created at sign-up.
- **Personal data moves to `profile_id`:** `watch_progress`, `bookmarks`, `ratings`, `lists`, `view_events`, `notifications`, `taste_vectors` ([ADR 0027](./0027-ai-recommendations-hybrid.md)). The **account** (billing, email, sessions) stays on `users`.
- **Active profile:** the client picks one with `POST /me/profiles/:id/select`. The server puts `pid` (profile id) into the access token's claims; `requireProfile` middleware rejects `/me/*` personal routes without one. Switching profile = a new access token, no re-login.
- **Parental controls:**
  - Kids profiles see only videos with rating ≤ `max_maturity_rating`. The filter goes in the **same base query** that hides drafts ([ADR 0010](./0010-authorization-roles.md)), so search, trending, recommendations and the AI assistant all obey it.
  - An optional 4-digit **profile PIN** (hashed with Argon2id, rate-limited) to enter adult profiles or leave the kids profile.
- **Migration plan (expand/contract, practised for real):**
  1. Add `profiles`; create a default profile for every existing user.
  2. Add a nullable `profile_id` to the personal tables; backfill it from the user's default profile in batches.
  3. Make it `NOT NULL`, switch the composite keys from `(user_id, video_id)` to `(profile_id, video_id)`, and change the code.
  4. A later release drops the `user_id` columns that are no longer needed.

## Alternatives considered

| Option | Pros | Cons | Why not chosen |
|---|---|---|---|
| No profiles | Simple. | Mixed taste ruins AI recommendations; no kids safety. | Profiles are what make the AI work worthwhile. |
| Profiles as separate user accounts | No new concept. | Separate logins and billing; household can't be managed together. | Not how households work. |
| Profile id passed per request (header/param) | Stateless. | Easy to forget; IDOR risk if not checked against the user. | Putting it in the token is checked once and is consistent. |

## Consequences

**Good:** per-person taste and history; safe kids experience; a real data migration on a live schema.

**Bad / costs:** every personal query gains a `profile_id`; a token must be re-issued on profile switch; the migration has to be done carefully.

## What you'll learn

- Multi-tenant-ish data ownership (account → profiles → data).
- Zero-downtime schema migrations with backfills.
- Pushing a security rule (maturity rating) down into a single shared query.

## Done when

- [ ] The migration runs against a copy of the database with seeded data and loses no rows (counts compared before and after).
- [ ] A kids profile never sees an R-rated title in any endpoint (test each: list, search, trending, related, assistant tools).
- [ ] Two profiles on one account have independent Continue Watching and bookmarks.

## References

- https://www.prisma.io/dataguide/types/relational/expand-and-contract-pattern
- https://www.postgresql.org/docs/current/ddl-alter.html
