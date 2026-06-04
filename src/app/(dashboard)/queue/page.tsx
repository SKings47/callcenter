"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/lib/convex";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PhoneCall, Clock, PhoneOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function QueuePage() {
  const queueItems = useQuery(api.queues.getActiveQueue, {});
  const routeCall = useMutation(api.routing.routeIncomingCall);

  if (!queueItems) {
    return <div className="text-muted-foreground">Loading queue...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Call Queue</h1>
        <Badge variant="outline" className="text-sm">
          {queueItems.length} waiting
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PhoneCall className="h-5 w-5" />
            Queued Calls
          </CardTitle>
        </CardHeader>
        <CardContent>
          {queueItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <PhoneOff className="h-12 w-12 mb-4" />
              <p>No calls in queue</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Caller</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Skill Required</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Wait Time</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queueItems.map((item) => (
                  <TableRow key={item._id}>
                    <TableCell className="font-medium">{item.callerNumber}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.source}</Badge>
                    </TableCell>
                    <TableCell>
                      {item.requiredSkill ? (
                        <Badge>{item.requiredSkill}</Badge>
                      ) : (
                        <span className="text-muted-foreground">Any</span>
                      )}
                    </TableCell>
                    <TableCell>{item.ivrLanguage ?? "—"}</TableCell>
                    <TableCell>
                      <QueueTimer enteredAt={item.enteredAt} />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => routeCall({ callId: item.callId })}
                      >
                        Answer
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function QueueTimer({ enteredAt }: { enteredAt: number }) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    function update() {
      setLabel(formatDistanceToNow(enteredAt, { includeSeconds: true }));
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [enteredAt]);

  return (
    <span className="flex items-center gap-1">
      <Clock className="h-3 w-3" />
      {label}
    </span>
  );
}
