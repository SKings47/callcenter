import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

export const transcribeRecording = action({
  args: {
    storageId: v.string(),
    sessionId: v.id("call_sessions"),
    callId: v.id("calls"),
    language: v.optional(v.string()),
  },
  handler: async (ctx, { storageId, sessionId, callId, language }) => {
    const url = await ctx.storage.getUrl(storageId);
    if (!url) throw new Error("Recording not found in storage");

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch recording: ${response.statusText}`);
    const blob = await response.blob();

    const formData = new FormData();
    formData.append("file", blob, "recording.webm");
    formData.append("model", "whisper-1");
    formData.append("response_format", "verbose_json");
    if (language) formData.append("language", language);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      await ctx.runMutation(api.transcriptions.saveTranscriptionError, {
        sessionId,
        callId,
        error: "OPENAI_API_KEY not configured",
      });
      return { success: false, error: "OPENAI_API_KEY not configured" };
    }

    const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });

    if (!whisperRes.ok) {
      const errBody = await whisperRes.text();
      await ctx.runMutation(api.transcriptions.saveTranscriptionError, {
        sessionId,
        callId,
        error: `Whisper API error: ${whisperRes.status} ${errBody}`,
      });
      return { success: false, error: `Whisper API error: ${whisperRes.status}` };
    }

    const result = await whisperRes.json();
    const segments = (result.segments || []).map((seg: any) => ({
      speaker: "caller" as const,
      text: seg.text.trim(),
      startTime: Math.round(seg.start * 1000),
      endTime: Math.round(seg.end * 1000),
      confidence: seg.confidence,
    }));

    if (segments.length === 0 && result.text) {
      segments.push({
        speaker: "caller" as const,
        text: result.text.trim(),
        startTime: 0,
        endTime: 0,
      });
    }

    await ctx.runMutation(api.transcriptions.saveTranscriptionSegments, {
      sessionId,
      callId,
      segments,
      language: language ?? result.language,
      rawText: result.text,
    });

    return { success: true, segmentsCount: segments.length };
  },
});
