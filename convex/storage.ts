import { v } from "convex/values";
import { action, mutation } from "./_generated/server";
import { api } from "./_generated/api";

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveRecording = mutation({
  args: {
    storageId: v.string(),
    sessionId: v.id("call_sessions"),
    callId: v.id("calls"),
    duration: v.optional(v.number()),
  },
  handler: async (ctx, { storageId, sessionId, callId, duration }) => {
    const existing = await ctx.db
      .query("recordings")
      .withIndex("by_session", (q: any) => q.eq("sessionId", sessionId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { storageId, duration });
      return existing._id;
    }

    return await ctx.db.insert("recordings", {
      sessionId,
      callId,
      storageId,
      duration,
      startedAt: Date.now(),
    });
  },
});



