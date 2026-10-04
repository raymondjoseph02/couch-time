# ADR 0023: WebSockets (Socket.IO with the Redis adapter) for watch parties; Server-Sent Events for one-way streams

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-10-04 |
| Phase | Week 13 (watch party), Week 12 (SSE notifications), Week 17 (SSE for AI) |
| Related | [PRD §5.13](../PRD.md#513-watch-party), [ADR 0024](./0024-notifications-outbox.md), [ADR 0029](./0029-llm-integration-claude.md), [ADR 0014](./0014-redis-caching-and-rate-limiting.md) |

## Context

Three new features push data from the server *as it happens*:

1. **Watch party:** friends watch in sync. Play, pause and seek must propagate in under ~300 ms, both ways, plus a chat and emoji reactions.
2. **In-app notifications:** "New episode of X is out" appears without refreshing. One-way.
3. **AI assistant replies:** token-by-token streaming. One-way, request-scoped.

HTTP request/response can't do (1) well, and polling for (2)/(3) is wasteful. The API runs as several instances, so a message from a user connected to instance A must reach friends connected to instance B.

## Decision

**Bidirectional, rooms → WebSockets with Socket.IO**
- Namespace `/party`, one room per party (`party:{id}`).
- **Auth on connect:** the handshake carries the `access_token` cookie; verify it like `requireAuth`, and reject unauthenticated or kicked sockets.
- **Multi-instance:** `@socket.io/redis-adapter` (Redis pub/sub) broadcasts across instances.
- **Sync model:** the **host is authoritative**. The host's player emits `state { playing, position, at: serverTime }`. The server stamps it, stores the latest state in Redis (`party:{id}:state`) and broadcasts it. Clients correct drift: if `|localPosition − expected| > 0.5s`, seek; for smaller drift, nudge `playbackRate` (0.95–1.05). Late joiners read the stored state.
- **Clock sync:** clients estimate the offset to server time with a few ping/pong round trips (NTP-style).
- **Chat:** messages are rate-limited, length-capped and stored (last 200 per party) in Postgres for moderation; profanity filter optional.
- Parties: `watch_parties (id, host_profile_id, video_id, invite_code, status, created_at)` and `party_members`. Invites by code/link, expiring after 24 hours. Kids-profile rules still apply.

**One-way → Server-Sent Events (SSE)**
- `GET /me/notifications/stream` (week 12) and `POST /ai/assistant/chat` (week 17, streamed response) use `text/event-stream`.
- SSE is plain HTTP: it works through proxies, the browser reconnects automatically (`EventSource`), and resuming uses `Last-Event-ID`. Send a heartbeat comment every 25 seconds to keep proxies from closing idle connections.

**Infrastructure:** WebSockets need sticky sessions or the Redis adapter plus WebSocket-only transport. Use `transports: ['websocket']` to avoid long-polling stickiness. Check your platform supports WS (Fly.io and Railway do).

## Alternatives considered

| Option | Pros | Cons | Why not chosen |
|---|---|---|---|
| Raw `ws` library | Lighter; closer to the protocol. | Rooms, reconnection, acks and multi-instance fan-out are all yours to build. | Socket.IO lets you focus on sync logic. Try `ws` in a side exercise. |
| WebSockets for everything (incl. notifications, AI) | One mechanism. | More complex than needed for one-way streams; harder through some proxies. | Right tool per job. |
| Polling | Simplest. | Latency + wasted requests; useless for sync. | No. |
| Hosted realtime (Pusher, Ably, Liveblocks) | No infrastructure. | Cost; hides the learning. | The "buy" option. |
| WebRTC data channels (peer-to-peer) | Lowest latency. | NAT traversal, TURN servers; overkill. | Too complex. |

## Consequences

**Good:** real-time features without polling; scales across instances; SSE keeps the simple cases simple.

**Bad / costs:** long-lived connections change capacity planning (memory per socket); graceful shutdown must drain sockets; drift correction needs tuning on real networks.

## What you'll learn

- WebSocket vs SSE vs long-polling; connection lifecycles.
- Pub/sub fan-out across instances.
- Distributed state with one authority; clock-offset estimation; drift correction.
- Load-testing persistent connections (k6 WebSocket support, or Artillery).

## Done when

- [ ] Two browsers (and two API instances behind a local proxy) stay within 0.5 seconds of each other through play, pause and seek.
- [ ] A late joiner lands on the right position.
- [ ] A non-member can't join a party room even with a valid token.
- [ ] Killing one API instance → clients reconnect to the other and resync.

## References

- https://socket.io/docs/v4/
- https://socket.io/docs/v4/redis-adapter/
- https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events
- https://html.spec.whatwg.org/multipage/server-sent-events.html
