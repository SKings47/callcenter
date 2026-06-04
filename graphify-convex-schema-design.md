# Graphify Analysis: convex-schema-design

## Step 1 — System Decomposition

- **Call lifecycle entities:** calls → queues → call_sessions → recordings → transcriptions → reviews
- **Agent system:** agents (auth, status, skills, teams)
- **Event stream:** events table for audit trail + real-time subscriptions
- **Analytics:** derived metrics from call + session data

## Step 2 — Data Flow Modeling

- Inbound call → `calls` table (status: incoming)
- No agent available → `queues` table (FIFO, skill-tagged)
- Agent assigned → `call_sessions` created (linked to call + agent)
- Session active → `recordings` (dual channel) + `transcriptions` populated
- Session ends → `reviews` created for QA
- `events` table logs every state transition (event sourcing pattern)

## Step 3 — Optimization Pass

- Normalize: separate `calls` from `sessions` (one call can be transferred, creating multiple sessions)
- Use Convex indexes on agentId, status, requiredSkillTag, queuePosition for fast queries
- `queues.position` as number for FIFO ordering
- Event deduplication via idempotency keys on `events`
- Avoid storing derived stats — compute from `calls` + `sessions` via Convex queries

## Step 4 — Edge Case Analysis

- [x] Call transfer → multiple sessions per call, recording must persist across sessions
- [x] Agent disconnect mid-call → session status + queue re-evaluation
- [x] Duplicate incoming events → dedupe by source + sourceId compound key
- [x] Queue overflow → maximum queue depth with rejection beyond limit
- [x] Concurrent assignments → use Convex atomic mutations + optimistic concurrency

## Design Decision

**Use defineSchema with defineTable, typed fields, and indexes on:** calls.source, calls.status, calls.requiredSkillTag, agents.status, agents.skillTags, queues.position, queues.requiredSkill, call_sessions.status, events.type, events.callId.
