import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { assignCallToAgent } from "./helpers";

export const agentStatusChange = mutation({
  args: {
    agentId: v.id("agents"),
    status: v.union(v.literal("available"), v.literal("busy"), v.literal("offline")),
  },
  handler: async (ctx, { agentId, status }) => {
    const agent = await ctx.db.get(agentId);
    if (!agent) throw new Error("Agent not found");

    await ctx.db.patch(agentId, { status });
    await ctx.db.insert("events", {
      type: status === "available" ? "AGENT_AVAILABLE" : status === "busy" ? "AGENT_BUSY" : "AGENT_OFFLINE",
      agentId,
      timestamp: Date.now(),
    });

    if (status === "available") {
      const queued = await ctx.db
        .query("queues")
        .withIndex("by_status_position", (q: any) => q.eq("status", "waiting"))
        .collect();

      for (const item of queued) {
        const call = await ctx.db.get(item.callId);
        if (!call || call.status === "ended" || call.status === "missed") {
          await ctx.db.patch(item._id, { status: "expired" });
          continue;
        }

        const result = await assignCallToAgent(ctx, call._id);
        if (result.assigned) break;
      }
    }
  },
});

export const connectCall = mutation({
  args: { sessionId: v.id("call_sessions") },
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.db.get(sessionId);
    if (!session) throw new Error("Session not found");

    await ctx.db.patch(sessionId, { status: "active" });
    await ctx.db.patch(session.callId, { status: "connected" });

    await ctx.db.insert("events", {
      type: "CALL_CONNECTED",
      callId: session.callId,
      agentId: session.agentId,
      sessionId,
      timestamp: Date.now(),
    });
  },
});

export const holdCall = mutation({
  args: { sessionId: v.id("call_sessions") },
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.db.get(sessionId);
    if (!session) throw new Error("Session not found");

    const now = Date.now();
    const holdHistory = [...session.holdHistory, { startedAt: now, endedAt: undefined }];

    await ctx.db.patch(sessionId, { status: "hold", holdHistory });
    await ctx.db.patch(session.callId, { status: "hold" });

    await ctx.db.insert("events", {
      type: "CALL_HOLD",
      callId: session.callId,
      agentId: session.agentId,
      sessionId,
      timestamp: now,
    });
  },
});

export const resumeCall = mutation({
  args: { sessionId: v.id("call_sessions") },
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.db.get(sessionId);
    if (!session) throw new Error("Session not found");

    const now = Date.now();
    const holdHistory = session.holdHistory.map((h: any) =>
      h.endedAt ? h : { ...h, endedAt: now },
    );

    await ctx.db.patch(sessionId, { status: "active", holdHistory });
    await ctx.db.patch(session.callId, { status: "connected" });

    await ctx.db.insert("events", {
      type: "CALL_RESUMED",
      callId: session.callId,
      agentId: session.agentId,
      sessionId,
      timestamp: now,
    });
  },
});

export const endCall = mutation({
  args: { sessionId: v.id("call_sessions") },
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.db.get(sessionId);
    if (!session) throw new Error("Session not found");

    const now = Date.now();

    await ctx.db.patch(sessionId, { status: "ended", endedAt: now });
    await ctx.db.patch(session.callId, { status: "ended", endedAt: now });
    await ctx.db.patch(session.agentId, { status: "available" });

    await ctx.db.insert("events", {
      type: "CALL_ENDED",
      callId: session.callId,
      agentId: session.agentId,
      sessionId,
      timestamp: now,
    });

    await ctx.db.insert("reviews", {
      sessionId,
      callId: session.callId,
      agentId: session.agentId,
      tags: [],
      status: "pending",
      createdAt: now,
    });
  },
});
