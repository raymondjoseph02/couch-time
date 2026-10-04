# ADR 0019: Structured JSON logs with request IDs, health endpoints and Prometheus metrics

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-10-04 |
| Phase | Week 1 (logs, request id), Week 8 (health, metrics) |
| Related | [ADR 0007](./0007-validation-and-error-format.md), [ADR 0013](./0013-transcoding-pipeline-job-queue.md) |

## Context

Earlier in this project, a request hung for ~70 seconds (`manifestLoadTimeOut`, then `ERR_CONNECTION_RESET`) and the only way to diagnose it was `curl` plus guessing. In production you can't attach a debugger. You need to answer questions like these from data:

- Why did *this* user's request fail? → logs, correlated by request ID.
- Is the system healthy right now? → health checks.
- Is it getting slower? Is the transcode queue backing up? → metrics.

## Decision

**Logging: `pino` + `pino-http`**
- JSON logs to stdout (the platform collects them); `pino-pretty` only in dev.
- Every request gets a **request ID** (`X-Request-Id` header if present, else a UUID), attached to the logger via `AsyncLocalStorage` so **every log line in that request** carries it, including inside services. It is returned in the response header and in error bodies ([ADR 0007](./0007-validation-and-error-format.md)).
- Per request, log method, route, status, duration in ms and user id (if any). Never log bodies by default.
- **Redact:** `req.headers.cookie`, `req.headers.authorization`, `*.password`, `*.token`, `*.refreshToken`, `*.signature`.
- Levels: `error` (needs action), `warn` (degraded, e.g. Redis down), `info` (lifecycle, requests), `debug` (dev only).
- Worker jobs log with `jobId` and `videoId` fields.

**Health**
- `GET /health/live`: the process is up (always 200 unless the event loop is wedged). Used by the orchestrator to restart.
- `GET /health/ready`: checks Postgres (`SELECT 1`), Redis (`PING`) and storage (`HeadBucket`) with 1-second timeouts; returns 503 if any fail. Used by the load balancer to stop sending traffic.
- **Graceful shutdown** on `SIGTERM`: mark not-ready → stop accepting connections → finish in-flight requests (10-second cap) → close Prisma, Redis and the queue.

**Metrics: `prom-client`, `GET /metrics`** (internal only, not exposed publicly)
- RED metrics per route: `http_requests_total{route,method,status}` and the `http_request_duration_seconds` histogram.
- Node defaults: event loop lag, heap, GC.
- Business: `transcode_jobs_total{status}`, `transcode_duration_seconds`, `queue_waiting_jobs`, `auth_signin_total{result}`, `progress_saves_total`.
- Visualise locally with Grafana + Prometheus in a `docker-compose.observability.yml` (optional), or a hosted free tier.

**Error tracking (P1):** Sentry (free tier) for unhandled exceptions, with the request ID attached.

**Tracing (P2 / stretch):** OpenTelemetry auto-instrumentation for HTTP, Prisma and Redis to see where time goes inside a request.

## Alternatives considered

| Option | Pros | Cons | Why not chosen |
|---|---|---|---|
| `console.log` | Built in. | Unstructured, no levels, slow, no correlation. | Can't search or filter in production. |
| winston | Popular, flexible. | Slower; more config. | pino is faster and simpler. |
| A full APM (Datadog, New Relic) | Everything in one place. | Cost; hides the fundamentals. | Learn the pieces first. |

## Consequences

**Good:** any production error can be traced from the user's screen (requestId) to the exact log lines; the platform can auto-restart and route around unhealthy instances; you can *see* performance.

**Bad / costs:** some setup; metrics endpoints must not be public; label cardinality must be kept low (use route templates like `/videos/:id`, never raw URLs).

## What you'll learn

- Structured logging and correlation IDs; `AsyncLocalStorage`.
- Liveness vs readiness.
- The RED and USE methods; histograms and percentiles.
- Graceful shutdown and why it matters for zero-downtime deploys.

## Done when

- [ ] Triggering a 500 → the error body's `requestId` finds the full stack in the logs with one search.
- [ ] Stopping Postgres → `/health/ready` returns 503 within 2 seconds; `/health/live` still returns 200.
- [ ] `SIGTERM` during a slow request → the request completes, then the process exits cleanly.
- [ ] A dashboard (or saved queries) shows p95 latency per route and queue depth.

## References

- https://getpino.io
- https://nodejs.org/api/async_context.html#class-asynclocalstorage
- https://github.com/siimon/prom-client
- RED method: https://grafana.com/blog/2018/08/02/the-red-method-how-to-instrument-your-services/
- Kubernetes probes (concepts apply everywhere): https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
