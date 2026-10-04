# ADR 0012: S3-compatible object storage for all media, with pre-signed upload and playback URLs

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-10-04 |
| Phase | Week 6 |
| Related | [PRD §5.4](../PRD.md#54-playback), [PRD §5.8](../PRD.md#58-admin-and-media-pipeline), [ADR 0013](./0013-transcoding-pipeline-job-queue.md) |

## Context

Today, `server.js` serves HLS from a local folder: `app.use("/stream", express.static("my-stream"))`. That breaks as soon as:

- There's more than one API instance (each has its own disk).
- Uploads are large (a 2 GB file streamed through Node uses memory, ties up a connection and dies on timeouts).
- We need to stop non-users from downloading full films (anything under `/stream` is public).
- Containers are redeployed (local disk is wiped).

## Decision

**Storage:** an **S3-compatible API** for every file.
- Local: **MinIO** in `docker-compose.yml` (console at `:9001`).
- Production: **Cloudflare R2** (S3 API, **no egress fees**, which matters for video) or AWS S3 + CloudFront.
- Client: `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`, configured by `S3_ENDPOINT` so the same code hits MinIO or R2.

**Buckets and key layout**

| Bucket | Visibility | Keys |
|---|---|---|
| `couchtime-sources` | Private | `sources/{videoId}/{uploadId}.mp4` (originals; can be deleted after transcoding, or kept) |
| `couchtime-media` | Private (signed reads) | `videos/{videoId}/hls/master.m3u8`, `videos/{videoId}/hls/{360p,720p,1080p}/index.m3u8` + `seg_*.ts`, `videos/{videoId}/images/poster.webp`, `…/backdrop.webp`, `…/thumbs/sprite.jpg` + `thumbs.vtt`, `videos/{videoId}/subs/{lang}.vtt` |
| `couchtime-public` | Public | Avatars, genre art (non-sensitive images) |

**Upload flow (direct to storage)**
1. Admin → `POST /admin/videos/:id/upload-url { contentType, size }`. The API validates the type (`video/mp4`, `video/quicktime`, `video/x-matroska`) and size (≤ 5 GB), then returns a **pre-signed PUT URL** valid for 15 minutes (multipart upload for files over 100 MB is a P1).
2. The browser `PUT`s the file **directly to storage**. The API never touches the bytes.
3. Admin → `POST /admin/videos/:id/upload-complete` → the API `HEAD`s the object to confirm it exists and its size, then queues the transcode ([ADR 0013](./0013-transcoding-pipeline-job-queue.md)).

**Playback**
- `GET /videos/:id/playback` (signed-in) returns a short-lived signed URL for `master.m3u8`.
- **Open problem, decided in week 6 as your own ADR:** HLS playlists reference *other* files (renditions and segments), and each needs authorisation too. Options:
  - (a) **A playlist-rewriting proxy:** the API serves the `.m3u8` files itself, rewriting each segment line into a signed URL. Segments go direct to storage.
  - (b) **Signed cookies** at a CDN (CloudFront signed cookies, or a Cloudflare Worker checking a token) covering the whole `videos/{id}/` prefix.
  - (c) **Token in the query string** checked by an edge worker.
- Trailers (`/videos/:id/clip`) use a separate, short trailer rendition that may be public.

**Bucket CORS:** allow `GET`/`PUT`/`HEAD` from `APP_ORIGIN`, expose `ETag`.

## Alternatives considered

| Option | Pros | Cons | Why not chosen |
|---|---|---|---|
| Local disk / `express.static` | Already works. | Doesn't scale or survive redeploys; public. | See Context. |
| Upload through the API (`multer`) | One request. | API memory/CPU spent on bytes; timeouts. | Pre-signed URLs are the industry pattern. |
| Managed video platform (Mux, Cloudflare Stream) | Upload → ABR + DRM, done. | Costs money; hides the whole pipeline. | Excellent in a real product, but here the pipeline *is* the learning. Note it as the "buy" option. |
| Store files in Postgres (bytea) | One system. | Terrible for big binaries. | No. |

## Consequences

**Good:** stateless API; uploads scale; media is protected; local and production use the same code.

**Bad / costs:** CORS and signing are fiddly; segment authorisation needs real design work (that's the week 6 ADR); storage costs grow with renditions (≈3× the source size).

## What you'll learn

- Object storage concepts: buckets, keys, prefixes, metadata, eventual consistency.
- Pre-signed URLs: how the signature encodes method, key, expiry and credentials.
- HTTP range requests; content types; CORS preflight for `PUT`.
- CDN basics: edge caching, cache keys and why signed URLs affect cache hit rate.

## Done when

- [ ] A 1 GB upload completes; the API process's memory stays flat (watch it with `docker stats`).
- [ ] An expired playback URL returns 403 from storage.
- [ ] The `my-stream` folder is migrated into MinIO and `express.static` is removed.
- [ ] Your ADR for segment authorisation is written and accepted.

## References

- https://min.io/docs/minio/container/index.html
- https://developers.cloudflare.com/r2/api/s3/presigned-urls/
- https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html
- https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-signed-cookies.html
