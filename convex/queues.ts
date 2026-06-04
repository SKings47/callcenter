import { v } from "convex/values";
import { query } from "./_generated/server";

export const getActiveQueue = query({
  handler: async (ctx) => {
    const items = await ctx.db
      .query("queues")
      .withIndex("by_status_position", (q) => q.eq("status", "waiting"))
      .collect();

    const enriched = await Promise.all(
      items.map(async (item) => {
        const call = await ctx.db.get(item.callId);
        return {
          ...item,
          callerNumber: call?.callerNumber ?? "unknown",
          source: call?.source ?? "unknown",
          ivrLanguage: call?.ivrLanguage,
          timeInQueue: Date.now() - item.enteredAt,
        };
      }),
    );

    return enriched;
  },
});

export const getQueuePosition = query({
  args: { callId: v.id("calls") },
  handler: async (ctx, { callId }) => {
    const item = await ctx.db
      .query("queues")
      .withIndex("by_call", (q) => q.eq("callId", callId))
      .first();
    if (!item) return null;

    const before = await ctx.db
      .query("queues")
      .withIndex("by_status_position", (q) => q.eq("status", "waiting"))
      .filter((q) => q.lt(q.field("enteredAt"), item.enteredAt))
      .collect();

    return { position: before.length + 1, total: before.length + 1, enteredAt: item.enteredAt };
  },
});
