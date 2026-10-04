# ADR 0030: AI media enrichment as extra pipeline stages: speech-to-text subtitles, translation, tags/moods/summaries, content warnings and chapter markers, with admin review

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-10-04 |
| Phase | Week 18 |
| Related | Extends [ADR 0013](./0013-transcoding-pipeline-job-queue.md); uses [ADR 0029](./0029-llm-integration-claude.md), [ADR 0026](./0026-embeddings-and-pgvector.md), [ADR 0022](./0022-series-and-episodes-model.md); [PRD §5.17](../PRD.md#517-ai-media-enrichment) |

## Context

Good metadata drives everything downstream: search, embeddings, recommendations, accessibility. But admins won't hand-write subtitles in 5 languages, mood tags, spoiler-free summaries, content warnings and intro markers for every upload. Today the details page invents "Subtitles: English, Spanish, French" and the cast list.

## Decision

After a successful transcode ([ADR 0013](./0013-transcoding-pipeline-job-queue.md)), a **`enrich` flow** runs as a chain of BullMQ jobs (each idempotent, retryable and individually re-runnable from admin):

| # | Stage | Tool | Output |
|---|---|---|---|
| 1 | **Extract audio** | `ffmpeg -vn -ac 1 -ar 16000` | `audio.wav` (temp) |
| 2 | **Speech-to-text** | **Whisper** run locally (`whisper.cpp` or `faster-whisper` in the worker image), or a hosted STT API behind an interface | Timestamped transcript → **WebVTT** in the source language (`subs/{lang}.vtt`) |
| 3 | **Translate subtitles** | **Claude** via Message Batches; translate **cue by cue in chunks of ~100 cues**, keeping cue ids and timestamps untouched (structured output: `{ cues: [{id, text}] }`) | `subs/{es,fr,…}.vtt` |
| 4 | **Understand the content** | **Claude**, structured output over transcript + synopsis + credits | `{ tags[], moods[], themes[], spoilerFreeSummary, shortSynopsis, contentWarnings[] (e.g. violence, language), suggestedMaturity, keyMoments[] }` |
| 5 | **Markers** | Heuristics + Claude: intro/credits from silence/music detection (`ffmpeg silencedetect`) and transcript gaps; chapter titles from transcript segments | `markers` ([ADR 0022](./0022-series-and-episodes-model.md)), `chapters[]` |
| 6 | **Embed** | [ADR 0026](./0026-embeddings-and-pgvector.md) | Updated title embedding; optional transcript chunk embeddings ("find the scene where…", P2) |

**Human in the loop**
- AI output is stored as **suggestions** (`ai_suggestions (id, title_id, field, value jsonb, model, prompt_version, status: pending|accepted|rejected|edited)`), not written straight into the public fields.
- Admin review screen: accept, edit or reject each field. **Maturity rating and content warnings are always human-confirmed.** Subtitles are published as "auto-generated" until reviewed.
- Track the acceptance rate per field and prompt version as the enrichment quality metric.

**Cost and scale controls**
- Batch API for all Claude stages (asynchronous, cheaper); long transcripts are summarised in chunks (map → reduce) instead of one giant prompt.
- A stable instruction prefix for caching; a per-title cost estimate before running; an admin "enrich" toggle per title; a monthly budget cap in config.
- Store `model` + `prompt_version` with every suggestion so results can be re-generated and compared.

## Alternatives considered

| Option | Pros | Cons | Why not chosen |
|---|---|---|---|
| Manual metadata only | Accurate. | Doesn't scale; no subtitles. | Admins review instead of writing. |
| Auto-publish AI output | Zero admin work. | Wrong ratings or warnings are a real harm. | Human review for sensitive fields. |
| Machine-translation API for subtitles | Cheap, fast. | Weaker context handling (names, idioms) across cues. | Claude translates with context; a dedicated MT API is a fine cost-saving alternative. Measure both. |
| Vision model on video frames for tags | Richer signals. | Much more expensive. | P2: sample a few keyframes per scene later. |

## Consequences

**Good:** accessibility (subtitles in several languages); far richer metadata for search and recommendations; realistic AI pipeline engineering with review and versioning.

**Bad / costs:** Whisper is CPU-heavy (use the small model in dev; GPU or a hosted API in production); LLM costs per title; a review queue that admins must keep up with.

## What you'll learn

- Building multi-stage ML/AI pipelines with job chains (BullMQ flows), idempotency and partial re-runs.
- Speech-to-text and subtitle formats (WebVTT cues, timestamps).
- Chunking long inputs (map/reduce) and preserving structure through an LLM.
- Human-in-the-loop design and measuring AI quality via acceptance rates.

## Done when

- [ ] Uploading a 3-minute clip with speech produces source-language VTT plus 2 translations, selectable in the player.
- [ ] Translated VTT files have exactly the same cue count and timestamps as the source (test).
- [ ] Suggestions appear in admin; accepting tags updates search and recommendations (re-embed triggered).
- [ ] Re-running enrichment with a new prompt version keeps the old suggestions for comparison.
- [ ] Cost per enriched title is logged and shown in admin stats.

## References

- https://github.com/ggerganov/whisper.cpp · https://github.com/SYSTRAN/faster-whisper
- https://developer.mozilla.org/en-US/docs/Web/API/WebVTT_API
- https://docs.bullmq.io/guide/flows
- https://docs.claude.com/en/docs/build-with-claude/batch-processing
