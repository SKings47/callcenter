import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getAgentActiveSession = query({
  args: { agentId: v.optional(v.id("agents")) },
  handler: async (ctx, { agentId }) => {
    if (!agentId) return null;

    const sessions = await ctx.db
      .query("call_sessions")
      .withIndex("by_agent", (q: any) => q.eq("agentId", agentId))
      .collect();

    const active = sessions.find(
      (s: any) => s.status === "active" || s.status === "hold" || s.status === "connecting",
    );
    if (!active) return null;

    const call = await ctx.db.get(active.callId) as any;
    const transcriptions = await ctx.db
      .query("transcriptions")
      .withIndex("by_session", (q: any) => q.eq("sessionId", active._id))
      .collect();

    const recordings = await ctx.db
      .query("recordings")
      .withIndex("by_session", (q: any) => q.eq("sessionId", active._id))
      .collect();

    return {
      session: active,
      call,
      transcriptions,
      recordings,
    };
  },
});

export const transferCall = mutation({
  args: {
    sessionId: v.id("call_sessions"),
    fromAgentId: v.id("agents"),
    toAgentId: v.id("agents"),
  },
  handler: async (ctx, { sessionId, fromAgentId, toAgentId }) => {
    const session = await ctx.db.get(sessionId);
    if (!session) throw new Error("Session not found");

    const toAgent = await ctx.db.get(toAgentId);
    if (!toAgent || toAgent.status !== "available") throw new Error("Target agent not available");

    const now = Date.now();

    await ctx.db.patch(session._id, {
      status: "ended",
      endedAt: now,
      transferHistory: [
        ...session.transferHistory,
        { fromAgentId, toAgentId, timestamp: now },
      ],
    });

    await ctx.db.patch(session.callId, { status: "transferring" });
    await ctx.db.patch(fromAgentId, { status: "available" });
    await ctx.db.patch(toAgentId, { status: "busy" });

    const newSessionId = await ctx.db.insert("call_sessions", {
      callId: session.callId,
      agentId: toAgentId,
      status: "connecting",
      startedAt: now,
      holdHistory: [],
      transferHistory: [],
    });

    await ctx.db.insert("events", {
      type: "CALL_TRANSFER",
      callId: session.callId,
      agentId: toAgentId,
      sessionId: newSessionId,
      timestamp: now,
      payload: { fromAgentId, toAgentId },
    });

    return { newSessionId };
  },
});

export const updateSessionNotes = mutation({
  args: {
    sessionId: v.id("call_sessions"),
    notes: v.string(),
  },
  handler: async (ctx, { sessionId, notes }) => {
    await ctx.db.patch(sessionId, { agentNotes: notes });
  },
});

export const updateSessionTags = mutation({
  args: {
    sessionId: v.id("call_sessions"),
    tags: v.array(v.string()),
  },
  handler: async (ctx, { sessionId, tags }) => {
    await ctx.db.patch(sessionId, { tags });
  },
});

export const addTranscriptionSegment = mutation({
  args: {
    sessionId: v.id("call_sessions"),
    speaker: v.union(v.literal("caller"), v.literal("agent")),
    text: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    confidence: v.optional(v.number()),
  },
  handler: async (ctx, { sessionId, speaker, text, startTime, endTime, confidence }) => {
    const existing = await ctx.db
      .query("transcriptions")
      .withIndex("by_session", (q: any) => q.eq("sessionId", sessionId))
      .first();

    const segment = { speaker, text, startTime, endTime, confidence };

    if (existing) {
      await ctx.db.patch(existing._id, {
        segments: [...existing.segments, segment],
        status: "processing",
      });
    } else {
      const callSession = await ctx.db.get(sessionId);
      if (!callSession) throw new Error("Session not found");

      await ctx.db.insert("transcriptions", {
        sessionId,
        callId: callSession.callId,
        segments: [segment],
        status: "processing",
      });
    }
  },
});
