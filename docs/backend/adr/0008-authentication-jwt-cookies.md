# ADR 0008: Our own short-lived JWT access tokens plus rotating refresh tokens, in httpOnly cookies

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-10-04 |
| Phase | Week 3 |
| Related | [PRD §5.1](../PRD.md#51-accounts-and-authentication), [ADR 0009](./0009-social-and-wallet-login.md), [ADR 0010](./0010-authorization-roles.md) |

## Context

Today:
- `server.js` reads the `token` cookie and **decodes the JWT without verifying its signature**, so anyone can forge one and become any user.
- The frontend's `src/api/index.ts` has a TODO for handling expired tokens.
- Sign-in can come from email/password, Google (Firebase) or wallets ([ADR 0009](./0009-social-and-wallet-login.md)). We need **one session model** no matter how the user signed in.

Requirements: users stay signed in for weeks (AUTH-3); individual devices can be signed out (AUTH-4, AUTH-11); a stolen token should be short-lived and detectable.

## Decision

**Passwords**
- Hash with **Argon2id** (the `argon2` package, its default parameters or stronger). Never log or return them.
- Minimum length 8; check against a breached-password list (optional P1, via the HaveIBeenPwned k-anonymity API).

**Tokens**
- **Access token:** a JWT signed with HS256 (`JWT_ACCESS_SECRET`), **15-minute** lifetime. Claims: `sub` (user id), `role`, `sid` (session id), `iat`, `exp`. Verified on every request by `requireAuth`, which checks the signature, expiry and algorithm (reject `alg: none`).
- **Refresh token:** a **random 256-bit opaque string** (not a JWT), **30-day** lifetime. Only its **SHA-256 hash** is stored in `sessions.refresh_token_hash`.
- **Rotation:** every `/auth/refresh` issues a new refresh token and replaces the hash. If a refresh token comes in that matches a session but *not* its current hash, it's a **replay**: revoke the whole session (family) and return 401.

**Transport**
- Both tokens are sent as cookies: `httpOnly`, `Secure` (production), `SameSite=Lax`.
  - `access_token`: `Path=/`.
  - `refresh_token`: `Path=/api/v1/auth`, so it's only sent to auth routes.
- Non-browser clients may send `Authorization: Bearer <access>` instead.

**CSRF**
- `SameSite=Lax` blocks cross-site POSTs carrying cookies in modern browsers. In addition, all state-changing routes require `Content-Type: application/json` (an HTML form can't send it without a CORS preflight), and CORS allows only `APP_ORIGIN`. If the frontend and API ever end up on different *sites*, add a double-submit CSRF token (record that in a new ADR).

**Frontend contract**
- On a 401 with `type` ending in `/token-expired`, the axios interceptor calls `POST /auth/refresh` **once** (sharing one in-flight promise across concurrent requests), then retries. If the refresh fails, it redirects to `/auth/signin`.

## Alternatives considered

| Option | Pros | Cons | Why not chosen |
|---|---|---|---|
| Server-side sessions only (session id cookie + Redis) | Simple; instant revocation. | A store lookup on every request. | Very reasonable choice! JWT + refresh is chosen *for learning*, and it keeps the API stateless for reads. Write a superseding ADR if you prefer sessions after week 3. |
| Long-lived JWT (7 days), no refresh | Simplest. | Can't revoke; a stolen token works for a week. | Unsafe. |
| Tokens in `localStorage` + Bearer header | Easy with SPAs. | Any XSS can steal the token. | httpOnly cookies are out of reach for JS. |
| Firebase Auth for everything (verify Firebase tokens on every request) | No auth code to write. | Wallet sign-in doesn't fit; vendor lock-in; skips the learning. | We still use Firebase *only* to verify Google sign-in ([ADR 0009](./0009-social-and-wallet-login.md)). |
| Auth.js / Lucia / Better Auth | Batteries included. | Hides the concepts this project is meant to teach. | Use one in a later project once you know what it does. |

## Consequences

**Good:** forged tokens are impossible without the secret; stolen access tokens expire within 15 minutes; refresh replay is detected; per-device sign-out works; it works for every sign-in method.

**Bad / costs:** revoking an access token takes up to 15 minutes (acceptable; for "sign out everywhere" the `sid` can be checked against a Redis deny-list); more moving parts than sessions; the frontend interceptor gets more complex.

## What you'll learn

- JWT anatomy (header.payload.signature). Verify one by hand with `crypto.createHmac`.
- Hashing vs encryption vs encoding; salts; work factors.
- Cookie attributes and the browser security model (same-origin vs same-site).
- Threat modelling: XSS, CSRF, token theft, replay, credential stuffing, user enumeration.

## Done when

- [ ] Tampering with one character of the access token gives 401.
- [ ] Using a refresh token twice revokes the session (integration test).
- [ ] The wrong-password and unknown-email responses are identical in body and similar in timing.
- [ ] `/auth/signin` is rate-limited (5 attempts per 15 minutes per email + IP).
- [ ] The frontend refreshes silently: leave the tab open for 20 minutes and click something; no sign-in prompt appears.

## References

- OWASP Authentication Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- OWASP Password Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- Refresh token rotation (Auth0 docs): https://auth0.com/docs/secure/tokens/refresh-tokens/refresh-token-rotation
- https://jwt.io/introduction
