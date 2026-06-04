"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone } from "lucide-react";

export default function LiveCallPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Live Call</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Active Session
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No active call</p>
        </CardContent>
      </Card>
    </div>
  );
}
