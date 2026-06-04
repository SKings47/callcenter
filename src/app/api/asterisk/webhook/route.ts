import { NextRequest, NextResponse } from "next/server";
import { fetchMutation } from "convex/nextjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const eventType = body.event || body.Event || "NEW_CHANNEL";
    const callerId = body.callerid || body.CallerIDNum || body.caller || "unknown";
    const channel = body.channel || body.Channel || body.sip_line || "default";
    const uniqueId = body.uniqueid || body.Uniqueid || body.call_id || `${Date.now()}`;
    const skillTag = body.skill_tag || body.SkillTag;
    const language = body.language || body.Language;

    await fetchMutation("ingestion:ingestCallEvent", {
      source: "asterisk",
      callerNumber: callerId,
      sipLineId: channel,
      sourceCallId: uniqueId,
      eventType,
      requiredSkillTag: skillTag,
      ivrLanguage: language,
      metadata: body,
    });

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("Asterisk webhook error:", err);
    return NextResponse.json({ status: "ok" });
  }
}
