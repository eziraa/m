# Bingo Platform Backend Architecture + Drizzle Schema v2

## Scope

This document defines the optimized backend data model and execution architecture for:

- 10,000+ concurrent users
- low-latency room/session gameplay
- Telegram Mini App client
- Telegraf bot integration
- strict server-authoritative validation for bingo claims

Stack:

- Node.js + Express.js
- PostgreSQL + Drizzle ORM
- Socket.IO + Redis adapter
- Telegraf (Telegram integration)

## 1. Architecture (Runtime Components)

- API Gateway (Express): REST APIs, auth, admin, agent, user actions.
- Realtime Gateway (Socket.IO): room/session events and low-latency game stream.
- Game Engine: room manager, session manager, board generator, number caller, bingo validator, payout processor.
- Telegram Service (Telegraf): webhook updates, onboarding, deep links, referral routing, notifications.
- Redis: Socket.IO adapter pub/sub, distributed leases, ephemeral session cache.
- PostgreSQL: source of truth for users, rooms, sessions, boards, claims, ledger.

## 2. Core Design Rules

- All authority is server-side.
- Client-side win detection is advisory only.
- Server validates each bingo claim transactionally.
- One active session per room at a time.
- One winner per session (current business rule).
- No global socket broadcasts; room/session scoped emits only.

## 3. Drizzle Schema v2 (Proposed)

Below is a normalized game-core model that can coexist with existing referral/payment tables.

### 3.1 Enums

- user_role: ADMIN | AGENT | USER
- session_status: waiting | countdown | playing | finished | cancelled
- room_status: active | suspended | archived
- claim_status: pending | accepted | rejected
- pattern_type: row | column | diagonal | full_house
- ledger_type: deposit | board_purchase | session_win | commission | withdrawal | adjustment | referral_reward
- ledger_status: posted | reversed

### 3.2 Users and Agent Mapping

users

- id uuid pk
- role user_role not null
- telegram_id text unique
- referral_code text unique (for AGENT)
- referred_by_agent_id uuid null fk users(id)
- email/username/profile fields
- created_at, updated_at

Indexes

- unique(telegram_id)
- unique(referral_code)
- index(role, created_at)
- index(referred_by_agent_id)

Notes

- Keep AGENT as users.role=AGENT.
- Every USER should have referred_by_agent_id set at onboarding.

### 3.3 Rooms

rooms

- id uuid pk
- agent_id uuid not null fk users(id)
- name text not null
- description text
- board_price_cents bigint not null
- status room_status not null default active
- max_players integer null
- created_at, updated_at

Indexes

- index(agent_id, status, created_at)
- index(status, created_at)

Constraint

- agent_id must reference role=AGENT at service layer (or trigger if desired).

### 3.4 Game Sessions

game_sessions

- id uuid pk
- room_id uuid not null fk rooms(id)
- agent_id uuid not null fk users(id)
- status session_status not null default waiting
- countdown_seconds integer not null default 15
- call_interval_ms integer not null default 3000
- total_numbers integer not null default 75
- current_seq integer not null default 0
- current_number integer null
- started_at timestamptz null
- finished_at timestamptz null
- winner_user_id uuid null fk users(id)
- version integer not null default 0
- created_at, updated_at

Indexes

- index(room_id, status, created_at)
- index(agent_id, status, created_at)
- index(status, created_at)

Critical partial unique index

- unique(room_id) where status in ('countdown','playing')

Purpose

- Enforces one active session per room.

### 3.5 Called Numbers (Append-Only)

session_called_numbers

- id bigserial pk
- session_id uuid not null fk game_sessions(id) on delete cascade
- seq integer not null
- number integer not null
- called_at timestamptz not null default now()

Indexes/Constraints

- unique(session_id, seq)
- unique(session_id, number)
- index(session_id, called_at)

Purpose

- Avoids expensive jsonb rewrites in game_sessions.
- Easy replay for reconnecting clients.

### 3.6 Boards (Purchased Boards)

boards

- id uuid pk
- session_id uuid not null fk game_sessions(id) on delete cascade
- room_id uuid not null fk rooms(id)
- user_id uuid not null fk users(id)
- board_no integer not null
- board_matrix jsonb not null
- board_hash text not null
- purchase_amount_cents bigint not null
- created_at timestamptz not null default now()

Indexes/Constraints

- index(session_id, user_id)
- index(user_id, created_at)
- unique(session_id, board_no)
- unique(session_id, board_hash)

Notes

- board_matrix is immutable after purchase.
- board_hash helps dedupe accidental duplicates.

### 3.7 Bingo Claims

bingo_claims

- id uuid pk
- session_id uuid not null fk game_sessions(id) on delete cascade
- room_id uuid not null fk rooms(id)
- user_id uuid not null fk users(id)
- board_id uuid not null fk boards(id)
- pattern pattern_type not null
- marked_cells jsonb not null
- client_last_seq integer not null
- claim_status claim_status not null default pending
- rejection_reason text null
- idempotency_key text not null
- created_at timestamptz not null default now()
- resolved_at timestamptz null

Indexes/Constraints

- unique(session_id, user_id, idempotency_key)
- index(session_id, created_at)
- index(user_id, created_at)
- index(claim_status, created_at)

Purpose

- Auditable anti-cheat trail.
- Idempotent retries supported.

### 3.8 Session Winners

session_winners

- id uuid pk
- session_id uuid not null fk game_sessions(id) on delete cascade
- room_id uuid not null fk rooms(id)
- user_id uuid not null fk users(id)
- board_id uuid not null fk boards(id)
- claim_id uuid not null fk bingo_claims(id)
- payout_cents bigint not null
- commission_cents bigint not null default 0
- created_at timestamptz not null default now()

Indexes/Constraints

- unique(session_id)
- unique(claim_id)
- index(user_id, created_at)

Purpose

- Guarantees single winner at DB level.

### 3.9 Wallet Ledger (Immutable)

wallet_ledger

- id uuid pk
- user_id uuid not null fk users(id)
- agent_id uuid null fk users(id)
- session_id uuid null fk game_sessions(id)
- board_id uuid null fk boards(id)
- entry_type ledger_type not null
- amount_cents bigint not null
- balance_after_cents bigint null
- currency varchar(8) not null default 'ETB'
- status ledger_status not null default posted
- idempotency_key text not null
- metadata jsonb not null default '{}'
- created_at timestamptz not null default now()

Indexes/Constraints

- unique(user_id, idempotency_key)
- index(user_id, created_at)
- index(agent_id, created_at)
- index(session_id, created_at)

Notes

- For scale and integrity, use immutable entries, not balance overwrites.

### 3.10 Telegram Integration Tables

telegram_updates

- id bigserial pk
- update_id bigint not null
- event_type varchar(64) not null
- telegram_user_id text not null
- payload jsonb not null default '{}'
- processed_at timestamptz null
- created_at timestamptz not null default now()

Indexes/Constraints

- unique(update_id, event_type)
- index(telegram_user_id, created_at)

telegram_identities (optional if keeping only users.telegram_id)

- user_id uuid pk fk users(id)
- telegram_id text unique not null
- username text
- first_name text
- last_name text
- language_code text
- last_seen_at timestamptz
- created_at, updated_at

Purpose

- Idempotent Telegraf webhook processing.

## 4. Anti-Cheat Validation Algorithm (Server)

When call_bingo is received:

1. Verify auth and role USER.
2. Verify session status is playing.
3. Verify board ownership (board.user_id == requester and board.session_id == session).
4. Validate claimed pattern against server pattern engine.
5. Recompute required board numbers from pattern and board_matrix.
6. Confirm all required numbers exist in called numbers set for that session.
7. In one DB transaction:
   - insert bingo_claims row (pending)
   - lock session row for update
   - if winner exists, reject claim
   - if valid and no winner, insert session_winners, update game_sessions finished/winner, post ledger entries
   - resolve claim as accepted/rejected
8. Emit bingo_verified or bingo_rejected.

Complexity

- O(k) where k = pattern cell count (small), no full-board scans for all players.

## 5. Redis and Distributed Session Ownership

Keys

- session:owner:{sessionId} = {nodeId}:{token} (lease)
- session:state:{sessionId} = json snapshot (status, seq, current, called bitmap/set)

Lease protocol

- Owner acquires via SET NX EX.
- Owner renews every N seconds.
- If lease lost, stop caller loop immediately.
- New owner rebuilds state from DB + redis snapshot and resumes safely.

Socket scaling

- Use @socket.io/redis-adapter.
- Emissions to session/room channels propagate across nodes.

## 6. API Surface (Minimal)

Auth

- POST /auth/telegram/verify-init-data

Agent

- POST /agent/rooms
- POST /agent/rooms/:roomId/sessions
- POST /agent/sessions/:sessionId/start
- POST /agent/sessions/:sessionId/stop

User

- GET /rooms/available
- POST /sessions/:sessionId/boards/purchase
- GET /sessions/:sessionId/state
- POST /sessions/:sessionId/bingo-claims

Admin

- GET /admin/analytics/global
- PATCH /admin/rooms/:roomId/suspend
- PATCH /admin/agents/:agentId/suspend

## 7. Socket.IO Event Contract

Client -> Server

- join_room { roomId }
- join_session { sessionId }
- buy_board { sessionId, quantity, idempotencyKey }
- call_bingo { sessionId, boardId, markedCells, winningPattern, idempotencyKey }
- sync_me { sessionId, lastSeq }

Server -> Client

- room_joined
- session_countdown
- session_started
- number_called
- bingo_verified
- bingo_rejected
- game_finished
- session_snapshot

## 8. Migration Plan (Order)

1. Create new enums (role/status/claim/pattern/ledger).
2. Add/adjust users columns/indexes (telegram/referral mapping cleanups).
3. Create rooms v2 constraints/indexes.
4. Create game_sessions v2 + partial unique active-session index.
5. Create session_called_numbers.
6. Create boards.
7. Create bingo_claims.
8. Create session_winners.
9. Create wallet_ledger.
10. Create telegram_updates idempotent table.
11. Backfill from legacy tables (if existing production data).
12. Switch reads/writes to new tables via feature flag.
13. Decommission legacy hot-path columns (e.g., game_sessions.called_numbers jsonb).

## 9. Notes on Current Schema Issues to Fix

- Typo: game_sessions.agnet_id -> agent_id.
- Avoid mutable called_numbers jsonb in active loops.
- Add missing FK: board_selections.userId -> users.id (if retained temporarily).
- Normalize all money fields to cents where possible.
- Keep referral/payment tables but separate from hot game query paths.

## 10. Telegraf Integration Blueprint

- Use webhook endpoint: POST /telegram/webhook.
- Verify Telegram secret token header.
- Parse /start payload for referral code and room deep-links.
- Persist update id in telegram_updates first (idempotency guard).
- Publish outbound bot notifications asynchronously via queue worker.

## 11. Performance Guardrails

- No global emits.
- Max payload size limits on socket events.
- Rate limit call_bingo and buy_board.
- DB pool sizing and prepared statements.
- Background aggregation for analytics.
- Enable p99 latency monitoring for claim verification path.
