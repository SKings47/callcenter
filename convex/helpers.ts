import { Id } from "./_generated/dataModel";

export type AssignResult = {
  assigned: boolean;
  reason?: string;
  agentId?: Id<"agents">;
  sessionId?: Id<"call_sessions">;
};

export async function assignCallToAgent(
  ctx: any,
  callId: Id<"calls">,
): Promise<AssignResult> {
  const call = await ctx.db.get(callId);
  if (!call || (call.status !== "incoming" && call.status !== "queued")) {
    return { assigned: false, reason: "call_not_available" };
  }

  const skillTag = call.requiredSkillTag;
  const availableAgents = await ctx.db
    .query("agents")
    .withIndex("by_status", (q: any) => q.eq("status", "available"))
    .collect();

  let matched = availableAgents;
  if (skillTag) {
    matched = availableAgents.filter((a: any) => a.skillTags.includes(skillTag));
  }

  if (matched.length === 0) {
    return { assigned: false, reason: "no_available_agents" };
  }

  matched.sort((a: any, b: any) => (a.lastAssignedAt ?? 0) - (b.lastAssignedAt ?? 0));
  const selected = matched[0];
  const now = Date.now();

  await ctx.db.patch(call._id, { status: "assigned" });
  await ctx.db.patch(selected._id, { status: "busy", lastAssignedAt: now });

  const sessionId = await ctx.db.insert("call_sessions", {
    callId: call._id,
    agentId: selected._id,
    status: "connecting",
    startedAt: now,
    holdHistory: [],
    transferHistory: [],
  });

  await ctx.db.insert("events", {
    type: "CALL_ASSIGNED",
    callId: call._id,
    agentId: selected._id,
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

  return { assigned: true, agentId: selected._id, sessionId };
}
