import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

export const ingestCallEvent = mutation({
  args: {
    source: v.union(v.literal("asterisk"), v.literal("twilio")),
    callerNumber: v.string(),
    sipLineId: v.string(),
    sourceCallId: v.string(),
    eventType: v.string(),
    requiredSkillTag: v.optional(v.string()),
    ivrLanguage: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const idempotencyKey = `${args.source}:${args.sourceCallId}:${args.eventType}`;

    const existing = await ctx.db
      .query("events")
      .withIndex("by_idempotency", (q) => q.eq("idempotencyKey", idempotencyKey))
      .first();

    if (existing) return { deduplicated: true, eventId: existing._id };

    const timestamp = Date.now();

    const eventId = await ctx.db.insert("events", {
      type: normalizeEventType(args.eventType),
      callId: undefined,
      agentId: undefined,
      timestamp,
      payload: args.metadata,
      idempotencyKey,
    });

    let callId: Id<"calls"> | undefined;
    const existingCall = await ctx.db
      .query("calls")
      .withIndex("by_source", (q) =>
        q.eq("source", args.source).eq("sourceCallId", args.sourceCallId),
      )
      .first();

    if (existingCall) {
      callId = existingCall._id;
      const newStatus = deriveCallStatus(args.eventType, existingCall.status);
      if (newStatus && newStatus !== existingCall.status) {
        await ctx.db.patch(existingCall._id, { status: newStatus });
      }
    } else {
      callId = await ctx.db.insert("calls", {
        source: args.source,
        callerNumber: args.callerNumber,
        sipLineId: args.sipLineId,
        sourceCallId: args.sourceCallId,
        status: "incoming",
        requiredSkillTag: args.requiredSkillTag,
        ivrLanguage: args.ivrLanguage,
        metadata: args.metadata,
        startedAt: timestamp,
      });
    }

    if (callId) {
      await ctx.db.patch(eventId, { callId });
    }

    return { deduplicated: false, eventId, callId };
  },
});

function normalizeEventType(raw: string): Doc<"events">["type"] {
  const map: Record<string, Doc<"events">["type"]> = {
    NEW_CHANNEL: "CALL_INCOMING",
    NEW_STATE: "CALL_INCOMING",
    RINGING: "CALL_INCOMING",
    ANSWER: "CALL_CONNECTED",
    HOLD: "CALL_HOLD",
    UNHOLD: "CALL_RESUMED",
    TRANSFER: "CALL_TRANSFER",
    HANGUP: "CALL_ENDED",
    LINKEDID_END: "CALL_ENDED",
    "call.initiate": "CALL_INCOMING",
    "call.ringing": "CALL_INCOMING",
    "call.answered": "CALL_CONNECTED",
    "call.completed": "CALL_ENDED",
  };
  return map[raw] ?? "CALL_INCOMING";
}

function deriveCallStatus(
  eventType: string,
  currentStatus: Doc<"calls">["status"],
): Doc<"calls">["status"] | null {
  const statusMap: Record<string, Doc<"calls">["status"]> = {
    NEW_CHANNEL: "incoming",
    RINGING: "incoming",
    ANSWER: "connected",
    "call.answered": "connected",
    HOLD: "hold",
    UNHOLD: "connected",
    TRANSFER: "transferring",
    "call.transfer": "transferring",
    HANGUP: "ended",
    LINKEDID_END: "ended",
    "call.completed": "ended",
  };

  const target = statusMap[eventType];
  if (!target) return null;

  if (currentStatus === "ended" || currentStatus === "missed") return null;

  return target;
}
