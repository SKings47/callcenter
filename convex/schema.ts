import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  agents: defineTable({
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal("agent"), v.literal("supervisor"), v.literal("admin")),
    status: v.union(v.literal("available"), v.literal("busy"), v.literal("offline")),
    skillTags: v.array(v.string()),
    teamId: v.optional(v.id("teams")),
    imageUrl: v.optional(v.string()),
    lastAssignedAt: v.optional(v.number()),
    passwordHash: v.optional(v.string()),
    tokenIdentifier: v.optional(v.string()),
  })
    .index("by_email", ["email"])
    .index("by_status", ["status"])
    .index("by_team", ["teamId"])
    .index("by_skill", ["skillTags"])
    .index("by_token", ["tokenIdentifier"]),

  teams: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
  }),

  calls: defineTable({
    source: v.union(v.literal("asterisk"), v.literal("twilio")),
    callerNumber: v.string(),
    sipLineId: v.string(),
    status: v.union(
      v.literal("incoming"),
      v.literal("queued"),
      v.literal("assigned"),
      v.literal("connected"),
      v.literal("hold"),
      v.literal("transferring"),
      v.literal("ended"),
      v.literal("missed"),
    ),
    requiredSkillTag: v.optional(v.string()),
    ivrLanguage: v.optional(v.string()),
    sourceCallId: v.string(),
    metadata: v.optional(v.any()),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
  })
    .index("by_source", ["source", "sourceCallId"])
    .index("by_status", ["status"])
    .index("by_skill", ["requiredSkillTag"]),

  queues: defineTable({
    callId: v.id("calls"),
    requiredSkill: v.optional(v.string()),
    preferredLanguage: v.optional(v.string()),
    enteredAt: v.number(),
    priority: v.optional(v.number()),
    status: v.union(v.literal("waiting"), v.literal("assigned"), v.literal("expired")),
  })
    .index("by_call", ["callId"])
    .index("by_status_position", ["status", "enteredAt"])
    .index("by_skill", ["requiredSkill"]),

  call_sessions: defineTable({
    callId: v.id("calls"),
    agentId: v.id("agents"),
    status: v.union(
      v.literal("connecting"),
      v.literal("active"),
      v.literal("hold"),
      v.literal("transferring"),
      v.literal("ended"),
    ),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    holdHistory: v.array(
      v.object({
        startedAt: v.number(),
        endedAt: v.optional(v.number()),
      }),
    ),
    transferHistory: v.array(
      v.object({
        fromAgentId: v.id("agents"),
        toAgentId: v.id("agents"),
        timestamp: v.number(),
      }),
    ),
    agentNotes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  })
    .index("by_call", ["callId"])
    .index("by_agent", ["agentId"])
    .index("by_status", ["status"]),

  recordings: defineTable({
    sessionId: v.id("call_sessions"),
    callId: v.id("calls"),
    callerTrack: v.optional(v.string()),
    agentTrack: v.optional(v.string()),
    storageId: v.optional(v.string()),
    duration: v.optional(v.number()),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    transferContinuity: v.optional(v.boolean()),
  })
    .index("by_session", ["sessionId"])
    .index("by_call", ["callId"]),

  transcriptions: defineTable({
    sessionId: v.id("call_sessions"),
    callId: v.id("calls"),
    segments: v.array(
      v.object({
        speaker: v.union(v.literal("caller"), v.literal("agent")),
        text: v.string(),
        startTime: v.number(),
        endTime: v.number(),
        confidence: v.optional(v.number()),
      }),
    ),
    language: v.optional(v.string()),
    status: v.union(v.literal("processing"), v.literal("completed"), v.literal("failed")),
    rawText: v.optional(v.string()),
  })
    .index("by_session", ["sessionId"])
    .index("by_call", ["callId"]),

  reviews: defineTable({
    sessionId: v.id("call_sessions"),
    callId: v.id("calls"),
    agentId: v.id("agents"),
    supervisorId: v.optional(v.id("agents")),
    score: v.optional(v.number()),
    outcome: v.optional(
      v.union(
        v.literal("resolved"),
        v.literal("escalated"),
        v.literal("follow_up"),
        v.literal("unresolved"),
      ),
    ),
    tags: v.array(v.string()),
    agentNotes: v.optional(v.string()),
    supervisorNotes: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("in_review"),
      v.literal("completed"),
    ),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_session", ["sessionId"])
    .index("by_agent", ["agentId"])
    .index("by_supervisor", ["supervisorId"])
    .index("by_status", ["status"]),

  events: defineTable({
    type: v.union(
      v.literal("CALL_INCOMING"),
      v.literal("CALL_QUEUED"),
      v.literal("CALL_ASSIGNED"),
      v.literal("CALL_CONNECTED"),
      v.literal("CALL_HOLD"),
      v.literal("CALL_RESUMED"),
      v.literal("CALL_TRANSFER"),
      v.literal("CALL_ENDED"),
      v.literal("CALL_MISSED"),
      v.literal("AGENT_AVAILABLE"),
      v.literal("AGENT_BUSY"),
      v.literal("AGENT_OFFLINE"),
    ),
    callId: v.optional(v.id("calls")),
    agentId: v.optional(v.id("agents")),
    sessionId: v.optional(v.id("call_sessions")),
    timestamp: v.number(),
    payload: v.optional(v.any()),
    idempotencyKey: v.optional(v.string()),
  })
    .index("by_type", ["type", "timestamp"])
    .index("by_call", ["callId", "timestamp"])
    .index("by_agent", ["agentId", "timestamp"])
    .index("by_idempotency", ["idempotencyKey"]),
});
