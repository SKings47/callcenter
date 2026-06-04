import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const saveTranscriptionSegments = mutation({
  args: {
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
    rawText: v.optional(v.string()),
  },
  handler: async (ctx, { sessionId, callId, segments, language, rawText }) => {
    const existing = await ctx.db
      .query("transcriptions")
      .withIndex("by_session", (q: any) => q.eq("sessionId", sessionId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        segments,
        language: language ?? existing.language,
        rawText,
        status: "completed",
      });
    } else {
      await ctx.db.insert("transcriptions", {
        sessionId,
        callId,
        segments,
        language,
        rawText,
        status: "completed",
      });
    }
  },
});

export const saveTranscriptionError = mutation({
  args: {
    sessionId: v.id("call_sessions"),
    callId: v.id("calls"),
    error: v.string(),
  },
  handler: async (ctx, { sessionId, callId, error }) => {
    const existing = await ctx.db
      .query("transcriptions")
      .withIndex("by_session", (q: any) => q.eq("sessionId", sessionId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { status: "failed" });
    } else {
      await ctx.db.insert("transcriptions", {
        sessionId,
        callId,
        segments: [],
        status: "failed",
        rawText: error,
      });
    }
  },
});
