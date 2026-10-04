# ADR 0020: Docker Compose for local development, GitHub Actions for CI, containers on a PaaS for deployment

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-10-04 |
| Phase | Week 1 (Compose), Week 9 (CI/CD, deploy) |
| Related | [ADR 0006](./0006-configuration-and-secrets.md), [ADR 0018](./0018-testing-strategy.md), [ADR 0019](./0019-observability.md) |

## Context

The backend depends on Postgres, Redis, object storage (MinIO), an SMTP catcher and ffmpeg. Installing all of that by hand on every machine is fragile. We also want every push tested automatically, and a repeatable deploy of **two processes** (API + worker) plus managed data services.

## Decision

**Local development: `docker-compose.yml`**

| Service | Image | Ports | Notes |
|---|---|---|---|
| postgres | `postgres:17` | 5432 | named volume `pgdata`; init script enables `citext`, `pg_trgm`, `unaccent` |
| redis | `redis:7` (or `valkey/valkey`) | 6379 | |
| minio | `minio/minio` | 9000 (S3), 9001 (console) | `mc` init container creates the buckets and CORS |
| mailpit | `axllent/mailpit` | 1025 (SMTP), 8025 (UI) | catches verification/reset emails |
| api (optional) | built from `Dockerfile` | 8080 | usually run on the host with `tsx watch` instead, for fast reloads |
| worker (optional) | same image, `node dist/worker.js` | — | needs ffmpeg in the image |

- `npm run dev` = API + worker with `tsx watch`; `npm run db:reset` = migrate + seed.

**Container image: multi-stage `Dockerfile`**
1. `deps`: `npm ci`.
2. `build`: `tsc`, `prisma generate`.
3. `runtime`: `node:<lts>-slim` + ffmpeg (worker target only), production deps only, `USER node` (non-root), `HEALTHCHECK` hitting `/health/live`.

One image with two commands (`node dist/server.js`, `node dist/worker.js`), or two build targets (`api`, `worker`) to keep ffmpeg out of the API image.

**CI: GitHub Actions** (`.github/workflows/ci.yml`), on every push and PR:
1. `npm ci` (with cache)
2. `lint` → `typecheck` → `test:unit`
3. `test:integration` (Testcontainers, which works on GitHub's Ubuntu runners)
4. `prisma migrate diff` check (migrations match the schema)
5. Build the Docker image; on `main`, push it to GHCR.

**CD (on `main`):**
- Target: **Fly.io** or **Railway** (simple container hosting with secrets and health checks) for the API and worker; **managed Postgres** (Neon/Supabase/Railway); **managed Redis** (Upstash/Railway); **Cloudflare R2** for media.
- **Release step:** `prisma migrate deploy` runs **before** the new version receives traffic.
- **Zero-downtime migrations:** expand → deploy code that handles both shapes → migrate data → contract in a later release. Never drop or rename a column in the same release as the code change.
- Rollback: redeploy the previous image tag. Migrations are forward-only in production, so write the "contract" step later.

**Backups:** daily `pg_dump` to R2 (a scheduled GitHub Action or the provider's backups), 14-day retention, **restore tested once in week 9**.

**Docs:** `RUNBOOK.md`: deploy, roll back, rotate secrets, scale workers, retry or clear stuck jobs, restore a backup, common alerts.

## Alternatives considered

| Option | Pros | Cons | Why not chosen |
|---|---|---|---|
| Install everything natively | No Docker. | "Works on my machine"; version drift. | Compose is reproducible. |
| Kubernetes | Industry standard at scale. | Huge learning curve; cost; overkill for 2 processes. | Learn it later; the concepts (probes, images, env) transfer from here. |
| A VPS + docker compose in production | Cheap; full control; teaches Linux ops. | You manage TLS, updates, backups and monitoring yourself. | A valid alternative! Choose it if you want more ops learning, and write a superseding ADR. |
| Serverless (Lambda/Vercel functions) | Scales to zero. | Long transcodes and persistent queue workers don't fit; cold starts. | The workload is wrong for it. |

## Consequences

**Good:** one command for the full local stack; every push tested; repeatable, reversible deploys; production mirrors local.

**Bad / costs:** Docker resource use on a laptop; some cloud cost (keep to free tiers, set billing alerts); one more YAML dialect.

## What you'll learn

- Containers: images, layers, caching, multi-stage builds, non-root users.
- Compose networking (service names as hostnames).
- CI/CD pipelines and what "green main" means.
- Release engineering: migration ordering, rollbacks, zero-downtime deploys.
- Backups that are only real once you've tested a restore.

## Done when

- [ ] A fresh clone → `docker compose up -d && npm i && npm run db:reset && npm run dev` works in under 10 minutes.
- [ ] A PR with a failing test cannot be merged (branch protection).
- [ ] Merge to `main` → deployed automatically; `/health/ready` is green on the live URL.
- [ ] Database restored from a backup into a scratch database, and row counts verified.
- [ ] `RUNBOOK.md` exists and you've followed it once end to end.

## References

- https://docs.docker.com/build/building/multi-stage/
- https://docs.docker.com/compose/
- https://docs.github.com/en/actions
- https://fly.io/docs/ · https://docs.railway.com
- Expand/contract migrations: https://www.prisma.io/dataguide/types/relational/expand-and-contract-pattern
