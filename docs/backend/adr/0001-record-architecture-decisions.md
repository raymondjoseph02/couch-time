# ADR 0001: Record architecture decisions as ADRs

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-10-04 |
| Phase | Week 1 |
| Related | [PRD](../PRD.md) |

## Context

The backend will take about two months to build, and many choices made in week 1 (database, auth model, folder layout) will shape weeks 2 to 9. Months later it is hard to remember *why* something was done a certain way. Without a record, you either repeat old debates or, worse, change something without knowing what it was protecting.

This project is also a learning exercise. Writing down the reasoning is one of the best ways to check that you actually understand a decision.

## Decision

We will record every significant technical decision as an **Architecture Decision Record** in `docs/backend/adr/`, using [the template](./0000-template.md).

A decision is **significant** if any of these is true:
- It is expensive to reverse (database, auth model, storage provider).
- It affects more than one module.
- Someone reasonable could have chosen differently.
- You spent more than about 30 minutes deciding.

ADRs are immutable once accepted. Changing your mind means writing a new ADR that supersedes the old one.

## Alternatives considered

| Option | Pros | Cons | Why not chosen |
|---|---|---|---|
| No documentation | Zero effort. | Reasons are lost; the same debate happens again. | Defeats the learning goal. |
| One big design doc | Everything in one place. | Becomes stale; history of *changes* is lost. | The PRD covers the "what"; ADRs cover the "why" over time. |
| Wiki / Notion | Easy to edit. | Lives apart from the code; not versioned with it. | ADRs belong next to the code they explain. |

## Consequences

**Good:** reasons survive; reviewers (and future you) can see trade-offs; superseded ADRs show how your thinking grew.

**Bad / costs:** about 20 minutes per decision; you have to discipline yourself to write them *before* building.

## What you'll learn

- How engineering teams communicate decisions.
- Writing trade-offs explicitly instead of "X is best".

## Done when

- [ ] You've written at least two ADRs yourself (the package manager in week 1; the HLS segment-auth method in week 6).
- [ ] Every ADR here has its status updated as you implement it.

## References

- Michael Nygard, *Documenting Architecture Decisions* (2011): https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions
- https://adr.github.io
