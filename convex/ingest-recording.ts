import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

export const saveRecordingFromUrl = action({
  args: {
    url: v.string(),
    sessionId: v.id("call_sessions"),
    callId: v.id("calls"),
    duration: v.optional(v.number()),
  },
  handler: async (ctx, { url, sessionId, callId, duration }) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch recording: ${response.statusText}`);
    const blob = await response.blob();
    const storageId = (await ctx.storage.store(blob)).toString();
    return await ctx.runMutation(api.storage.saveRecording, {
      storageId,
      sessionId,
      callId,
      duration,
    });
  },
});
