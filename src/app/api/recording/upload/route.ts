import { NextRequest, NextResponse } from "next/server";
import { fetchMutation, fetchAction } from "convex/nextjs";
import { api } from "@/lib/convex";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const sessionId = formData.get("sessionId") as string;
    const callId = formData.get("callId") as string;
    const duration = formData.get("duration") ? parseInt(formData.get("duration") as string) : undefined;

    if (!file || !sessionId || !callId) {
      return NextResponse.json({ error: "Missing file, sessionId, or callId" }, { status: 400 });
    }

    const uploadUrl = await fetchMutation(api.storage.generateUploadUrl);
    const uploadRes = await fetch(uploadUrl, { method: "POST", body: file });
    if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.statusText}`);

    const { storageId } = await uploadRes.json();
    await fetchMutation(api.storage.saveRecording, { storageId, sessionId: sessionId as any, callId: callId as any, duration });

    const transcribeAction = process.env.TRANSCRIBE_ON_UPLOAD;
    if (transcribeAction === "true") {
      await fetchAction(api.transcribe.transcribeRecording, { storageId, sessionId: sessionId as any, callId: callId as any });
    }

    return NextResponse.json({ status: "ok", storageId });
  } catch (err) {
    console.error("Recording upload error:", err);
    return NextResponse.json({ status: "ok" });
  }
}
