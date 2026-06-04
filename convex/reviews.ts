import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listReviews = query({
  args: {
    status: v.optional(
      v.union(v.literal("pending"), v.literal("in_review"), v.literal("completed")),
    ),
    agentId: v.optional(v.id("agents")),
  },
  handler: async (ctx, { status, agentId }) => {
    let reviews;

    if (status) {
      reviews = await ctx.db
        .query("reviews")
        .withIndex("by_status", (q: any) => q.eq("status", status))
        .collect();
    } else {
      reviews = await ctx.db.query("reviews").order("desc").take(100);
    }

    if (agentId) {
      reviews = reviews.filter((r: any) => r.agentId === agentId);
    }

    const enriched = await Promise.all(
      reviews.map(async (review: any) => {
        const agent = await ctx.db.get(review.agentId) as any;
        const call = await ctx.db.get(review.callId) as any;
        const session = await ctx.db.get(review.sessionId) as any;
        const supervisor = review.supervisorId
          ? await ctx.db.get(review.supervisorId) as any
          : null;

        return {
          ...review,
          agentName: agent?.name ?? "Unknown",
          callerNumber: call?.callerNumber ?? "Unknown",
          callDuration:
            call?.startedAt && call?.endedAt
              ? call.endedAt - call.startedAt
              : null,
          supervisorName: supervisor?.name ?? null,
          sessionStatus: session?.status ?? null,
        };
      }),
    );

    return enriched;
  },
});

export const getReview = query({
  args: { reviewId: v.optional(v.id("reviews")) },
  handler: async (ctx, { reviewId }) => {
    if (!reviewId) return null;
    const review = await ctx.db.get(reviewId);
    if (!review) return null;

    const agent = await ctx.db.get(review.agentId) as any;
    const call = await ctx.db.get(review.callId) as any;
    const session = await ctx.db.get(review.sessionId) as any;
    const supervisor = review.supervisorId
      ? await ctx.db.get(review.supervisorId) as any
      : null;

    const transcriptions = await ctx.db
      .query("transcriptions")
      .withIndex("by_session", (q: any) => q.eq("sessionId", review.sessionId))
      .collect();

    const recordings = await ctx.db
      .query("recordings")
      .withIndex("by_session", (q: any) => q.eq("sessionId", review.sessionId))
      .collect();

    return {
      ...review,
      agentName: agent?.name ?? "Unknown",
      agentEmail: agent?.email ?? null,
      callerNumber: call?.callerNumber ?? "Unknown",
      callSource: call?.source ?? null,
      callDuration:
        call?.startedAt && call?.endedAt
          ? call.endedAt - call.startedAt
          : null,
      callStartedAt: call?.startedAt ?? null,
      supervisorName: supervisor?.name ?? null,
      sessionStatus: session?.status ?? null,
      transcriptions,
      recordings,
    };
  },
});

export const updateReview = mutation({
  args: {
    reviewId: v.id("reviews"),
    score: v.optional(v.number()),
    outcome: v.optional(
      v.union(
        v.literal("resolved"),
        v.literal("escalated"),
        v.literal("follow_up"),
        v.literal("unresolved"),
      ),
    ),
    tags: v.optional(v.array(v.string())),
    supervisorNotes: v.optional(v.string()),
    status: v.optional(
      v.union(v.literal("pending"), v.literal("in_review"), v.literal("completed")),
    ),
    supervisorId: v.optional(v.id("agents")),
  },
  handler: async (ctx, { reviewId, ...fields }) => {
    const update: any = {};

    if (fields.score !== undefined) update.score = fields.score;
    if (fields.outcome !== undefined) update.outcome = fields.outcome;
    if (fields.tags !== undefined) update.tags = fields.tags;
    if (fields.supervisorNotes !== undefined) update.supervisorNotes = fields.supervisorNotes;
    if (fields.status !== undefined) update.status = fields.status;
    if (fields.supervisorId !== undefined) update.supervisorId = fields.supervisorId;
    if (fields.status === "completed") update.completedAt = Date.now();

    await ctx.db.patch(reviewId, update);
  },
});
