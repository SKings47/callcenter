"use client";

"use client";

import { useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhoneCall, PhoneIncoming, Clock, Headphones, BarChart3, Timer } from "lucide-react";

export default function DashboardPage() {
  const agents = useQuery(api.agents.listAgents, {});
  const stats = useQuery(api.queries.getDashboardStats, {});
  const queue = useQuery(api.queues.getActiveQueue, {});

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Calls Today</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalToday ?? "—"}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.answered ?? 0} answered / {stats?.missed ?? 0} missed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Calls</CardTitle>
            <PhoneCall className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats?.activeCalls ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Queued</CardTitle>
            <PhoneIncoming className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{queue?.length ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.avgDuration ? `${Math.round(stats.avgDuration / 1000)}s` : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Headphones className="h-5 w-5" />
              Agent Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!agents ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : agents.length === 0 ? (
              <p className="text-muted-foreground">No agents configured</p>
            ) : (
              <div className="space-y-2">
                {agents.map((agent: any) => (
                  <div key={agent._id} className="flex items-center justify-between">
                    <span>{agent.name}</span>
                    <span
                      className={`text-sm ${
                        agent.status === "available"
                          ? "text-green-500"
                          : agent.status === "busy"
                            ? "text-blue-500"
                            : "text-muted-foreground"
                      }`}
                    >
                      {agent.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              {stats?.totalToday
                ? `${stats.totalToday} calls today`
                : "No activity yet"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
