import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const setStatus = mutation({
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
  },
});

export const updateSkills = mutation({
  args: {
    agentId: v.id("agents"),
    skillTags: v.array(v.string()),
  },
  handler: async (ctx, { agentId, skillTags }) => {
    await ctx.db.patch(agentId, { skillTags });
  },
});

export const listAgents = query({
  args: {
    status: v.optional(v.union(v.literal("available"), v.literal("busy"), v.literal("offline"))),
    teamId: v.optional(v.id("teams")),
  },
  handler: async (ctx, { status, teamId }) => {
    if (status) {
      return await ctx.db
        .query("agents")
        .withIndex("by_status", (q) => q.eq("status", status))
        .collect();
    }
    if (teamId) {
      return await ctx.db
        .query("agents")
        .withIndex("by_team", (q) => q.eq("teamId", teamId))
        .collect();
    }
    return await ctx.db.query("agents").collect();
  },
});

export const getAgent = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    return await ctx.db.get(agentId);
  },
});

export const createAgent = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal("agent"), v.literal("supervisor"), v.literal("admin")),
    skillTags: v.array(v.string()),
    teamId: v.optional(v.id("teams")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("agents", {
      ...args,
      status: "offline",
    });
  },
});
