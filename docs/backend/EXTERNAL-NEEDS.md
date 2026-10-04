# What You Need From Outside: Accounts, Software, Data and Costs

Everything the backend plan needs that isn't your own code, in the order you'll need it. Tick items off as you set them up.

> **About prices:** the movie API prices were checked online on 4 October 2026. Every other price is an estimate. Always confirm on the provider's pricing page before signing up, and **turn on billing alerts / spend limits on day one** for every paid account.

Related: [PRD §15: Data and content sources](./PRD.md#15-data-and-content-sources), [ADR 0032](./adr/0032-catalogue-data-and-video-sources.md).

---

## Quick summary

| Stage | What's new | Monthly cost (estimate) |
|---|---|---|
| Weeks 1–8 (everything local) | GitHub, TMDB key, Docker, free films | **$0** |
| Week 9 onwards (deployed) | Hosting, database, Redis, storage, email, domain | **$0–30** (+ domain ≈ $10–15/year) |
| Week 14 | Stripe (test mode) | $0 |
| Weeks 15–18 (AI) | Anthropic API (+ optional embeddings API) | **+ a few $**, capped by your spend limit |

---

## 1. Accounts and online services

### Needed from the start (weeks 1–8)

| ✓ | What | Used for | When | Free option | Paid |
|---|---|---|---|---|---|
| [ ] | **GitHub** | Code, CI (GitHub Actions), container images (GHCR) | Week 1 | Free for personal repos | — |
| [ ] | **TMDB** API key ([themoviedb.org](https://www.themoviedb.org) → Settings → API) | Movie and TV info, posters, cast, trailer keys | Week 2 | **Free** (non-commercial; credit TMDB) | Reportedly ~$149/month **only** if commercial |
| [ ] | **Firebase** project (you already have one) | Google sign-in | Week 4 | Free plan covers it | — |
| [ ] | **MetaMask** browser extension | Testing wallet sign-in | Week 4 | Free | — |
| [ ] | **Phantom** browser extension (optional) | Testing Solana sign-in | Week 4 (stretch) | Free | — |
| [ ] | **Pexels** API key (optional) | Short test clips for uploads and transcoding | Week 6–7 | Free (200 requests/hour, 20,000/month) | — |
| [ ] | **Pixabay** API key (optional) | Short test clips (up to 4K) | Week 6–7 | Free (100 requests/minute) | — |
| [ ] | **Sentry** (optional) | Error tracking | Week 8 | Free developer plan | — |
| [ ] | **Grafana Cloud** (optional) | Dashboards for metrics and logs | Week 8 | Free tier | — |

### Needed to deploy (week 9)

| ✓ | What | Used for | Free option | Paid (estimate) |
|---|---|---|---|---|
| [ ] | **App hosting**: Fly.io, Railway, or a VPS (e.g. Hetzner) | Running the API and worker processes | Very limited | ~$5–20/month |
| [ ] | **Managed Postgres**: Neon, Supabase or Railway (must support **pgvector** for week 15) | Production database | Small free tiers | ~$5–25/month |
| [ ] | **Managed Redis**: Upstash or Railway | Cache, rate limits, queues, pub/sub | Upstash free tier | ~$0–10/month |
| [ ] | **Object storage**: Cloudflare R2 (recommended) or AWS S3 | Video files, posters, subtitles | R2 ≈ 10 GB free, **no download fees** | ≈ $0.015/GB-month after that |
| [ ] | **Email sending**: Resend, Postmark or AWS SES | Verification, password reset, digests | Resend small free tier | A few $/month |
| [ ] | **Domain name** | A real URL | — | ≈ $10–15/year |
| [ ] | **Cloudflare** account | DNS, HTTPS, R2 | Free | — |

### Needed later

| ✓ | What | Used for | When | Free option | Paid |
|---|---|---|---|---|---|
| [ ] | **Stripe** account (test mode) | Subscriptions and webhooks | Week 14 | **Free in test mode** | Fees only on real payments |
| [ ] | **Anthropic API** key ([console.anthropic.com](https://console.anthropic.com)) | Claude: search parsing, recommendation reasons, Couch Concierge, enrichment | Week 15 | None. **Set a monthly spend limit** | Pay per use. Claude Opus 5.5: $4 per million input tokens, $20 per million output (Oct 2026). Re-check before week 15 |
| [ ] | **Embeddings API** (optional): Voyage AI, OpenAI, Cohere… | Vectors for semantic search and recommendations | Week 15 | **Use a local model instead (Ollama)** | Cents per million tokens |
| [ ] | **Speech-to-text API** (optional) | Subtitles if local Whisper is too slow | Week 18 | Local Whisper ($0) | Per minute of audio |
| [ ] | **OMDb** (optional) | IMDb / Rotten Tomatoes / Metacritic scores | Any time (P2) | 1,000 requests/day | $1/month (100k/day) |

Web push needs **no account**: you generate your own VAPID keys with the `web-push` package (week 12).

---

## 2. Software to install (all free)

| ✓ | Tool | Used for | When |
|---|---|---|---|
| [ ] | **Node.js LTS** + npm | Running the backend | Week 1 |
| [ ] | **Docker Desktop** (or OrbStack on Mac) | Runs Postgres, Redis, MinIO, Mailpit locally | Week 1 |
| [ ] | **Git** | Version control | Week 1 |
| [ ] | **API client**: Bruno, Insomnia or Postman | Testing endpoints | Week 1 |
| [ ] | **Database GUI**: TablePlus, DBeaver or pgAdmin | Looking at tables and queries | Week 2 |
| [ ] | **ffmpeg** (`brew install ffmpeg`) | Converting films to HLS (by hand in week 2, automatically in week 7) | Week 2 |
| [ ] | **k6** (`brew install k6`) | Load testing | Week 8 |
| [ ] | **Stripe CLI** (`brew install stripe/stripe-cli/stripe`) | Forwarding webhooks to localhost | Week 14 |
| [ ] | **Ollama** (or transformers.js) | Local embedding model | Week 15 |
| [ ] | **whisper.cpp** or faster-whisper | Local speech-to-text | Week 18 |

**Run inside Docker** (nothing to install separately): Postgres (with pgvector), Redis, MinIO (local S3), Mailpit (fake email inbox).

**VS Code extension:** *Markdown Preview Mermaid Support*, to see the diagrams in these docs.

---

## 3. Data and content (all free)

| ✓ | What | Source | Licence / rules | When |
|---|---|---|---|---|
| [ ] | ~200 movie and TV titles (info, posters, cast, trailer keys) | [TMDB API](https://developer.themoviedb.org/docs) | Non-commercial; show the TMDB notice and logo | Week 2 |
| [ ] | **Streamable films (~6)**: *Sintel*, *Big Buck Bunny*, *Tears of Steel*, *Elephants Dream*, *Spring* | [Blender Studio](https://studio.blender.org/films/) | Creative Commons; credit the Blender Foundation | Week 2 |
| [ ] | Full-length public-domain classics: *Night of the Living Dead*, *Nosferatu*, *His Girl Friday*… | [Internet Archive](https://archive.org/details/feature_films) (API, no key needed) | Public domain. **Check each item's rights** | Week 2 |
| [ ] | Short test clips | [Pexels](https://www.pexels.com/api/documentation/) / [Pixabay](https://pixabay.com/api/docs/) | Free; download and store yourself | Weeks 6–7 |
| [ ] | Trailers for information-only titles | YouTube embed (keys from TMDB) | Use the official embed player only | Week 2 |
| [ ] | Real user ratings | [MovieLens](https://grouplens.org/datasets/movielens/) (`links.csv` maps to TMDB ids) | Research/education use; cite GroupLens | Week 16 |

**Storage budget (~20 GB):** after transcoding to 3 qualities, roughly 0.4–0.7 GB per short and 1–4 GB per full-length film. That's about 6–10 films.

---

## 4. Secrets to keep (never commit these)

Store them in `.env` locally (git-ignored) and in your hosting platform's secret store in production ([ADR 0006](./adr/0006-configuration-and-secrets.md)).

| ✓ | Secret | From |
|---|---|---|
| [ ] | `TMDB_API_KEY` (or read access token) | TMDB |
| [ ] | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Generate yourself (`openssl rand -base64 48`) |
| [ ] | `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Firebase → service account |
| [ ] | `DATABASE_URL` | Local Docker / managed Postgres |
| [ ] | `REDIS_URL` | Local Docker / managed Redis |
| [ ] | `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` | MinIO locally / Cloudflare R2 |
| [ ] | `SMTP_URL` (or email API key) | Mailpit locally / Resend etc. |
| [ ] | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe (test mode keys) |
| [ ] | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Generate with `web-push` |
| [ ] | `ANTHROPIC_API_KEY` | Anthropic console |
| [ ] | `PEXELS_API_KEY`, `PIXABAY_API_KEY` (optional) | Pexels / Pixabay |
| [ ] | `EMBEDDINGS_API_KEY` (optional) | Hosted embeddings provider |

---

## 5. Attribution checklist (for the About page)

- [ ] "This product uses the TMDB API but is not endorsed or certified by TMDB." + TMDB logo
- [ ] Each streamed film's credit and licence, e.g. "Sintel © Blender Foundation | CC-BY"
- [ ] MovieLens citation (if you mention recommendations quality publicly)
- [ ] Pexels / Pixabay credits for any clips shown publicly (appreciated, not always required)
