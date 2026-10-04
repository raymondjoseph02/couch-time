# Step by Step: Building the Couch Time Backend

This is the **doing** list: small steps in order, with checkboxes. The **why** and the details live in the [PRD](./PRD.md) and the [ADRs](./adr/); each step links to the part you need. Accounts, tools and costs are in [EXTERNAL-NEEDS.md](./EXTERNAL-NEEDS.md).

**How to use it**
- Work top to bottom. Don't start a week until the previous week's **Check** step is ticked.
- When a step links to the PRD or an ADR, read that part *before* doing the step.
- The dates follow the [PRD delivery plan](./PRD.md#10-delivery-plan-18-weeks). If you need longer, shift everything; that's fine.

---

## Your weekly routine (every week)

1. Read the week's section in the PRD (*Build*, *Learn*, *Done when*).
2. Read the ADRs linked in it.
3. Do the steps below, committing small pieces as you go (`git commit` at least once a day you work).
4. Write tests as you go ([ADR 0018](./adr/0018-testing-strategy.md)).
5. Write one line per session in `docs/backend/LOG.md`: what you learned, what confused you.
6. Friday: tick the **Check** step and demo it to someone (or record a 2-minute video).

---

## Week 0: Prepare (before or alongside week 1)

**Goal:** tools installed, accounts ready, and enough SQL to not feel lost in week 2.

### A. Read
- [ ] 1. Read [README.md](./README.md) (5 min).
- [ ] 2. Read [PRD §1–4](./PRD.md#1-summary): what you're building and what's mock data today.
- [ ] 3. Look at the diagrams in [PRD §9](./PRD.md#9-system-architecture-target) until you can explain each box.
- [ ] 4. Read [ADR 0001](./adr/0001-record-architecture-decisions.md) (what an ADR is).

### B. Install ([EXTERNAL-NEEDS §2](./EXTERNAL-NEEDS.md#2-software-to-install-all-free))
- [ ] 5. Node.js LTS (check with `node -v`).
- [ ] 6. Docker Desktop (or OrbStack). Check with `docker run hello-world`.
- [ ] 7. A database GUI: TablePlus, DBeaver or pgAdmin.
- [ ] 8. An API client: Bruno, Insomnia or Postman.
- [ ] 9. ffmpeg: `brew install ffmpeg`.
- [ ] 10. VS Code extension *Markdown Preview Mermaid Support*.

### C. Accounts ([EXTERNAL-NEEDS §1](./EXTERNAL-NEEDS.md#1-accounts-and-online-services))
- [ ] 11. GitHub repo for the backend (new repo `couch-time-api`, or a `backend/` folder here; decide and note it, [PRD §13 Q1](./PRD.md#13-open-questions)).
- [ ] 12. TMDB account → request an API key (Settings → API → Developer).

### D. Learn SQL (new to relational databases? start here, 5–7 hours)
- [ ] 13. [SQLBolt](https://sqlbolt.com), lessons 1–12 (2–3 h).
- [ ] 14. [Select Star SQL](https://selectstarsql.com) (2 h).
- [ ] 15. Start Postgres in Docker and connect with your GUI:
  ```bash
  docker run --name pg-practice -e POSTGRES_PASSWORD=dev -p 5432:5432 -d postgres:17
  ```
- [ ] 16. Do the **Couch Time practice** below by hand.

<details>
<summary><b>Couch Time SQL practice</b> (click to open)</summary>

```sql
-- 1. Create tables
CREATE TABLE users  (id SERIAL PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE genres (id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL);
CREATE TABLE videos (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  year INT,
  playable BOOLEAN NOT NULL DEFAULT false
);
CREATE TABLE video_genres (           -- many-to-many
  video_id INT REFERENCES videos(id) ON DELETE CASCADE,
  genre_id INT REFERENCES genres(id) ON DELETE CASCADE,
  PRIMARY KEY (video_id, genre_id)
);
CREATE TABLE bookmarks (              -- many-to-many with extra data
  user_id  INT REFERENCES users(id)  ON DELETE CASCADE,
  video_id INT REFERENCES videos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);
CREATE TABLE watch_progress (
  user_id  INT REFERENCES users(id),
  video_id INT REFERENCES videos(id),
  position_seconds INT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);

-- 2. Insert data
INSERT INTO users (name) VALUES ('Raymond'), ('Ekene');
INSERT INTO genres (name) VALUES ('Fantasy'), ('Comedy'), ('Horror');
INSERT INTO videos (title, year, playable) VALUES
  ('Sintel', 2010, true), ('Big Buck Bunny', 2008, true),
  ('Night of the Living Dead', 1968, true), ('Interstellar', 2014, false);
INSERT INTO video_genres VALUES (1,1), (2,2), (3,3);
INSERT INTO bookmarks (user_id, video_id) VALUES (1,1), (1,4), (2,2);
INSERT INTO watch_progress (user_id, video_id, position_seconds) VALUES (1,1,300), (2,3,1200);
```

Now write queries for these yourself (answers aren't given on purpose):
1. All playable videos, newest first.
2. Raymond's bookmarked video titles (needs a `JOIN`).
3. Each genre with how many videos it has (`GROUP BY`, `COUNT`).
4. Videos nobody has bookmarked (`LEFT JOIN … WHERE … IS NULL`).
5. Save progress: insert, or update if the row exists (`INSERT … ON CONFLICT … DO UPDATE`).
6. Try inserting a bookmark for video `999`. Why does it fail? (Foreign key.)
7. Try bookmarking the same video twice. Why does it fail? (Primary key.)
8. Delete *Sintel*. What happened to its bookmarks? (`ON DELETE CASCADE`.)

</details>

- [ ] 17. **Check:** you can explain *primary key*, *foreign key*, *JOIN* and *many-to-many*, and you did queries 1–8.

---

## Phase 1: Core platform

### Week 1: Foundations → [PRD week 1](./PRD.md#week-1-foundations-511-october)

Read first: [ADR 0002](./adr/0002-nodejs-typescript-runtime.md), [0003](./adr/0003-express-layered-architecture.md), [0006](./adr/0006-configuration-and-secrets.md), [0019](./adr/0019-observability.md) (logging part), [0020](./adr/0020-local-dev-ci-deployment.md) (Compose part).

- [ ] 1. Create the project:
  ```bash
  mkdir couch-time-api && cd couch-time-api && git init
  npm init -y && npm pkg set type=module
  npm i express zod pino pino-http
  npm i -D typescript tsx @types/node @types/express vitest supertest @types/supertest eslint prettier
  npx tsc --init   # then turn on "strict": true
  ```
- [ ] 2. Write your **first ADR yourself**: which package manager and why ([template](./adr/0000-template.md)).
- [ ] 3. Create the folder layout from [PRD §9](./PRD.md#9-system-architecture-target) (`src/app.ts`, `src/server.ts`, `src/config/`, `src/modules/`…).
- [ ] 4. `src/config/index.ts`: load env with Zod and exit on missing values; create `.env` and `.env.example`, and add `.env` to `.gitignore` ([ADR 0006](./adr/0006-configuration-and-secrets.md)).
- [ ] 5. pino logger + request-ID middleware; `GET /health/live`.
- [ ] 6. `docker-compose.yml` with Postgres, Redis, MinIO and Mailpit ([ADR 0020](./adr/0020-local-dev-ci-deployment.md)); `docker compose up -d`.
- [ ] 7. Port your current `server.js` routes into `src/modules/videos/` (still in-memory) so the frontend keeps working.
- [ ] 8. First test: `GET /health/live` returns 200 (Vitest + Supertest).
- [ ] 9. Point the frontend's `src/api/index.ts` at the new server; click through the app.
- [ ] 10. **Check:** [week 1 "Done when"](./PRD.md#week-1-foundations-511-october) ✅

### Week 2: Database and catalogue → [PRD week 2](./PRD.md#week-2-database-and-catalogue-1218-october)

Read first: [ADR 0004](./adr/0004-postgresql-database.md), [0005](./adr/0005-prisma-orm-and-migrations.md), [0007](./adr/0007-validation-and-error-format.md), [0011](./adr/0011-rest-api-conventions.md), [0032](./adr/0032-catalogue-data-and-video-sources.md). Tables: [PRD §6.2](./PRD.md#62-tables).

- [ ] 1. Install Prisma (`npm i @prisma/client && npm i -D prisma && npx prisma init`).
- [ ] 2. Write the schema for `videos`, `genres`, `video_genres`, `people`, `video_credits`, `video_assets`, `subtitles`, **including the ADR 0032 columns** (`tmdb_id`, `stream_status`, `trailer_youtube_key`, `poster_path`, `license`…).
- [ ] 3. `npx prisma migrate dev`, then **open the generated SQL and read it**.
- [ ] 4. Write `npm run tmdb:import`: ~200 titles, upsert by `tmdb_id` ([PRD CAT-8](./PRD.md#53-catalogue)). Run it twice and confirm there are no duplicates.
- [ ] 5. Download your ~6 films ([EXTERNAL-NEEDS §3](./EXTERNAL-NEEDS.md#3-data-and-content-all-free)), convert each to HLS by hand:
  ```bash
  ffmpeg -i sintel.mp4 -c:v libx264 -preset veryfast -crf 23 -c:a aac \
    -hls_time 6 -hls_playlist_type vod -hls_segment_filename "sintel/seg_%03d.ts" sintel/index.m3u8
  ```
  then set `stream_status = 'ready'` and `license` for them.
- [ ] 6. Endpoints: `GET /videos` (filters + cursor pagination), `GET /videos/:idOrSlug`, `GET /genres`, `GET /videos/spotlight` ([PRD §7.3](./PRD.md#73-catalogue-and-discovery)), each returning `playable` + `trailer` ([PRD §7.5](./PRD.md#75-example-the-video-object)).
- [ ] 7. Zod validation + problem-details error handler ([ADR 0007](./adr/0007-validation-and-error-format.md)).
- [ ] 8. OpenAPI + Swagger UI at `/docs`.
- [ ] 9. Testcontainers integration tests for the endpoints.
- [ ] 10. Frontend: genre tabs from `/genres`; **Play/Resume** vs **Watch trailer** (YouTube embed) by `playable` ([PRD PLAY-6](./PRD.md#54-playback)); an About page with TMDB credit + licences.
- [ ] 11. Exercise: cause an N+1 query, see it in Prisma's logs, fix it with `include`.
- [ ] 12. **Check:** [week 2 "Done when"](./PRD.md#week-2-database-and-catalogue-1218-october) ✅ + milestone M2 ([PRD §11](./PRD.md#11-milestones)).

### Week 3: Authentication → [PRD week 3](./PRD.md#week-3-authentication-1925-october)

Read first: [ADR 0008](./adr/0008-authentication-jwt-cookies.md) (slowly, it's the most important security ADR). Requirements: [PRD §5.1](./PRD.md#51-accounts-and-authentication). Endpoints: [PRD §7.1](./PRD.md#71-auth).

- [ ] 1. Tables `users`, `auth_identities`, `sessions` ([PRD §6.2](./PRD.md#62-tables)).
- [ ] 2. Sign-up / sign-in with Argon2id.
- [ ] 3. Access JWT (15 min) + refresh token (30 days) in httpOnly cookies.
- [ ] 4. `/auth/refresh` with rotation + replay detection; write the replay test **first**.
- [ ] 5. `requireAuth` middleware; `GET /me`; sign-out and sign-out-all.
- [ ] 6. Rate-limit `/auth/*` (in-memory for now).
- [ ] 7. Frontend: wire up `SignInForm`/`SignUpForm`; finish the 401 → refresh → retry logic in `src/api/index.ts`.
- [ ] 8. **Check:** [week 3 "Done when"](./PRD.md#week-3-authentication-1925-october) ✅

### Week 4: Social and wallet sign-in, roles, email → [PRD week 4](./PRD.md#week-4-social-and-wallet-sign-in-roles-email-26-october--1-november)

Read first: [ADR 0009](./adr/0009-social-and-wallet-login.md), [0010](./adr/0010-authorization-roles.md).

- [ ] 1. Firebase service account → `POST /auth/google` with `firebase-admin`.
- [ ] 2. MetaMask: `/auth/wallet/nonce` + `/auth/wallet/verify` (SIWE + `viem`).
- [ ] 3. Roles + `requireRole('admin')`; `npm run user:promote` script.
- [ ] 4. Email verification + forgot/reset password, checked in Mailpit (http://localhost:8025).
- [ ] 5. `user_settings`, `/me/settings`, `/me/sessions` ([PRD §7.2](./PRD.md#72-me)).
- [ ] 6. Frontend: Google + MetaMask buttons; `/dashboard/account` and `/dashboard/setting` pages.
- [ ] 7. **Check:** [week 4 "Done when"](./PRD.md#week-4-social-and-wallet-sign-in-roles-email-26-october--1-november) ✅ + milestone M3.

### Week 5: Personal data, search, Redis → [PRD week 5](./PRD.md#week-5-personal-data-search-and-redis-28-november)

Read first: [ADR 0014](./adr/0014-redis-caching-and-rate-limiting.md), [0015](./adr/0015-watch-progress-and-events.md), [0017](./adr/0017-search-postgres-full-text.md). Requirements: [PRD §5.5–5.7](./PRD.md#55-watch-progress-and-history).

- [ ] 1. `watch_progress` with the out-of-order guard (the `ON CONFLICT … WHERE` from ADR 0015); playable titles only ([PRD PLAY-7](./PRD.md#54-playback)).
- [ ] 2. `/me/continue-watching`, `/me/history`; `progress`/`action`/`startAt` on every video response.
- [ ] 3. Bookmarks (`PUT`/`DELETE`/list) + `/me/import` for old `localStorage` data.
- [ ] 4. Redis: rate limits + caching for genres, spotlight and video details (with invalidation).
- [ ] 5. Search: `tsvector` column + `pg_trgm`; `/search` and `/search/suggest`.
- [ ] 6. Frontend: replace `VideoContext` localStorage and the `SearchBar` mock with API calls.
- [ ] 7. **Check:** [week 5 "Done when"](./PRD.md#week-5-personal-data-search-and-redis-28-november) ✅ + milestone M4.

### Week 6: Media upload and storage → [PRD week 6](./PRD.md#week-6-media-upload-and-storage-915-november)

Read first: [ADR 0012](./adr/0012-object-storage-for-media.md).

- [ ] 1. MinIO buckets `couchtime-sources` and `couchtime-media` + bucket CORS.
- [ ] 2. Move your 6 HLS films and `my-stream` into MinIO; remove `express.static('/stream')`.
- [ ] 3. `POST /admin/videos/:id/upload-url` (pre-signed PUT) + `upload-complete` (job stub).
- [ ] 4. `GET /videos/:id/playback` with signed URLs; 409 for non-playable titles.
- [ ] 5. **Write your own ADR:** how HLS segments get authorised (proxy vs signed cookies).
- [ ] 6. A small admin upload page; test with a large file (watch memory with `docker stats`).
- [ ] 7. **Check:** [week 6 "Done when"](./PRD.md#week-6-media-upload-and-storage-915-november) ✅

### Week 7: Transcoding pipeline → [PRD week 7](./PRD.md#week-7-transcoding-pipeline-1622-november)

Read first: [ADR 0013](./adr/0013-transcoding-pipeline-job-queue.md) (the step table is your checklist).

- [ ] 1. BullMQ queue + `src/worker.ts`.
- [ ] 2. Job steps: probe → 3 renditions → HLS → master playlist → poster → upload → DB update (`stream_status = 'ready'`).
- [ ] 3. Progress reporting from ffmpeg's `-progress` output.
- [ ] 4. Retries, the failed state, `POST /admin/jobs/:id/retry`.
- [ ] 5. Test idempotency: kill the worker mid-job and check it retries cleanly.
- [ ] 6. Test with Pexels/Pixabay clips first, then one Blender film.
- [ ] 7. **Check:** [week 7 "Done when"](./PRD.md#week-7-transcoding-pipeline-1622-november) ✅ + milestone M5.

### Week 8: Discovery, observability, hardening → [PRD week 8](./PRD.md#week-8-discovery-observability-and-hardening-2329-november)

Read first: [ADR 0016](./adr/0016-trending-and-recommendations.md), [0019](./adr/0019-observability.md).

- [ ] 1. `view_events` + `POST /videos/:id/events` (rate-limited, deduplicated).
- [ ] 2. Trending job (time decay) every 15 minutes.
- [ ] 3. `/videos/:id/related` (genres, then co-watch); remove the "You Might Also Like" placeholders.
- [ ] 4. `/health/ready`, `/metrics`, request logging with latency.
- [ ] 5. Security pass: Helmet, strict CORS, body limits, `npm audit`, OWASP API Top 10.
- [ ] 6. k6 load test; fix the slowest query (`EXPLAIN ANALYZE`); save the report in `docs/`.
- [ ] 7. **Check:** [week 8 "Done when"](./PRD.md#week-8-discovery-observability-and-hardening-2329-november) ✅

### Week 9: CI/CD and deployment → [PRD week 9](./PRD.md#week-9-cicd-and-deployment-30-november--4-december)

Read first: [ADR 0020](./adr/0020-local-dev-ci-deployment.md). Accounts: [EXTERNAL-NEEDS "deploy" table](./EXTERNAL-NEEDS.md#needed-to-deploy-week-9).

- [ ] 1. GitHub Actions: lint → typecheck → tests → Docker build.
- [ ] 2. Multi-stage Dockerfile (API and worker targets).
- [ ] 3. Create the production accounts (hosting, Postgres, Redis, R2, email, domain) and **set billing alerts**.
- [ ] 4. Production secrets in the platform's secret store ([EXTERNAL-NEEDS §4](./EXTERNAL-NEEDS.md#4-secrets-to-keep-never-commit-these)).
- [ ] 5. Deploy with `prisma migrate deploy` as a release step; frontend `baseURL` from `NEXT_PUBLIC_API_URL`.
- [ ] 6. Daily backups; **restore one** to prove it works.
- [ ] 7. Write `RUNBOOK.md`.
- [ ] 8. **Check:** [week 9 "Done when"](./PRD.md#week-9-cicd-and-deployment-30-november--4-december) ✅ + milestone **M6** 🎉 (Phase 1 is a complete product.)

---

## Phase 2: Product depth

### Week 10: Profiles, parental controls, ratings → [PRD week 10](./PRD.md#week-10-profiles-parental-controls-and-ratings-713-december)

Read first: [ADR 0021](./adr/0021-profiles-and-parental-controls.md). Requirements: [PRD §5.9–5.10](./PRD.md#59-profiles-and-parental-controls). Tables: [PRD §6.4](./PRD.md#64-additions-in-v11-phases-2-and-3).

- [ ] 1. **Back up the database** and rehearse the migration on a copy.
- [ ] 2. Expand: add `profiles` + nullable `profile_id`; backfill default profiles.
- [ ] 3. Switch the code to `profile_id`; contract in a later step.
- [ ] 4. Profile select (`pid` in the token), `requireProfile`, PIN.
- [ ] 5. Kids filter in the single base query + tests for every listing endpoint.
- [ ] 6. Ratings, "not interested", lists.
- [ ] 7. Frontend: "Who's watching?", switcher, thumbs.
- [ ] 8. **Check:** [week 10 "Done when"](./PRD.md#week-10-profiles-parental-controls-and-ratings-713-december) ✅

### Week 11: Series, episodes, audit log → [PRD week 11](./PRD.md#week-11-series-episodes-and-the-audit-log-1420-december)

Read first: [ADR 0022](./adr/0022-series-and-episodes-model.md), [0031](./adr/0031-experiments-and-feature-flags.md) (audit part).

- [ ] 1. `titles` / `seasons` split + migration; import 2 TV series from TMDB.
- [ ] 2. `/titles` endpoints + `next-up` with `LEAD()`.
- [ ] 3. Markers, skip intro, next-episode countdown.
- [ ] 4. Audit log on every admin write.
- [ ] 5. **Check:** [week 11 "Done when"](./PRD.md#week-11-series-episodes-and-the-audit-log-1420-december) ✅ + milestone M7.

*Holiday break (21 December – 3 January): rest, or catch up on skipped P1 items.*

### Week 12: Notifications and the outbox → [PRD week 12](./PRD.md#week-12-notifications-and-the-outbox-410-january)

Read first: [ADR 0024](./adr/0024-notifications-outbox.md), [0023](./adr/0023-realtime-websockets-watch-party.md) (SSE part).

- [ ] 1. `outbox_events` + relay (`FOR UPDATE SKIP LOCKED`).
- [ ] 2. Notification fan-out job + `notifications` table + preferences.
- [ ] 3. SSE stream + notification bell in the frontend.
- [ ] 4. Email templates + unsubscribe (Mailpit).
- [ ] 5. (Stretch) Web push.
- [ ] 6. **Check:** [week 12 "Done when"](./PRD.md#week-12-notifications-and-the-outbox-410-january) ✅

### Week 13: Watch party → [PRD week 13](./PRD.md#week-13-watch-party-1117-january)

Read first: [ADR 0023](./adr/0023-realtime-websockets-watch-party.md). Requirements: [PRD §5.13](./PRD.md#513-watch-party).

- [ ] 1. Socket.IO namespace with cookie auth + Redis adapter.
- [ ] 2. Party create/join endpoints and rooms (playable titles only).
- [ ] 3. Host-authoritative state, clock offset, drift correction.
- [ ] 4. Chat, reactions, host controls.
- [ ] 5. Two API instances behind a local proxy; test cross-instance sync.
- [ ] 6. Load test 500 sockets.
- [ ] 7. **Check:** [week 13 "Done when"](./PRD.md#week-13-watch-party-1117-january) ✅

### Week 14: Subscriptions and payments → [PRD week 14](./PRD.md#week-14-subscriptions-and-payments-1824-january)

Read first: [ADR 0025](./adr/0025-payments-stripe.md). Requirements: [PRD §5.14](./PRD.md#514-subscriptions-and-payments).

- [ ] 1. Stripe account (test mode) + Stripe CLI; products and prices for 3 plans.
- [ ] 2. Checkout + Customer Portal endpoints.
- [ ] 3. Webhook: signature check, `stripe_events` dedupe, re-fetch the subscription state.
- [ ] 4. `getEntitlements()` everywhere; stream heartbeats.
- [ ] 5. Grace-period job + downgrade handling.
- [ ] 6. Frontend: pricing page + billing section.
- [ ] 7. Test with `stripe trigger` (failures, replays).
- [ ] 8. **Check:** [week 14 "Done when"](./PRD.md#week-14-subscriptions-and-payments-1824-january) ✅ + milestone M8.

---

## Phase 3: AI

Before week 15, read the [Phase 3 intro](./PRD.md#phase-3-ai-weeks-1518): create the Anthropic API key **with a spend limit**, re-check models and pricing, and run `tmdb:sync`.

### Week 15: Embeddings and hybrid search → [PRD week 15](./PRD.md#week-15-embeddings-pgvector-and-hybrid-search-2531-january)

Read first: [ADR 0026](./adr/0026-embeddings-and-pgvector.md), [0028](./adr/0028-hybrid-semantic-search.md), [0029](./adr/0029-llm-integration-claude.md). Requirements: [PRD §5.16](./PRD.md#516-ai-search-and-assistant).

- [ ] 1. Install Ollama + pull a small embedding model; enable `pgvector`.
- [ ] 2. `title_embeddings` + HNSW index + embed job with content hashing.
- [ ] 3. The `ai` module skeleton (SDK client, usage logging, feature flags as kill switches).
- [ ] 4. Hybrid search (keyword + vector + RRF).
- [ ] 5. LLM query parsing (structured output) behind a gate + `interpretedAs` chips.
- [ ] 6. 40-query eval set + NDCG script in CI.
- [ ] 7. **Check:** [week 15 "Done when"](./PRD.md#week-15-embeddings-pgvector-and-hybrid-search-2531-january) ✅

### Week 16: AI recommendations and experiments → [PRD week 16](./PRD.md#week-16-ai-recommendations-and-experiments-17-february)

Read first: [ADR 0027](./adr/0027-ai-recommendations-hybrid.md), [0031](./adr/0031-experiments-and-feature-flags.md), [0032](./adr/0032-catalogue-data-and-video-sources.md) (MovieLens part). Requirements: [PRD §5.15](./PRD.md#515-ai-recommendations).

- [ ] 1. Download MovieLens; map ratings to your titles via `links.csv`.
- [ ] 2. Taste vectors + candidate sources + scoring + MMR + playable boost.
- [ ] 3. Precompute job + Redis cache + `/me/recommendations` with `recId`.
- [ ] 4. LLM-written reasons (structured output, cached).
- [ ] 5. Offline eval (Recall@10, NDCG@10) in CI.
- [ ] 6. Feature flags + an A/B experiment vs the week 8 rules.
- [ ] 7. **Check:** [week 16 "Done when"](./PRD.md#week-16-ai-recommendations-and-experiments-17-february) ✅ + milestone M9.

### Week 17: Couch Concierge assistant → [PRD week 17](./PRD.md#week-17-couch-concierge-assistant-814-february)

Read first: [ADR 0029](./adr/0029-llm-integration-claude.md) (carefully: API rules, safety, tools).

- [ ] 1. Tools wrapping your services (search, recommendations, details, history, add-to-list, start party), returning `playable`.
- [ ] 2. Streaming tool-use loop → SSE; stop-reason handling; refusal fallback.
- [ ] 3. Grounding check: only titles from tool results are shown.
- [ ] 4. Prompt caching layout + usage/cost logging + plan quotas.
- [ ] 5. Conversation storage + 30-day retention job.
- [ ] 6. Eval suite: grounding, kids safety, prompt injection.
- [ ] 7. Frontend: chat panel (Cmd+J) with streamed text and `VideoCard`s.
- [ ] 8. **Check:** [week 17 "Done when"](./PRD.md#week-17-couch-concierge-assistant-814-february) ✅

### Week 18: AI enrichment and wrap-up → [PRD week 18](./PRD.md#week-18-ai-enrichment-pipeline-and-wrap-up-1521-february)

Read first: [ADR 0030](./adr/0030-ai-media-enrichment-pipeline.md). Requirements: [PRD §5.17](./PRD.md#517-ai-media-enrichment).

- [ ] 1. Install whisper.cpp (small model).
- [ ] 2. Enrichment flow: audio → Whisper → VTT → translation (batches) → tags/summary → markers → re-embed.
- [ ] 3. `ai_suggestions` + admin review queue.
- [ ] 4. Cost estimate + monthly cap.
- [ ] 5. Update `RUNBOOK.md` with AI operations.
- [ ] 6. Write a retrospective: what you'd change, and which ADRs you'd supersede.
- [ ] 7. **Check:** [week 18 "Done when"](./PRD.md#week-18-ai-enrichment-pipeline-and-wrap-up-1521-february) ✅ + milestone **M10** 🎉

---

## When you fall behind

Follow the [PRD buffer rules](./PRD.md#buffer): cut P2 items first, then P1. **Never cut tests, evals or the kids-safety rules.** Stopping at the end of any phase still leaves you with a finished product.
