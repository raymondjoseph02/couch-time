# ADR 0022: One `titles` table for movies and series, with seasons and episodes as playable videos

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-10-04 |
| Phase | Week 11 |
| Related | [PRD §5.11](../PRD.md#511-series-and-episodes), [ADR 0004](./0004-postgresql-database.md), [ADR 0015](./0015-watch-progress-and-events.md) |

## Context

Weeks 1–9 model only movies: one `videos` row = one playable file. TV series add structure: series → seasons → episodes. They also add new behaviour: "Continue Watching" should show the *series* with the next episode, "next episode" autoplay, and "skip intro" and "skip recap" buttons. We need a model that keeps one playback pipeline and still lets the catalogue show series as single cards.

## Decision

Split **what you browse** from **what you play**:

- `titles (id, kind enum('movie','series'), slug, title, description, release_year, maturity_rating, …)`: the browsable card. Genres, credits, images, ratings, search vectors and embeddings attach here.
- `seasons (id, title_id, number, name)`.
- `videos`: stays as the **playable unit** (transcode status, assets, duration, subtitles). New columns: `title_id`, nullable `season_id`, `episode_number`, and `markers jsonb` (`{ introStart, introEnd, recapEnd, creditsStart }`).
  - A movie = 1 title + 1 video. A series = 1 title + N seasons + M videos.
- Progress stays per **video** (episode). A series' Continue Watching card resolves to the **next unfinished episode**: the latest episode with progress, or if that one is completed, the following one.
- `GET /titles/:id/next-up` returns the episode to play; the player calls it at `creditsStart` to show "Next episode in 10s".
- Markers are entered by admins in v1, and suggested by the AI pipeline in week 18 ([ADR 0030](./0030-ai-media-enrichment-pipeline.md)).
- The API keeps `/videos/:id` for playback, and adds `/titles` for browsing. The frontend's `VideoCard` gains a `kind` badge.

**Migration:** create `titles` from the existing `videos` (one per movie, same id where possible), move the browse-level columns and relations over, and keep compatibility fields on `/videos` responses for one release.

## Alternatives considered

| Option | Pros | Cons | Why not chosen |
|---|---|---|---|
| Keep `videos` only, with a `parent_id` tree | Fewer tables. | Mixes browse and play concerns; awkward queries ("all top-level things"). | Separate tables make queries clear. |
| Separate `movies` and `series` tables | Explicit. | Every list/search/recommendation query must `UNION` two tables. | One `titles` table with a `kind` is simpler for discovery. |
| Single-table inheritance with many nullable columns | One table. | Messy constraints. | `titles` + `seasons` + `videos` is normalised and clear. |

## Consequences

**Good:** one transcode/playback path for everything; series feel natural in the UI; discovery queries hit one table.

**Bad / costs:** a real data migration (good practice); "next episode" logic needs careful tests (season boundaries, missing episodes).

## What you'll learn

- Modelling hierarchies relationally; when to split "catalogue" and "inventory" entities.
- Recursive or window queries for "next unfinished episode" (`LEAD()` over `(season_number, episode_number)`).
- API evolution without breaking an existing client.

## Done when

- [ ] Seed one 2-season series; finishing S1E10 makes Continue Watching show S2E1.
- [ ] "Skip intro" appears between `introStart` and `introEnd`.
- [ ] Old `/videos/:id` responses still work for the current frontend.

## References

- https://www.postgresql.org/docs/current/functions-window.html
