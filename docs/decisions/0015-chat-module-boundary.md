# 0015. Future chat: isolated Nest module with WebSocket gateway

Date: 2026-10-14 · Status: Accepted

## Context
In-app chat is explicitly post-MVP but must plug in without a rewrite.

## Decision
- Chat becomes `apps/api/src/modules/chat/` with its own Prisma models (`Conversation`, `Participant`,
  `Message`) referencing only `User.id`. No MVP table gets chat columns.
- Transport: `@nestjs/websockets` gateway with the Socket.IO adapter, authenticated by the same access JWT
  on the handshake. REST endpoints for history; WebSocket only for live events. Mobile uses the same.
- The gateway calls `ChatService`; other modules never call chat directly. The "Contact" feature of MVP
  stays as it is; chat is an additional channel, with `ContactReveal` as the natural hook ("Reveal" could
  later also "Start conversation").
- Horizontal scaling later: Redis adapter for Socket.IO, behind config.

## Consequences
Hosting: requires an always-on API host (ADR 0013). If the project is still on a sleeping free tier when
chat is wanted, the alternative is a managed realtime service (e.g. Supabase Realtime / Ably free tier)
with the Nest API still owning persistence and auth. Both options keep the module boundary above.
