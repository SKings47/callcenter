import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, { email, password }) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_email", (q: any) => q.eq("email", email))
      .first();
    if (!agent) throw new Error("Invalid email or password");

    const hash = await hashPassword(password);
    if (agent.passwordHash !== hash) throw new Error("Invalid email or password");

    const token = crypto.randomUUID();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    await ctx.db.patch(agent._id, { tokenIdentifier: token });

    return {
      token,
      agent: {
        _id: agent._id,
        name: agent.name,
        email: agent.email,
        role: agent.role,
        status: agent.status,
        skillTags: agent.skillTags,
      },
      expiresAt,
    };
  },
});

export const signup = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
    role: v.union(v.literal("agent"), v.literal("supervisor"), v.literal("admin")),
    skillTags: v.array(v.string()),
  },
  handler: async (ctx, { name, email, password, role, skillTags }) => {
    const existing = await ctx.db
      .query("agents")
      .withIndex("by_email", (q: any) => q.eq("email", email))
      .first();
    if (existing) throw new Error("Agent with this email already exists");

    const passwordHash = await hashPassword(password);
    const token = crypto.randomUUID();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

    const agentId = await ctx.db.insert("agents", {
      name,
      email,
      role,
      status: "offline",
      skillTags,
      passwordHash,
      tokenIdentifier: token,
    });

    return {
      token,
      agent: { _id: agentId, name, email, role, status: "offline" as const, skillTags },
      expiresAt,
    };
  },
});

export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", token))
      .first();
    if (agent) {
      await ctx.db.patch(agent._id, { tokenIdentifier: undefined });
    }
  },
});

export const getMe = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, { token }) => {
    if (!token) return null;
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", token))
      .first();
    if (!agent) return null;
    return {
      _id: agent._id,
      name: agent.name,
      email: agent.email,
      role: agent.role,
      status: agent.status,
      skillTags: agent.skillTags,
    };
  },
});
