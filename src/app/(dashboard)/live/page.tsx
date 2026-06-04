"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/lib/convex";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Phone,
  PhoneOff,
  Pause,
  Play,
  ArrowRightFromLine,
  Mic,
  Headphones,
  Clock,
  User,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function LiveCallPage() {
  const agents = useQuery(api.agents.listAgents, {});
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const handleAgentChange = (value: string | null) => { if (value) setSelectedAgentId(value); };
  const activeSession = useQuery(
    api.sessions.getAgentActiveSession,
    { agentId: selectedAgentId as any },
  );

  const connectCall = useMutation(api.actions.connectCall);
  const holdCall = useMutation(api.actions.holdCall);
  const resumeCall = useMutation(api.actions.resumeCall);
  const endCall = useMutation(api.actions.endCall);
  const transferCall = useMutation(api.sessions.transferCall);
  const updateNotes = useMutation(api.sessions.updateSessionNotes);
  const updateTags = useMutation(api.sessions.updateSessionTags);

  const [tagInput, setTagInput] = useState("");
  const [notes, setNotes] = useState("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [transferTarget, setTransferTarget] = useState("");

  useEffect(() => {
    if (activeSession?.session?.agentNotes) {
      setNotes(activeSession.session.agentNotes);
    }
  }, [activeSession?.session?.agentNotes]);

  const session = activeSession?.session;
  const call = activeSession?.call;
  const isHold = session?.status === "hold";

  const handleHoldResume = useCallback(async () => {
    if (!session) return;
    if (isHold) {
      await resumeCall({ sessionId: session._id });
    } else {
      await holdCall({ sessionId: session._id });
    }
  }, [session, isHold, holdCall, resumeCall]);

  const handleHangup = useCallback(async () => {
    if (!session) return;
    await endCall({ sessionId: session._id });
  }, [session, endCall]);

  const handleTransfer = useCallback(async () => {
    if (!session || !transferTarget) return;
    await transferCall({
      sessionId: session._id,
      fromAgentId: session.agentId,
      toAgentId: transferTarget as any,
    });
    setTransferTarget("");
  }, [session, transferTarget, transferCall]);

  const handleAddTag = useCallback(async () => {
    if (!tagInput.trim() || !session) return;
    const currentTags = session.tags ?? [];
    if (!currentTags.includes(tagInput.trim())) {
      await updateTags({ sessionId: session._id, tags: [...currentTags, tagInput.trim()] });
    }
    setTagInput("");
  }, [tagInput, session, updateTags]);

  const handleRemoveTag = useCallback(async (tag: string) => {
    if (!session) return;
    const currentTags = session.tags ?? [];
    await updateTags({ sessionId: session._id, tags: currentTags.filter((t: string) => t !== tag) });
  }, [session, updateTags]);

  const handleSaveNotes = useCallback(async () => {
    if (!session) return;
    await updateNotes({ sessionId: session._id, notes });
    setIsEditingNotes(false);
  }, [session, notes, updateNotes]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Live Call</h1>
        <div className="w-64">
          <Select value={selectedAgentId} onValueChange={handleAgentChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select agent..." />
            </SelectTrigger>
            <SelectContent>
              {agents?.map((a: any) => (
                <SelectItem key={a._id} value={a._id}>
                  <span className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${
                      a.status === "available" ? "bg-green-500" : a.status === "busy" ? "bg-blue-500" : "bg-gray-400"
                    }`} />
                    {a.name} ({a.status})
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!session ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Phone className="h-16 w-16 mb-4" />
            <p className="text-lg font-medium">No active call</p>
            <p className="text-sm">Select an agent above to see their active session</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-green-500 animate-pulse" />
                  Active Call
                  <Badge variant={isHold ? "secondary" : "default"}>
                    {session.status}
                  </Badge>
                </CardTitle>
                <CallTimer startedAt={session.startedAt} />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Caller</p>
                    <p className="text-lg font-semibold">{call?.callerNumber ?? "Unknown"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Source</p>
                    <Badge variant="outline">{call?.source ?? "—"}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Skill Required</p>
                    <p>{call?.requiredSkillTag ?? "Any"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Language</p>
                    <p>{call?.ivrLanguage ?? "—"}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant={isHold ? "default" : "outline"}
                    onClick={handleHoldResume}
                    className="gap-2"
                  >
                    {isHold ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    {isHold ? "Resume" : "Hold"}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleHangup}
                    className="gap-2"
                  >
                    <PhoneOff className="h-4 w-4" />
                    Hangup
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="h-5 w-5" />
                  Transcription
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!activeSession?.transcriptions?.length ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">
                    No transcription yet
                  </p>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {activeSession.transcriptions.flatMap((t: any) =>
                      t.segments.map((seg: any, i: number) => (
                        <div
                          key={`${t._id}-${i}`}
                          className={`flex gap-3 p-2 rounded-lg ${
                            seg.speaker === "agent"
                              ? "bg-primary/10 ml-8"
                              : "bg-muted mr-8"
                          }`}
                        >
                          <span className="text-xs font-medium text-muted-foreground shrink-0 w-12">
                            {seg.speaker === "agent" ? "Agent" : "Caller"}
                          </span>
                          <div className="flex-1">
                            <p className="text-sm">{seg.text}</p>
                            {seg.confidence && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {Math.round(seg.confidence * 100)}% confidence
                              </p>
                            )}
                          </div>
                        </div>
                      )),
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRightFromLine className="h-5 w-5" />
                  Transfer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select value={transferTarget} onValueChange={(v: string | null) => v && setTransferTarget(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent..." />
                  </SelectTrigger>
                  <SelectContent>
                    {agents
                      ?.filter((a: any) => a._id !== selectedAgentId && a.status === "available")
                      .map((a: any) => (
                        <SelectItem key={a._id} value={a._id}>
                          {a.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  className="w-full"
                  variant="outline"
                  disabled={!transferTarget}
                  onClick={handleTransfer}
                >
                  Transfer Call
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1">
                  {(session.tags ?? []).map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        className="hover:text-destructive text-xs ml-1"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        x
                      </button>
                    </Badge>
                  ))}
                  {(session.tags ?? []).length === 0 && (
                    <p className="text-xs text-muted-foreground">No tags added</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                  />
                  <Button variant="outline" size="sm" onClick={handleAddTag}>
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Headphones className="h-5 w-5" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isEditingNotes ? (
                  <>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveNotes}>Save</Button>
                      <Button size="sm" variant="outline" onClick={() => { setNotes(session.agentNotes ?? ""); setIsEditingNotes(false); }}>
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm whitespace-pre-wrap min-h-[60px]">
                      {session.agentNotes || "No notes"}
                    </p>
                    <Button size="sm" variant="outline" onClick={() => setIsEditingNotes(true)}>
                      Edit Notes
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function CallTimer({ startedAt }: { startedAt: number }) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    function update() {
      setLabel(formatDistanceToNow(startedAt, { includeSeconds: true }));
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <span className="flex items-center gap-1 text-sm text-muted-foreground">
      <Clock className="h-4 w-4" />
      {label}
    </span>
  );
}
