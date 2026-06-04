import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assignCallToAgent } from "./helpers";

export const assignCall = mutation({
  args: { callId: v.id("calls") },
  handler: async (ctx, { callId }) => {
    return assignCallToAgent(ctx, callId);
  },
});

export const assignToAgent = mutation({
  args: {
    callId: v.id("calls"),
    agentId: v.id("agents"),
  },
  handler: async (ctx, { callId, agentId }) => {
    const call = await ctx.db.get(callId);
    if (!call || (call.status !== "incoming" && call.status !== "queued")) {
      return { assigned: false, reason: "call_not_available" };
    }

    const agent = await ctx.db.get(agentId);
    if (!agent || agent.status !== "available") {
      return { assigned: false, reason: "agent_not_available" };
    }

    const now = Date.now();

    await ctx.db.patch(call._id, { status: "assigned" });
    await ctx.db.patch(agentId, { status: "busy", lastAssignedAt: now });

    const sessionId = await ctx.db.insert("call_sessions", {
      callId: call._id,
      agentId,
      status: "connecting",
      startedAt: now,
      holdHistory: [],
      transferHistory: [],
    });

    await ctx.db.insert("events", {
      type: "CALL_ASSIGNED",
      callId: call._id,
      agentId,
      sessionId,
      timestamp: now,
    });

    const queueItem = await ctx.db
      .query("queues")
      .withIndex("by_call", (q: any) => q.eq("callId", call._id))
      .first();
    if (queueItem) {
      await ctx.db.patch(queueItem._id, { status: "assigned" });
    }

    return { assigned: true, sessionId };
  },
});

export const routeIncomingCall = mutation({
  args: { callId: v.id("calls") },
  handler: async (ctx, { callId }) => {
    const result = await assignCallToAgent(ctx, callId);

    if (!result.assigned) {
      const call = await ctx.db.get(callId);
      if (!call) return { assigned: false, reason: "call_not_found" };

      await ctx.db.patch(callId, { status: "queued" });

      const existingQueue = await ctx.db
        .query("queues")
        .withIndex("by_call", (q: any) => q.eq("callId", callId))
        .first();

      if (!existingQueue) {
        await ctx.db.insert("queues", {
          callId,
          requiredSkill: call.requiredSkillTag,
          preferredLanguage: call.ivrLanguage,
          enteredAt: Date.now(),
          status: "waiting",
        });
      }

      await ctx.db.insert("events", {
        type: "CALL_QUEUED",
        callId,
        timestamp: Date.now(),
      });
    }

    return result;
  },
});

export const reEvaluateQueue = mutation({
  handler: async (ctx) => {
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
  },
});

export const getEligibleAgents = query({
  args: { skillTag: v.optional(v.string()) },
  handler: async (ctx, { skillTag }) => {
    const agents = await ctx.db
      .query("agents")
      .withIndex("by_status", (q: any) => q.eq("status", "available"))
      .collect();

    if (skillTag) {
      return agents.filter((a: any) => a.skillTags.includes(skillTag));
    }
    return agents;
  },
});
