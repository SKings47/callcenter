# Graphify Analysis: routing-engine

## Step 1 — System Decomposition

- **Skill matcher** — filters Available agents by requiredSkillTag
- **Round-robin selector** — picks least-recently-assigned from skill-matched set
- **Queue manager** — FIFO queue with skill re-evaluation triggers
- **Queue re-evaluator** — runs on agent status change events

## Step 2 — Data Flow Modeling

1. `CALL_INCOMING` event → extract requiredSkillTag
2. Query `agents` with status=available AND skillTags contains requiredSkillTag
3. If results > 0: sort by lastAssignedAt ASC, pick first → create `call_sessions`
4. If results === 0: insert into `queues` with status=waiting
5. On `AGENT_AVAILABLE` event: scan queues for matching skill → assign oldest

## Step 3 — Optimization Pass

- Index: agents by status + skillTags (compound index would be ideal)
- Use `lastAssignedAt` for fair round-robin distribution
- On queue re-evaluation, process only first N queued items to avoid full scan
- Convex atomic mutation for assign-to-agent to prevent race conditions

## Step 4 — Edge Case Analysis

- [x] No agents with matching skill → stay queued, wait for any skill match
- [x] Multiple agents become available simultaneously → process queue in order
- [x] Agent goes offline mid-queue → skip that agent, try next
- [x] Caller hangs up while queued → mark queue as expired
- [x] Skill tag mismatch between call and all agents → queue with null skill, assign any agent
