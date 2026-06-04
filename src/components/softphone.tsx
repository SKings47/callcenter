"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/lib/convex";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  PhoneIncoming,
  PhoneCall,
  Mic,
  MicOff,
  Pause,
  Play,
  ChevronDown,
  ChevronUp,
  GripHorizontal,
  Headphones,
  Clock,
  Volume2,
  ArrowRightFromLine,
  Dices,
  X,
} from "lucide-react";

type PhoneState = "idle" | "incoming" | "active" | "hold";
type CallSource = "asterisk" | "twilio";

const statusColors: Record<string, string> = {
  available: "bg-green-500",
  busy: "bg-blue-500",
  offline: "bg-gray-400",
};

const dtmfKeys = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["*", "0", "#"],
];

export default function Softphone() {
  const [agentId, setAgentId] = useState<string>("");
  const handleAgentSelect = (v: string | null) => { if (v) setAgentId(v); };
  const [minimized, setMinimized] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showDialpad, setShowDialpad] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferTarget, setTransferTarget] = useState("");
  const handleTransferSelect = (v: string | null) => { if (v) setTransferTarget(v); };
  const [dialedNumber, setDialedNumber] = useState("");

  const agents = useQuery(api.agents.listAgents, {});
  const queue = useQuery(api.queues.getActiveQueue, {});
  const activeSession = useQuery(
    api.sessions.getAgentActiveSession,
    agentId ? { agentId: agentId as any } : "skip",
  );

  const assignToAgent = useMutation(api.routing.assignToAgent);
  const connectCall = useMutation(api.actions.connectCall);
  const holdCall = useMutation(api.actions.holdCall);
  const resumeCall = useMutation(api.actions.resumeCall);
  const endCall = useMutation(api.actions.endCall);
  const transferCall = useMutation(api.sessions.transferCall);

  const session = activeSession?.session;
  const call = activeSession?.call;
  const currentAgent = agents?.find((a: any) => a._id === agentId);

  const phoneState: PhoneState = !agentId || !currentAgent
    ? "idle"
    : !session && queue && queue.length > 0
      ? "incoming"
      : session?.status === "hold"
        ? "hold"
        : session?.status === "active" || session?.status === "connecting"
          ? "active"
          : "idle";

  const incoming = queue?.[0];

  const handleAnswer = useCallback(async () => {
    if (!incoming || !agentId) return;
    const result = await assignToAgent({
      callId: incoming.callId as any,
      agentId: agentId as any,
    });
    if (result.assigned && result.sessionId) {
      await connectCall({ sessionId: result.sessionId as any });
    }
  }, [incoming, agentId, assignToAgent, connectCall]);

  const handleReject = useCallback(async () => {
    // Dismiss - call stays in queue for other agents
  }, []);

  const handleHangup = useCallback(async () => {
    if (!session) return;
    await endCall({ sessionId: session._id });
    setShowDialpad(false);
    setShowTransfer(false);
    setDialedNumber("");
  }, [session, endCall]);

  const handleHoldResume = useCallback(async () => {
    if (!session) return;
    if (phoneState === "hold") {
      await resumeCall({ sessionId: session._id });
    } else {
      await holdCall({ sessionId: session._id });
    }
  }, [session, phoneState, holdCall, resumeCall]);

  const handleTransfer = useCallback(async () => {
    if (!session || !transferTarget) return;
    await transferCall({
      sessionId: session._id,
      fromAgentId: session.agentId,
      toAgentId: transferTarget as any,
    });
    setTransferTarget("");
    setShowTransfer(false);
  }, [session, transferTarget, transferCall]);

  const handleDial = useCallback((key: string) => {
    setDialedNumber((prev) => prev + key);
  }, []);

  const handleClearDial = useCallback(() => {
    setDialedNumber("");
  }, []);

  const eligibleTransfers = agents?.filter(
    (a: any) => a._id !== agentId && a.status === "available",
  );

  const renderIncoming = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-3">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
        </span>
        <span className="text-sm font-medium animate-pulse">Incoming Call</span>
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold">{incoming?.callerNumber}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {incoming?.source} · {incoming?.requiredSkill ?? "Any skill"}
        </p>
      </div>
      <div className="flex gap-3 justify-center pt-2">
        <Button
          variant="default"
          size="lg"
          className="h-14 w-14 rounded-full bg-green-600 hover:bg-green-700"
          onClick={handleAnswer}
        >
          <Phone className="h-6 w-6" />
        </Button>
        <Button
          variant="destructive"
          size="lg"
          className="h-14 w-14 rounded-full"
          onClick={handleReject}
        >
          <PhoneOff className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );

  const renderActive = () => {
    const timerLabel = session?.startedAt
      ? formatTimer(Date.now() - session.startedAt)
      : "00:00";

    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className={`h-2 w-2 rounded-full ${phoneState === "hold" ? "bg-amber-400" : "bg-green-500"}`} />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {phoneState === "hold" ? "On Hold" : session?.status}
            </span>
          </div>
          <p className="text-xl font-bold">{call?.callerNumber ?? "Connected"}</p>
          <div className="flex items-center justify-center gap-1 mt-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm text-muted-foreground tabular-nums">{timerLabel}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 py-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Volume2 className="h-3 w-3" />
            <span className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
              <span className="block h-full bg-primary rounded-full" style={{ width: "60%" }} />
            </span>
          </div>
        </div>

        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className={`h-10 w-10 rounded-full ${muted ? "bg-destructive/10 text-destructive border-destructive" : ""}`}
            onClick={() => setMuted(!muted)}
          >
            {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Button
            variant={phoneState === "hold" ? "default" : "outline"}
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={handleHoldResume}
          >
            {phoneState === "hold" ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
          <Button
            variant="destructive"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={handleHangup}
          >
            <PhoneOff className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1"
            onClick={() => { setShowDialpad(!showDialpad); setShowTransfer(false); }}
          >
            <Dices className="h-3 w-3" />
            Dialpad
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1"
            onClick={() => { setShowTransfer(!showTransfer); setShowDialpad(false); }}
            disabled={!eligibleTransfers?.length}
          >
            <ArrowRightFromLine className="h-3 w-3" />
            Transfer
          </Button>
        </div>

        {showDialpad && (
          <div className="space-y-2">
            <div className="bg-muted rounded-lg px-3 py-2 text-center font-mono text-lg tabular-nums">
              {dialedNumber || <span className="text-muted-foreground text-sm">Enter number</span>}
            </div>
            <div className="grid grid-cols-3 gap-1.5 max-w-[180px] mx-auto">
              {dtmfKeys.flat().map((key) => (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  className="h-9 w-full text-sm font-mono"
                  onClick={() => handleDial(key)}
                >
                  {key}
                </Button>
              ))}
            </div>
            <div className="flex justify-center">
              <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={handleClearDial}>
                Clear
              </Button>
            </div>
          </div>
        )}

        {showTransfer && (
          <div className="space-y-2">
            <Select value={transferTarget} onValueChange={handleTransferSelect}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select agent..." />
              </SelectTrigger>
              <SelectContent>
                {eligibleTransfers?.map((a: any) => (
                  <SelectItem key={a._id} value={a._id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="w-full h-7 text-xs"
              variant="outline"
              disabled={!transferTarget}
              onClick={handleTransfer}
            >
              Transfer Call
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderIdle = () => (
    <div className="flex flex-col items-center gap-2 py-2">
      <Headphones className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm font-medium">
        {currentAgent ? "Ready" : "Select an agent"}
      </p>
      <p className="text-xs text-muted-foreground">
        {currentAgent
          ? `Status: ${currentAgent.status}`
          : "No agent selected"}
      </p>
      {currentAgent?.status === "available" && (
        <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-200">
          <span className="mr-1 h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
          Available
        </Badge>
      )}
    </div>
  );

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {!minimized && (
        <div className="w-72 rounded-xl border bg-card shadow-xl">
          <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30 rounded-t-xl">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Softphone</span>
              {agentId && currentAgent && (
                <span className={`h-2 w-2 rounded-full ${statusColors[currentAgent.status]}`} />
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setMinimized(true)}
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="p-4 space-y-3">
            {!agentId && (
              <Select value={agentId} onValueChange={handleAgentSelect}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Login as agent..." />
                </SelectTrigger>
                <SelectContent>
                  {agents?.map((a: any) => (
                    <SelectItem key={a._id} value={a._id}>
                      <span className="flex items-center gap-2">
                        <span className={`h-1.5 w-1.5 rounded-full ${statusColors[a.status]}`} />
                        {a.name} ({a.status})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {agentId && phoneState === "incoming" && incoming && renderIncoming()}
            {agentId && (phoneState === "active" || phoneState === "hold") && renderActive()}
            {agentId && phoneState === "idle" && renderIdle()}
          </div>
        </div>
      )}

      {minimized && (
        <Button
          variant="outline"
          size="sm"
          className="h-9 rounded-full shadow-md gap-2 bg-card"
          onClick={() => setMinimized(false)}
        >
          <Phone className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs">
            {phoneState === "incoming" ? "Incoming..." : phoneState === "active" ? "Active" : phoneState === "hold" ? "Hold" : "Softphone"}
          </span>
          {agentId && currentAgent && (
            <span className={`h-1.5 w-1.5 rounded-full ${statusColors[currentAgent.status]}`} />
          )}
        </Button>
      )}
    </div>
  );
}

function formatTimer(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
