# ADR 0006: Environment-based configuration, validated at startup

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-10-04 |
| Phase | Week 1 |
| Related | [ADR 0020](./0020-local-dev-ci-deployment.md) |

## Context

Values are hardcoded today: `PORT = 8080`, the CORS origin `http://localhost:3000`, and the frontend's `baseURL: "http://localhost:8080/api/v1"`. The backend will soon need many more: database URL, Redis URL, JWT secrets, storage keys, Firebase service account, SMTP settings. These differ per environment (dev, test, production), and some are secrets that must never be committed.

## Decision

- All configuration comes from **environment variables** (the 12-factor approach).
- `src/config/index.ts` parses `process.env` with a **Zod schema** and exports a typed, frozen `config` object. **If anything is missing or invalid, the process exits at startup** with a clear message listing every problem.
- No other file reads `process.env` directly (enforced with ESLint).
- `.env` is used in local development only (loaded by `node --env-file=.env`, or `dotenv` in scripts). `.env` is git-ignored; `.env.example` is committed with every key and safe dummy values.
- Secrets in production come from the platform's secret store (Fly/Railway secrets or GitHub Actions secrets), never from files in the image.
- Separate secrets for the access and refresh tokens; rotate them by supporting a list of keys (current first, the previous kept to verify old tokens).

Example keys: `NODE_ENV`, `PORT`, `APP_ORIGIN`, `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET_SOURCES`, `S3_BUCKET_MEDIA`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `SMTP_URL`, `LOG_LEVEL`.

## Alternatives considered

| Option | Pros | Cons | Why not chosen |
|---|---|---|---|
| Hardcoded values | Simple. | Can't deploy; secrets leak into git. | Already causing problems. |
| JSON/YAML config files per environment | Structured. | Secrets end up in files; easy to commit by accident. | Env vars are the platform standard. |
| A secrets manager (Vault, AWS SM) from day one | Very secure. | Heavy for a solo project. | The platform secret store is enough. |

## Consequences

**Good:** the same image runs everywhere; misconfiguration fails fast instead of at 2 a.m.; config is typed (`config.jwt.accessTtl` is a number, not a string).

**Bad / costs:** env vars are flat strings, so nested values need parsing; you must keep `.env.example` in sync (add a test that compares keys).

## What you'll learn

- The 12-factor app principles.
- Why "fail fast at startup" beats discovering a missing key on the first request.
- Secret hygiene: rotation, least privilege, never logging secrets (configure pino `redact`).

## Done when

- [ ] Starting with an empty `.env` prints every missing key and exits with code 1.
- [ ] `grep -r "process.env" src` only matches `src/config/`.
- [ ] The frontend reads its API URL from `NEXT_PUBLIC_API_URL` instead of the hardcoded `localhost:8080`.

## References

- https://12factor.net/config
- https://zod.dev
- https://nodejs.org/api/cli.html#--env-fileconfig
