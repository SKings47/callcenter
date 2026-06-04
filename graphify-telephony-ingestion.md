# Graphify Analysis: telephony-ingestion

## Step 1 — System Decomposition

- **Twilio webhook handler** — receives SIP call events from Twilio → Asterisk
- **Asterisk event parser** — reads AMI events / AGI variables from Asterisk
- **Normalizer** — converts both sources into unified `CallEvent`
- **Idempotency layer** — deduplicates events using source + sourceCallId
- **Convex ingestion** — writes normalized event + creates call record

## Step 2 — Data Flow Modeling

1. Twilio sends SIP INVITE → Asterisk
2. Asterisk processes call → emits AMI event (Newchannel, Newstate, etc.)
3. Webhook receives event → normalizer creates CallEvent
4. Idempotency check: lookup `events` table by idempotencyKey
5. If new: write `events` row + create/update `calls` row
6. If duplicate: discard (200 OK response still sent to provider)

## Step 3 — Optimization Pass

- Use compound idempotencyKey = `${source}:${sourceCallId}:${eventType}`
- Batch DB writes when possible (Convex mutation batches)
- Parse only essential fields from raw webhook payloads
- Return 200 quickly to avoid provider retries

## Step 4 — Edge Case Analysis

- [x] Duplicate webhook delivery → idempotency check prevents double-insert
- [x] Out-of-order events (e.g., answer before ring) → state machine validation
- [x] Stale events (call already ended) → reject by call status check
- [x] Missing fields in webhook payload → graceful fallback / defaults
- [x] Provider timeout → respond 200 immediately, process async
