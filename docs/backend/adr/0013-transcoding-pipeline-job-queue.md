# ADR 0013: Transcode with ffmpeg in a separate worker process, driven by a BullMQ job queue

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-10-04 |
| Phase | Weeks 6–7 |
| Related | [ADR 0012](./0012-object-storage-for-media.md), [ADR 0014](./0014-redis-caching-and-rate-limiting.md), [PRD §5.8](../PRD.md#58-admin-and-media-pipeline) |

## Context

The current `my-stream/` HLS was produced by hand. To make any uploaded file streamable at several qualities (G3, PLAY-2), something must run ffmpeg. Transcoding a 90-minute film takes **minutes to hours of CPU**. If it ran inside an API request it would time out, block the event loop if done in-process, and be lost if the server restarted.

## Decision

**Queue:** **BullMQ** on **Redis** ([ADR 0014](./0014-redis-caching-and-rate-limiting.md)).
- Queue `media`, job `transcode` with data `{ videoId, sourceKey }`.
- Producer: `POST /admin/videos/:id/upload-complete`. It writes a `transcode_jobs` row (`queued`) and calls `queue.add('transcode', …, { jobId: videoId + ':' + uploadId })`. The deterministic `jobId` stops double-submits from creating duplicates.
- **Retries:** 3 attempts with exponential backoff (1 minute, 5 minutes, 25 minutes); then the job is `failed` (dead letter), visible in admin with a retry button.

**Worker:** `src/worker.ts`, a **separate process** (and container) running the same codebase. Concurrency is 1 per CPU-heavy worker; scale by adding workers.

**Pipeline steps** (each step logs and updates progress):

| # | Step | Tool | Output |
|---|---|---|---|
| 1 | Download source to a temp dir (stream, not buffer) | S3 `GetObject` → file stream | `/tmp/{jobId}/source.mp4` |
| 2 | Probe | `ffprobe -show_streams -show_format -of json` | duration, resolution, codecs → DB |
| 3 | Transcode bitrate ladder | `ffmpeg` (H.264 + AAC, `-preset veryfast` dev / `medium` prod) | 360p ≈ 800 kbps · 720p ≈ 2.8 Mbps · 1080p ≈ 5 Mbps (skip rungs above the source resolution) |
| 4 | Package HLS | `ffmpeg -f hls -hls_time 6 -hls_playlist_type vod -hls_segment_filename …` | per-rendition `index.m3u8` + segments |
| 5 | Master playlist | generated in code | `master.m3u8` with `#EXT-X-STREAM-INF:BANDWIDTH=…,RESOLUTION=…` per rung |
| 6 | Trailer rendition | `ffmpeg -ss {trailer_start} -to {trailer_end}` at 720p | `trailer/index.m3u8` |
| 7 | Images | `ffmpeg -ss 10% -frames:v 1` → `sharp` resize to webp | poster, backdrop |
| 8 | Thumbnail sprite (P2) | `ffmpeg fps=1/10,scale=160:-1,tile=10x10` + generated VTT | `sprite.jpg`, `thumbs.vtt` |
| 9 | Upload outputs | S3 `PutObject` (parallel, limited concurrency) | `couchtime-media/videos/{id}/…` |
| 10 | Commit | one DB transaction | `video_assets` rows replaced, `videos.status='ready'`, `duration_seconds`, job `succeeded` |
| 11 | Clean up | `rm -rf /tmp/{jobId}` in `finally` | — |

**Progress:** run ffmpeg with `-progress pipe:1`, parse `out_time_ms` against the duration → `job.updateProgress(pct)` and `transcode_jobs.progress` (throttled to 1 update per 2 seconds).

**Idempotency:** outputs go to deterministic keys and are overwritten; DB asset rows are deleted and re-inserted inside the commit transaction. Re-running a job is always safe.

**Graceful shutdown:** on `SIGTERM`, `worker.close()` waits for the current job; containers get a long stop timeout (e.g. 10 minutes) or the job is retried.

Use `child_process.spawn` (never `exec`, whose output buffer overflows; and never build a shell string from user input).

## Alternatives considered

| Option | Pros | Cons | Why not chosen |
|---|---|---|---|
| Run ffmpeg inside the API request | No queue. | Timeouts; lost on restart; blocks the API. | Never do this. |
| `setTimeout` / in-memory queue | Simple. | Lost on crash; no retries; can't scale out. | Not durable. |
| Postgres-based queue (pg-boss, Graphile Worker) | No Redis needed. | Fine choice! Fewer UI tools. | We already need Redis for caching and rate limits; BullMQ has great docs and a dashboard. |
| RabbitMQ / SQS | Industrial-strength. | More infrastructure for one queue. | Overkill now. |
| AWS MediaConvert / Mux / Cloudflare Stream | Managed, scalable, DRM. | Cost; hides the learning. | The "buy" option for a real product. |
| fluent-ffmpeg | Nicer API. | Archived/unmaintained. | Spawn ffmpeg directly; it's just argv arrays. |

## Consequences

**Good:** the API stays fast; jobs survive restarts; retries are automatic; workers scale independently; the full pipeline is visible and debuggable.

**Bad / costs:** a second process to deploy and monitor; ffmpeg must be in the worker image (≈80 MB); laptop transcoding is slow (use short clips); temp disk space must be large enough for source + outputs.

## What you'll learn

- Why CPU-bound work leaves the request path.
- Durable queues, at-least-once delivery, and why that forces **idempotent** jobs.
- Retries, backoff and dead-letter handling.
- Child processes, stdout parsing and streams/backpressure.
- Video fundamentals: containers vs codecs, bitrate, keyframes/GOP (why `-g`/`-keyint_min` should align with segment length), HLS master vs media playlists.

## Done when

- [ ] Uploading a 2-minute clip ends in `status=ready` with 3 renditions + a trailer + a poster, and no manual steps.
- [ ] In DevTools, throttling to "Fast 3G" makes `hls.js` switch to 360p.
- [ ] `kill -9` on the worker mid-transcode → the job retries and succeeds; no duplicate assets.
- [ ] A corrupt file → the job fails after 3 attempts with a readable error in the admin UI.
- [ ] The Bull Board (or similar) dashboard is reachable in dev at `/admin/queues`.

## References

- https://docs.bullmq.io
- https://ffmpeg.org/ffmpeg-formats.html#hls-2
- Apple HLS authoring spec: https://developer.apple.com/documentation/http-live-streaming/hls-authoring-specification-for-apple-devices
- https://trac.ffmpeg.org/wiki/Encode/H.264
