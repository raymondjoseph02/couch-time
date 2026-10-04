# ADR 0025: Subscriptions with Stripe Checkout and the Customer Portal; webhooks are the source of truth for entitlements

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-10-04 |
| Phase | Week 14 |
| Related | [PRD §5.14](../PRD.md#514-subscriptions-and-payments), [ADR 0024](./0024-notifications-outbox.md), [ADR 0010](./0010-authorization-roles.md) |

## Context

Payments were a non-goal in v1.0. Adding them teaches some of the most valuable real-world backend skills: **webhooks, idempotency, eventual consistency, and never trusting the client**. Plans for this project:

| Plan | Price (test mode) | Gets |
|---|---|---|
| Free | €0 | Trailers, 1 profile, 720p max, AI assistant 5 messages/day |
| Standard | €6.99/month | Full catalogue, 3 profiles, 1080p, 2 parallel streams, AI 50/day |
| Premium | €11.99/month | 5 profiles, 1080p + (future 4K), 4 parallel streams, watch parties, AI unlimited* |

\* with fair-use rate limits.

## Decision

- **Stripe in test mode only.** No real money; use the Stripe CLI to forward webhooks locally (`stripe listen --forward-to localhost:8080/api/v1/billing/webhook`).
- **Checkout:** `POST /billing/checkout { plan }` creates a Stripe **Checkout Session** (mode `subscription`) and returns its URL. Card details never touch our servers (PCI scope stays minimal).
- **Self-service:** `POST /billing/portal` → a Stripe **Customer Portal** URL (change plan, update card, cancel, see invoices).
- **Webhooks are the truth:** `POST /billing/webhook` (raw body!) verifies the `Stripe-Signature` header, then handles `checkout.session.completed`, `customer.subscription.created|updated|deleted` and `invoice.payment_failed|paid`.
  - Store `stripe_events (id PK, type, received_at)`. If the id is already there, skip it. Webhooks are delivered **at least once** and **out of order**, so always re-fetch the subscription from Stripe and write its current state rather than applying deltas.
  - Upsert `subscriptions (user_id, stripe_customer_id, stripe_subscription_id, plan, status, current_period_end, cancel_at_period_end)`.
  - Emit outbox events (e.g. `payment_failed` → notification + email) ([ADR 0024](./0024-notifications-outbox.md)).
- **Entitlements:** one function `getEntitlements(user)` → `{ maxProfiles, maxQuality, maxStreams, watchParty, aiDailyMessages }`, derived from the plan + status (`active`, `trialing`, a `past_due` grace period of 3 days). **Every** gated feature calls it; it is cached in Redis for 60 seconds and invalidated by webhooks.
- **Concurrent streams:** each playback session sends a heartbeat (`POST /videos/:id/heartbeat` every 30 seconds) to a Redis sorted set `streams:{userId}`; starting a new stream over the limit returns 403 with a "too many screens" problem type.
- **Idempotency keys** on our own outgoing Stripe calls (`idempotencyKey: checkout:{userId}:{plan}:{day}`).

## Alternatives considered

| Option | Pros | Cons | Why not chosen |
|---|---|---|---|
| Build card forms with Stripe Elements | Custom UX. | More frontend and PCI work. | Checkout is safer and faster. |
| Trust the redirect `?success=true` | Easy. | Anyone can visit that URL. | The webhook is the only proof. |
| Paddle / Lemon Squeezy (merchant of record) | They handle VAT. | Less learning about webhooks and state. | Stripe docs are the gold standard to learn from. |
| No payments | Simpler. | Misses a core real-world skill. | The user asked for more functionality. |

## Consequences

**Good:** realistic subscription logic; you'll handle retries, ordering and signatures properly; entitlements are centralised.

**Bad / costs:** more edge cases (downgrade with too many profiles → make the extras read-only; card failures; refunds); webhook endpoints must be excluded from JSON body parsing and CSRF checks.

## What you'll learn

- Webhook security (signature verification, replay windows) and idempotent processing.
- Eventual consistency between two systems; "fetch latest state" vs "apply delta".
- Modelling entitlements separately from billing.
- PCI basics and why hosted payment pages exist.

## Done when

- [ ] Subscribe with test card `4242 4242 4242 4242` → features unlock within seconds via the webhook.
- [ ] `stripe trigger invoice.payment_failed` → status `past_due`, notification sent, access kept for 3 days, then downgraded.
- [ ] Replaying the same webhook 5 times changes nothing after the first.
- [ ] A third concurrent stream on a 2-stream plan is refused.

## References

- https://docs.stripe.com/billing/subscriptions/build-subscriptions
- https://docs.stripe.com/webhooks
- https://docs.stripe.com/customer-management
- https://docs.stripe.com/api/idempotent_requests
- https://docs.stripe.com/stripe-cli
