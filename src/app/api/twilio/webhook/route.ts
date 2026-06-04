import { NextRequest, NextResponse } from "next/server";
import { fetchMutation } from "convex/nextjs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const data = Object.fromEntries(formData.entries());

    const callStatus = (data.CallStatus as string) || "ringing";
    const callerNumber = (data.From as string) || (data.Caller as string) || "unknown";
    const calledNumber = (data.To as string) || "unknown";
    const callSid = (data.CallSid as string) || `${Date.now()}`;
    const sipDomain = (data.SipDomain as string) || calledNumber;

    const eventType = normalizeTwilioEvent(callStatus);

    await fetchMutation("ingestion:ingestCallEvent", {
      source: "twilio",
      callerNumber,
      sipLineId: sipDomain,
      sourceCallId: callSid,
      eventType,
      requiredSkillTag: undefined,
      ivrLanguage: undefined,
      metadata: Object.fromEntries(formData.entries()),
    });

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("Twilio webhook error:", err);
    return NextResponse.json({ status: "ok" });
  }
}

function normalizeTwilioEvent(callStatus: string): string {
  const map: Record<string, string> = {
    "ringing": "RINGING",
    "in-progress": "ANSWER",
    "completed": "HANGUP",
    "busy": "HANGUP",
    "failed": "HANGUP",
    "no-answer": "HANGUP",
    "canceled": "HANGUP",
  };
  return map[callStatus] ?? callStatus.toUpperCase();
}
