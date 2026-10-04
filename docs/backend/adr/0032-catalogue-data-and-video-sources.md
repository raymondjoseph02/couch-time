# ADR 0032: Catalogue information from TMDB; streams only for a small set of self-hosted, legally usable videos; MovieLens for ratings data

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-10-04 |
| Phase | Week 2 (catalogue + first streams), Week 6–7 (streams through the pipeline), Week 16 (MovieLens) |
| Related | Amends [ADR 0012](./0012-object-storage-for-media.md), [ADR 0027](./0027-ai-recommendations-hybrid.md), [ADR 0029](./0029-llm-integration-claude.md); [PRD §15](../PRD.md#15-data-and-content-sources) |

## Context

The backend needs two different things:

1. **Information about movies**: titles, descriptions, genres, cast, posters, runtimes, trailers. Lots of it (100–200+ titles), because search, trending and especially the AI features (weeks 15–18) are meaningless with a tiny catalogue.
2. **Actual video files** to stream through our HLS player. Needed for playback, progress/resume, the transcoding pipeline, watch parties and subtitles.

What we found:

- Movie APIs (TMDB, OMDb, Trakt…) provide **information only**. Their "videos" are **YouTube trailer keys**, which `hls.js` cannot play.
- **No legal API offers mainstream films** for streaming; studios license those through contracts.
- Free, legal video files do exist: Blender Studio open movies (Creative Commons), public-domain classics on the Internet Archive, and stock clips (Pexels, Pixabay).
- Storage budget: about **20 GB**. Each full-length film is ~1–4 GB after transcoding to 3 renditions; shorts are ~0.4–0.7 GB.
- The AI recommender ([ADR 0027](./0027-ai-recommendations-hybrid.md)) needs realistic taste data; synthetic users only approximate it.

## Decision

**1. Two kinds of title in one catalogue**

| | Streamable titles | Information-only titles |
|---|---|---|
| How many | ~6 to start (up to ~10 within the storage budget) | 100–200+ |
| Info source | TMDB (they exist there too) | TMDB |
| Video | **Our own HLS** in MinIO/R2 | none |
| Preview | Our HLS clip (`trailer_start`/`trailer_end`) | **YouTube embed** of the TMDB trailer |
| Main button | **Play** / **Resume** | **Watch trailer** + "Not available to stream" badge |

**2. Sources**

| Need | Source | Cost |
|---|---|---|
| Info, posters, backdrops, cast, trailer keys, TV seasons/episodes | **TMDB API** (free key, non-commercial use, attribution required) | $0 |
| Streamable videos | **Blender open movies** (*Sintel*, *Big Buck Bunny*, *Tears of Steel*, *Elephants Dream*, *Spring*…) and **public-domain classics** from the Internet Archive (e.g. *Night of the Living Dead*, *Nosferatu*). Only titles whose licence we have checked. | $0 |
| Short test clips for the upload/transcode pipeline | Pexels / Pixabay APIs | $0 |
| Real user ratings | **MovieLens** dataset (its `links.csv` maps MovieLens ids to TMDB ids) | $0 |

**3. Data model** (on `videos`, moving to `titles` / `videos` in week 11 per [ADR 0022](./0022-series-and-episodes-model.md))

| Column | Example | Meaning |
|---|---|---|
| `tmdb_id` | `45745` | Link to TMDB; unique; used to re-sync |
| `source` | `tmdb` / `manual` | Where the info came from |
| `trailer_youtube_key` | `"eRsGyueVLvQ"` | YouTube trailer for information-only titles (and optionally for streamable ones) |
| `stream_status` | `none` / `processing` / `ready` / `failed` | Whether we host the video. Replaces the old `status` column for this purpose |
| `poster_path`, `backdrop_path` | `/abc123.jpg` | TMDB image paths; full URLs built from TMDB's image CDN |
| `license` | `CC-BY 3.0, Blender Foundation` | Required when `stream_status ≠ none`; shown on the About page |
| `last_synced_at` | timestamp | When TMDB info was last refreshed |

Only streamable titles have rows in `video_assets` (HLS renditions, our own posters, subtitles), which amends [ADR 0012](./0012-object-storage-for-media.md).

**4. TMDB import**
- A script/job `tmdb:import`: fetches the movies MovieLens users rated most (so ratings data and catalogue overlap) plus popular movies and a few TV series, and **upserts by `tmdb_id`**. It respects TMDB's rate limits (throttle to a few requests per second) and stores the language.
- `tmdb:sync` (weekly job) refreshes changed titles. Admin edits win over TMDB data for fields an admin has overridden.
- Images: **hotlink TMDB's image CDN** in development; optionally copy posters into our own storage later (open question).

**5. API contract**
- Every video response gains `playable: boolean` (`stream_status === 'ready'`) and `trailer: { type: "hls", src, start, end } | { type: "youtube", key, start?, end? } | null`.
- `GET /videos/:id/playback` returns **409** with problem type `/not-streamable` for information-only titles.
- Progress, Continue Watching, watch parties, subtitles and heartbeats only accept **playable** videos (400 otherwise).
- Filters: `GET /videos?playable=true` for a "Watch now" row.

**6. Discovery and AI rules** (amends [ADR 0027](./0027-ai-recommendations-hybrid.md) and [ADR 0029](./0029-llm-integration-claude.md))
- Recommendations get a **boost for playable titles** in ranking, and every item carries `playable` so the UI labels it.
- The Couch Concierge's tools return `playable`. The system prompt tells it to prefer streamable titles and to say "trailer only" for the others.
- **Offline evaluation uses MovieLens ratings** mapped to our TMDB titles: hold out each user's latest ratings, recommend from the rest, score Recall/NDCG. Synthetic users stay as a fallback for scenarios MovieLens can't cover (e.g. kids profiles).

**7. Legal and attribution**
- Show TMDB's required notice ("This product uses the TMDB API but is not endorsed or certified by TMDB") and logo on an About page.
- Credit each streamable video's licence (e.g. "Sintel © Blender Foundation, CC-BY").
- MovieLens: cite GroupLens as the dataset terms require; use it only for research/education.
- **Never** upload copyrighted films for streaming, even locally on a deployed site. If the project ever becomes commercial, TMDB needs a commercial licence (reportedly from ~$149/month).

## Alternatives considered

| Option | Pros | Cons | Why not chosen |
|---|---|---|---|
| Only the ~6 self-hosted videos, information written by hand | No external API at all. | Far too small for search, trending and AI to be meaningful. | Works for weeks 1–14 alone, but the AI phase needs volume. |
| Only TMDB | Big, realistic catalogue. | Nothing plays; the streaming half of the project (HLS, progress, pipeline, watch party) can't be built. | The streaming parts are core learning goals. |
| Play TMDB/YouTube trailers through `hls.js` | One player. | Not possible: YouTube isn't HLS, and downloading from YouTube breaks their terms. | Use the official YouTube embed instead. |
| Map every TMDB title to one of our 6 videos in dev | Everything "plays". | Confusing (every film is *Sintel*); dishonest if deployed. | Use the honest `playable` flag. |
| Synthetic users only for recommendation data | Full control. | Artificial tastes; results look better than reality. | MovieLens is real behaviour; synthetic data stays as a fallback. |

## Consequences

**Good:** a large, realistic catalogue for discovery and AI at $0; real playback for every streaming feature; honest UI; real ratings data for evaluation; clear licensing.

**Bad / costs:** two code paths for previews (HLS vs YouTube embed); every playback-related endpoint must check `playable`; TMDB terms and attribution must be followed; storage limits how many titles can stream.

## What you'll learn

- Integrating a third-party API properly: keys, rate limits, upserts, sync jobs, attribution.
- Modelling capability flags (`playable`) instead of assuming every row is the same.
- Licensing basics for media and datasets.
- Joining an external dataset (MovieLens) to your own data through shared ids.

## Done when

- [ ] `npm run tmdb:import` loads ~200 titles; running it twice creates no duplicates.
- [ ] The 6 self-hosted titles show **Play**; the rest show **Watch trailer** with a working YouTube embed.
- [ ] `GET /videos/:id/playback` on an information-only title returns 409 `/not-streamable`.
- [ ] Saving progress for a non-playable title returns 400.
- [ ] The About page shows the TMDB notice and every video's licence.
- [ ] (Week 16) MovieLens ratings load and map to at least 80% of the imported titles via `links.csv`.

## References

- TMDB API: https://developer.themoviedb.org/docs · Image basics: https://developer.themoviedb.org/docs/image-basics
- TMDB attribution and terms: https://www.themoviedb.org/api-terms-of-use
- YouTube IFrame Player API: https://developers.google.com/youtube/iframe_api_reference
- Blender Studio films: https://studio.blender.org/films/
- Internet Archive APIs: https://archive.org/developers/
- MovieLens datasets: https://grouplens.org/datasets/movielens/
- Pexels API: https://www.pexels.com/api/documentation/ · Pixabay API: https://pixabay.com/api/docs/
