# ADR 0007: Validate every input with Zod; return errors as RFC 9457 Problem Details

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-10-04 |
| Phase | Week 2 |
| Related | [ADR 0011](./0011-rest-api-conventions.md), [PRD §7.6](../PRD.md#76-example-error) |

## Context

`server.js` validates by hand (`Number.isFinite(position)`) and returns ad-hoc errors (`{ error: "Video not found" }`). As endpoints multiply:

- Hand validation gets forgotten, and unvalidated input is the root of most API security bugs.
- The frontend can't handle errors consistently if every endpoint shapes them differently.
- Debugging production issues needs a way to link a user's error to a log line.

## Decision

**Validation**
- Every route declares Zod schemas for `params`, `query` and `body`. A `validate(schemas)` middleware parses them and **replaces** `req.params`/`req.query`/`req.body` with the parsed, typed values. Unknown body keys are stripped.
- Response shapes also get Zod schemas. They are used to generate OpenAPI ([ADR 0011](./0011-rest-api-conventions.md)) and are checked in tests (not at runtime in production, for speed).
- Use `z.coerce.number()` for query strings, because everything in a URL is a string.

**Errors**
- All errors become **RFC 9457 Problem Details** (`Content-Type: application/problem+json`), with `type`, `title`, `status`, `detail`, `instance`, `requestId`, and `errors[]` for validation problems.
- Code throws typed errors: `NotFoundError`, `ValidationError`, `UnauthorizedError`, `ForbiddenError`, `ConflictError`, `RateLimitError`. A single `errorHandler` middleware (registered last) maps them to responses.
- Anything unexpected becomes a **500 with a generic message**. The real error and stack go to the logs with the `requestId`, never to the client.

## Alternatives considered

| Option | Pros | Cons | Why not chosen |
|---|---|---|---|
| Manual `if` checks | No dependency. | Inconsistent; easy to miss; no types. | Doesn't scale past a few routes. |
| Joi / Yup | Mature. | Weaker TS inference than Zod. | Zod infers the TS types from the schema. |
| express-validator | Express-native. | Chain API; types are bolted on. | Same reason. |
| Custom error JSON | Simple. | Reinvents a standard. | RFC 9457 is a standard many tools understand. |

## Consequences

**Good:** one place to read what an endpoint accepts; types for free; consistent errors the frontend can handle in one interceptor; no stack traces leaking.

**Bad / costs:** a schema per endpoint; you have to keep error classes disciplined (no `throw new Error("…")` in services).

## What you'll learn

- "Parse, don't validate": turning untrusted input into trusted types at the boundary.
- HTTP status codes properly: 400 vs 401 vs 403 vs 404 vs 409 vs 422 vs 429.
- Centralised error handling in Express (the four-argument middleware).

## Done when

- [ ] Sending `{ "position": "abc" }` to the progress endpoint returns 400 problem+json listing the bad field.
- [ ] A thrown unknown error returns `{ status: 500, title: "Internal Server Error", requestId }` and the log line has the stack.
- [ ] The frontend axios interceptor shows `detail` from any error.

## References

- https://www.rfc-editor.org/rfc/rfc9457
- https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/
- https://zod.dev
