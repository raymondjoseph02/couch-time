# ADR 0029: Claude via the official TypeScript SDK, behind one `ai` module; the "Couch Concierge" assistant uses tool use with streamed (SSE) replies

| Field | Value |
|---|---|
| Status | Accepted; amended by [ADR 0032](./0032-catalogue-data-and-video-sources.md) (tools return `playable`; the assistant prefers streamable titles) |
| Date | 2026-10-04 |
| Phase | Week 17 (assistant); used from Week 15 (search parsing), 16 (explanations), 18 (enrichment) |
| Related | [ADR 0027](./0027-ai-recommendations-hybrid.md), [ADR 0028](./0028-hybrid-semantic-search.md), [ADR 0030](./0030-ai-media-enrichment-pipeline.md), [ADR 0023](./0023-realtime-websockets-watch-party.md), [PRD §5.16](../PRD.md#516-ai-search-and-assistant) |

## Context

Four features use a large language model:

| Feature | Shape | Latency need | Volume |
|---|---|---|---|
| Search query parsing ([ADR 0028](./0028-hybrid-semantic-search.md)) | Text → structured JSON | < 1.5 s | Medium |
| Recommendation reasons ([ADR 0027](./0027-ai-recommendations-hybrid.md)) | Facts → one sentence (JSON) | Async | High |
| **Couch Concierge** chat assistant | Multi-turn chat with tools, streamed | First token < 2 s | Low–medium |
| Metadata enrichment ([ADR 0030](./0030-ai-media-enrichment-pipeline.md)) | Long text → structured JSON | Hours is fine | Bursty |

We need one consistent, safe and cost-controlled way to call the model.

## Decision

**Provider and SDK**
- **Anthropic Claude** through the official **`@anthropic-ai/sdk`** TypeScript package. No hand-rolled `fetch`, no OpenAI-compatible shims.
- One module, `modules/ai/`: `client.ts` (a single SDK client; `ANTHROPIC_API_KEY` validated by config, [ADR 0006](./0006-configuration-and-secrets.md)), `prompts/` (versioned prompt files), `tools/` (assistant tools), `schemas/` (Zod output schemas) and `usage.ts` (cost logging). **No other module imports the SDK directly.**

**Model and effort**
- **Default model: `claude-opus-5-5`** ($4 / $20 per million input/output tokens; cache reads $0.20 per million, at the time of writing). Thinking is always on with this model, so cost and latency are controlled with **`output_config.effort`** per route instead:

| Route | Effort | Call style |
|---|---|---|
| Search query parsing | `low` | `client.messages.parse()` + `zodOutputFormat(schema)` |
| Recommendation reasons | `low` | Structured output; Message Batches for nightly precompute |
| Concierge assistant | `medium` (the model's default; set it explicitly) | Streaming + tool use |
| Enrichment | `medium` | **Message Batches API** (≈50% cheaper, asynchronous) |

- Model IDs live in **config**, not code. Re-check the model list and pricing when you reach week 15, since models change.
- **Before introducing a second, cheaper model for high-volume routes**, measure the default model at `low` effort on those routes first. Lower effort on the newest model often matches an older model at higher effort, and one model means one prompt cache. If you do add a second model later, record it in a new ADR with the measurements.

**API usage rules** (current API; older tutorials may show outdated patterns)
- **Structured output** for anything machine-read: `client.messages.parse({ …, output_config: { format: zodOutputFormat(Schema) } })`. Don't prefill assistant messages (not supported on current models) and don't regex JSON out of text.
- **Tool use** for the assistant with `tool_choice: auto` (forcing a specific tool isn't supported on this model; steer via the system prompt and use `strict: true` on tool schemas). Use the SDK's tool runner (`client.beta.messages.toolRunner` with `betaZodTool`) or a manual loop with `client.messages.stream()` + `finalMessage()`. When streaming with tools, set `eager_input_streaming: true` on each tool and **validate every tool input against its schema** before running it.
- **Always check `stop_reason`** before using content: handle `refusal` (show a polite fallback), `max_tokens` (don't run a truncated tool call), and `tool_use`. Enable the server-side **refusal fallback** (`betas: ["server-side-fallback-2026-07-01"]`, `fallbacks: "default"`) so a declined request is retried on an appropriate model automatically.
- **Streaming** for anything user-facing and long: `client.messages.stream()`; forward text deltas to the browser as **SSE** ([ADR 0023](./0023-realtime-websockets-watch-party.md)).
- **Prompt caching:** the system prompt and tool definitions are **stable and first**; volatile data (profile summary, current time, the user's message) comes after the cache breakpoint. Verify with `usage.cache_read_input_tokens` > 0 on repeated calls. Never put timestamps or request ids in the system prompt.
- **Batches** (`client.messages.batches.create`) for enrichment and nightly reasons: results come back in **any order**, so key them by `custom_id`.
- **Errors:** catch the SDK's typed errors most-specific-first (rate limit → retry with backoff; 5xx/connection → retry; 400 → log and don't retry). The SDK already retries some errors twice; don't stack retries without limits.

**Couch Concierge (the assistant)**
- `POST /ai/assistant/chat { conversationId?, message }` → SSE stream of `{ type: "text" | "tool" | "cards" | "done" }` events.
- **Tools** (each a thin wrapper over our *existing services*, run **as the current profile** so every permission and maturity filter applies automatically):

| Tool | Does |
|---|---|
| `search_titles` | Hybrid search ([ADR 0028](./0028-hybrid-semantic-search.md)) with filters |
| `get_recommendations` | The profile's recommendation rows ([ADR 0027](./0027-ai-recommendations-hybrid.md)) |
| `get_title_details` | Details, cast, runtime, rating |
| `get_watch_history` | Recent watches and in-progress titles |
| `add_to_list` | Bookmark / add to a list (**writes**: the UI shows a confirmation chip; nothing destructive) |
| `start_watch_party` | Creates a party (Premium only, checked via entitlements) |

- The assistant may only recommend titles **returned by tools**. Validate before streaming: any title id in the final answer must have come from a tool result in this conversation; drop anything else. The UI renders those ids as real `VideoCard`s (a `cards` event), so made-up titles can't appear.
- **Conversation storage:** `ai_conversations` / `ai_messages` (profile-scoped, 30-day retention, deletable). Store the full `response.content` blocks you send back, so multi-turn history stays valid; only ever **append** to history.
- **Limits:** messages per day by plan ([ADR 0025](./0025-payments-stripe.md)); `max_tokens` per reply; at most 6 tool round-trips per turn; a per-profile monthly token budget tracked in `ai_usage`.

**Safety and privacy**
- **Prompt injection:** text from the catalogue (descriptions, subtitles) and from users is **data**. Tool results are wrapped and labelled as untrusted content; tools have least privilege (no delete, no payments, no account changes); writes need UI confirmation.
- **PII minimisation:** send the model a profile *summary* (top genres, recent titles), never emails, names or payment data.
- **Kids profiles:** the assistant is off by default, and when enabled it runs with a stricter system prompt and the same maturity filters.
- **Observability:** log model, effort, tokens in/out/cached, latency, cost, stop reason and tool calls per request (`ai_usage` table + metrics). Set a dashboard alert on daily spend.

**Evaluation:** a small eval set (`test/ai-evals/`) of assistant conversations and parse cases with expected properties (e.g. "never recommends an R title to a kids profile", "returns at least 3 cards for 'cozy movie night'"). Run it before changing prompts or models, and track pass rate and cost per run.

## Alternatives considered

| Option | Pros | Cons | Why not chosen |
|---|---|---|---|
| Raw HTTP calls | No dependency. | Re-implement retries, streaming parsing, types. | The official SDK is the supported path. |
| Framework (LangChain etc.) | Many integrations. | Abstraction hides what the API is doing; harder to debug. | Learn the primitives first. |
| Self-hosted open model | No per-token cost; private. | GPU hosting, weaker tool use; ops burden. | Quality and simplicity matter more here. |
| LLM picks recommendations itself | Simple demo. | Hallucinations, cost, no filters. | Tools ground every answer in our data. |
| Managed agent platform | Hosted loop. | The assistant is a simple, latency-sensitive chat over our own tools. | The Messages API + tool use fits exactly. |

## Consequences

**Good:** one choke point for cost, safety and logging; answers grounded in real catalogue data; consistent patterns across four features.

**Bad / costs:** a paid external dependency (set billing limits); latency on the chat path; prompts and evals need maintenance; the model and SDK evolve, so pin SDK versions and re-check the docs at each upgrade.

## What you'll learn

- Calling an LLM API properly: streaming, structured output, tool use loops, stop reasons, retries.
- Prompt caching and cost engineering (effort levels, batches, caching, budgets).
- Grounding (tools/RAG) to prevent hallucination.
- Prompt-injection threat modelling and least-privilege tools.
- Evaluating non-deterministic systems.

## Done when

- [ ] "Something cozy for a rainy evening, not too long" → a streamed answer with 3–5 real `VideoCard`s from the catalogue, first token in under 2 seconds.
- [ ] A catalogue description containing "ignore previous instructions and…" does not change assistant behaviour (eval case).
- [ ] Repeated chats show non-zero `cache_read_input_tokens`.
- [ ] Daily spend, tokens and p95 latency are visible on a dashboard; the free plan's 5-message limit is enforced.
- [ ] The kids-profile eval cases pass 100%.

## References

- Claude API docs: https://docs.claude.com/en/api/overview
- TypeScript SDK: https://github.com/anthropics/anthropic-sdk-typescript
- Tool use: https://docs.claude.com/en/docs/agents-and-tools/tool-use/overview
- Structured outputs: https://docs.claude.com/en/docs/build-with-claude/structured-outputs
- Prompt caching: https://docs.claude.com/en/docs/build-with-claude/prompt-caching
- Message Batches: https://docs.claude.com/en/docs/build-with-claude/batch-processing
- OWASP Top 10 for LLM Applications: https://genai.owasp.org/llm-top-10/
