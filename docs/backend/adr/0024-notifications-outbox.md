# ADR 0024: Notifications through a transactional outbox, delivered to in-app (SSE), email and web push channels

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-10-04 |
| Phase | Week 12 |
| Related | [PRD §5.12](../PRD.md#512-notifications), [ADR 0023](./0023-realtime-websockets-watch-party.md), [ADR 0013](./0013-transcoding-pipeline-job-queue.md) |

## Context

Things worth telling a user about happen inside other operations:

- "New episode of a series you watch" happens when an admin publishes an episode.
- "A title on your list is leaving next week" comes from a scheduled job.
- "Your friend started a watch party" happens when a party is created.
- "Payment failed" arrives with a Stripe webhook ([ADR 0025](./0025-payments-stripe.md)).
- A weekly "Picked for you" email digest comes from the AI recommendations ([ADR 0027](./0027-ai-recommendations-hybrid.md)).

The classic bug is the **dual write**: save to the DB, then send to the queue; if the process crashes between the two, the notification is lost (or sent for a change that rolled back).

## Decision

**Transactional outbox**
- Producers write an `outbox_events (id, type, payload jsonb, created_at, processed_at)` row **in the same DB transaction** as the business change (e.g. publishing an episode).
- A relay (a worker loop every 1 second, `SELECT … FOR UPDATE SKIP LOCKED LIMIT 100`) moves outbox rows onto BullMQ and marks them processed. This gives at-least-once delivery, so consumers must be **idempotent** (dedupe key = `outbox_events.id`).

**Fan-out and channels**
- A `notify` job works out the recipients (e.g. profiles that watched the series in the last 60 days) and creates `notifications (id, profile_id, type, title, body, link, read_at, created_at)` rows.
- **Preferences:** `notification_prefs (profile_id, type, in_app, email, push)`. Defaults: in-app on, email digest weekly, push off until the user opts in.
- **Channels:**
  - **In-app:** SSE stream `GET /me/notifications/stream` (Redis pub/sub to whichever instance holds the connection), plus `GET /me/notifications` (paginated) and `POST /me/notifications/read`.
  - **Email:** templated (React Email or MJML) and sent via an SMTP provider (Mailpit locally, Resend/Postmark/SES in production). Batch into digests; respect unsubscribe (one-click `List-Unsubscribe` header).
  - **Web push:** the Push API with VAPID keys (`web-push` package); a service worker in the Next.js app; store `push_subscriptions` per device and delete them on 410 Gone.
- **Throttling:** at most N pushes per profile per day; quiet hours by profile time zone.

## Alternatives considered

| Option | Pros | Cons | Why not chosen |
|---|---|---|---|
| Send directly inside the request | Simple. | Slow requests; lost on failure; dual-write bug. | The outbox fixes correctness. |
| Enqueue to BullMQ inside the transaction | Fewer tables. | Redis isn't part of the Postgres transaction; still a dual write. | Same bug in disguise. |
| Change data capture (Debezium, logical replication) | No outbox table. | Heavy infrastructure. | Overkill here. |
| Hosted notification service (Knock, Novu, OneSignal) | Fast. | Cost; hides the pattern. | The "buy" option. |

## Consequences

**Good:** no lost or phantom notifications; channels are pluggable; a pattern you'll reuse for webhooks, search sync and analytics.

**Bad / costs:** more moving parts (outbox, relay, fan-out); idempotency must be designed in; push needs HTTPS and a service worker.

## What you'll learn

- The dual-write problem and the transactional outbox pattern.
- `FOR UPDATE SKIP LOCKED` as a simple queue in Postgres.
- At-least-once delivery and idempotent consumers.
- Email deliverability basics (SPF/DKIM/DMARC, unsubscribe) and the Web Push protocol.

## Done when

- [ ] Kill the worker between "episode published" and delivery → the notification still arrives after restart, exactly once.
- [ ] Rolling back a transaction produces no notification.
- [ ] An open tab shows a new notification within 2 seconds of publishing.
- [ ] Opting out of email stops the digest.

## References

- https://microservices.io/patterns/data/transactional-outbox.html
- https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE
- https://developer.mozilla.org/en-US/docs/Web/API/Push_API
- https://github.com/web-push-libs/web-push
