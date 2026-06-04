import { v } from "convex/values";
import { query } from "./_generated/server";

export const getActiveCalls = query({
  handler: async (ctx) => {
    const calls = await ctx.db
      .query("calls")
      .withIndex("by_status", (q: any) =>
        q.eq("status", "connected"),
      )
      .collect();

    const enriched = await Promise.all(
      calls.map(async (call) => {
        const sessions = await ctx.db
          .query("call_sessions")
          .withIndex("by_call", (q: any) => q.eq("callId", call._id))
          .collect();

        const activeSession = sessions.find((s: any) => s.status === "active" || s.status === "hold");
        const agent = activeSession ? await ctx.db.get(activeSession.agentId) : null;

        return {
          ...call,
          agentName: agent?.name ?? null,
          agentId: agent?._id ?? null,
          sessionId: activeSession?._id ?? null,
          sessionStatus: activeSession?.status ?? null,
        };
      }),
    );

    return enriched;
  },
});

export const getCallHistory = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const calls = await ctx.db
      .query("calls")
      .order("desc")
      .take(limit ?? 50);

    return calls;
  },
});

export const getDashboardStats = query({
  handler: async (ctx) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayTs = todayStart.getTime();

    const allCalls = await ctx.db.query("calls").collect();
    const todayCalls = allCalls.filter((c: any) => c.startedAt >= todayTs);
    const answered = todayCalls.filter((c: any) => c.status === "ended" || c.status === "connected");
    const missed = todayCalls.filter((c: any) => c.status === "missed");
    const agents = await ctx.db.query("agents").collect();
    const activeSessions = await ctx.db
      .query("call_sessions")
      .withIndex("by_status", (q: any) => q.eq("status", "active"))
      .collect();

    const durations = answered
      .filter((c: any) => c.endedAt && c.startedAt)
      .map((c: any) => c.endedAt - c.startedAt);

    const avgDuration = durations.length > 0
      ? Math.round(durations.reduce((a: number, b: number) => a + b, 0) / durations.length)
      : 0;

    return {
      totalToday: todayCalls.length,
      answered: answered.length,
      missed: missed.length,
      activeCalls: activeSessions.length,
      availableAgents: agents.filter((a: any) => a.status === "available").length,
      busyAgents: agents.filter((a: any) => a.status === "busy").length,
      avgDuration,
    };
  },
});
