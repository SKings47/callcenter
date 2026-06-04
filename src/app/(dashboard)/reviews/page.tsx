"use client";

import { useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";

export default function ReviewsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Call Reviews</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Pending Reviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No reviews pending</p>
        </CardContent>
      </Card>
    </div>
  );
}
