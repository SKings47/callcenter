import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assignCallToAgent } from "./helpers";

export const assignCall = mutation({
  args: { callId: v.id("calls") },
  handler: async (ctx, { callId }) => {
    return assignCallToAgent(ctx, callId);
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
