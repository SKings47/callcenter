"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/lib/convex";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardList,
  Phone,
  Clock,
  User,
  Star,
  CheckCircle2,
  X,
  ChevronRight,
  ChevronLeft,
  Mic,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function ReviewsPage() {
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [score, setScore] = useState("");
  const [outcome, setOutcome] = useState("");
  const [supervisorNotes, setSupervisorNotes] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [reviewTags, setReviewTags] = useState<string[]>([]);

  const pendingReviews = useQuery(api.reviews.listReviews, { status: "pending" });
  const inReviewReviews = useQuery(api.reviews.listReviews, { status: "in_review" });
  const completedReviews = useQuery(api.reviews.listReviews, { status: "completed" });
  const reviewDetail = useQuery(
    api.reviews.getReview,
    { reviewId: selectedReviewId as any },
  );
  const updateReview = useMutation(api.reviews.updateReview);

  const getReviewsForTab = () => {
    switch (activeTab) {
      case "in_review": return inReviewReviews;
      case "completed": return completedReviews;
      default: return pendingReviews;
    }
  };

  const reviews = getReviewsForTab();

  const statusColor: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-600 border-amber-200",
    in_review: "bg-blue-500/10 text-blue-600 border-blue-200",
    completed: "bg-green-500/10 text-green-600 border-green-200",
  };

  const outcomeColor: Record<string, string> = {
    resolved: "bg-green-500/10 text-green-600",
    escalated: "bg-red-500/10 text-red-600",
    follow_up: "bg-amber-500/10 text-amber-600",
    unresolved: "bg-gray-500/10 text-gray-600",
  };

  const handleSelectReview = (reviewId: string) => {
    const review = [...(pendingReviews ?? []), ...(inReviewReviews ?? []), ...(completedReviews ?? [])]
      .find((r: any) => r._id === reviewId);
    if (review) {
      setSelectedReviewId(reviewId);
      setScore(review.score?.toString() ?? "");
      setOutcome(review.outcome ?? "");
      setSupervisorNotes(review.supervisorNotes ?? "");
      setReviewTags(review.tags ?? []);
    }
  };

  const handleSave = async () => {
    if (!selectedReviewId) return;
    const status = outcome === "resolved" ? "completed" : "in_review";
    await updateReview({
      reviewId: selectedReviewId as any,
      score: score ? parseInt(score) : undefined,
      outcome: outcome as any || undefined,
      supervisorNotes: supervisorNotes || undefined,
      tags: reviewTags,
      status: status as any,
    });
    setSelectedReviewId(null);
  };

  const handleMarkComplete = async () => {
    if (!selectedReviewId) return;
    await updateReview({
      reviewId: selectedReviewId as any,
      status: "completed",
    });
    setSelectedReviewId(null);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Call Reviews</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingReviews?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="in_review">
            In Review ({inReviewReviews?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedReviews?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        <div className="grid gap-6 mt-6 lg:grid-cols-3">
          <div className={selectedReviewId ? "lg:col-span-1" : "lg:col-span-3"}>
            <TabsContent value={activeTab} className="m-0">
              {!reviews ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : reviews.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
                    <ClipboardList className="h-12 w-12 mb-4" />
                    <p>No {activeTab.replace("_", " ")} reviews</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {reviews.map((review: any) => (
                    <Card
                      key={review._id}
                      className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                        selectedReviewId === review._id ? "ring-2 ring-primary" : ""
                      }`}
                      onClick={() => handleSelectReview(review._id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{review.callerNumber}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {review.score && (
                              <span className="flex items-center gap-1 text-sm">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                {review.score}
                              </span>
                            )}
                            <Badge variant="outline" className={statusColor[review.status]}>
                              {review.status.replace("_", " ")}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {review.agentName}
                          </span>
                          {review.callDuration && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {Math.round(review.callDuration / 1000)}s
                            </span>
                          )}
                          <ChevronRight className="h-4 w-4 ml-auto" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </div>

          {selectedReviewId && reviewDetail && (
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Review Details</h2>
                <Button variant="ghost" size="sm" onClick={() => setSelectedReviewId(null)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Call Info
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Caller</p>
                      <p className="font-medium">{reviewDetail.callerNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Agent</p>
                      <p className="font-medium">{reviewDetail.agentName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Source</p>
                      <Badge variant="outline">{reviewDetail.callSource ?? "—"}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Duration</p>
                      <p className="font-medium">
                        {reviewDetail.callDuration
                          ? `${Math.round(reviewDetail.callDuration / 1000)}s`
                          : "—"}
                      </p>
                    </div>
                    {reviewDetail.agentEmail && (
                      <div>
                        <p className="text-sm text-muted-foreground">Agent Email</p>
                        <p className="font-medium">{reviewDetail.agentEmail}</p>
                      </div>
                    )}
                    {reviewDetail.supervisorName && (
                      <div>
                        <p className="text-sm text-muted-foreground">Reviewed By</p>
                        <p className="font-medium">{reviewDetail.supervisorName}</p>
                      </div>
                    )}
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
                  {!reviewDetail.transcriptions?.length ? (
                    <p className="text-muted-foreground text-sm py-4 text-center">
                      No transcription available
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {reviewDetail.transcriptions.flatMap((t: any) =>
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
                            <p className="text-sm">{seg.text}</p>
                          </div>
                        )),
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Scoring & Outcome
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Score (1-10)</label>
                      <Select value={score} onValueChange={(v: string | null) => v && setScore(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select score..." />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                            <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Outcome</label>
                      <Select value={outcome} onValueChange={(v: string | null) => v && setOutcome(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select outcome..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="escalated">Escalated</SelectItem>
                          <SelectItem value="follow_up">Follow Up</SelectItem>
                          <SelectItem value="unresolved">Unresolved</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {outcome && (
                    <Badge variant="outline" className={outcomeColor[outcome]}>
                      {outcome.replace("_", " ")}
                    </Badge>
                  )}
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
                    {reviewTags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => setReviewTags(reviewTags.filter((t) => t !== tag))} />
                      </Badge>
                    ))}
                    {reviewTags.length === 0 && (
                      <p className="text-xs text-muted-foreground">No tags</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add tag..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && tagInput.trim()) {
                          setReviewTags([...reviewTags, tagInput.trim()]);
                          setTagInput("");
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (tagInput.trim()) {
                          setReviewTags([...reviewTags, tagInput.trim()]);
                          setTagInput("");
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5" />
                    Supervisor Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    value={supervisorNotes}
                    onChange={(e) => setSupervisorNotes(e.target.value)}
                    rows={4}
                    placeholder="Add notes about this call..."
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleSave} className="gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Save & Set In Review
                    </Button>
                    <Button variant="default" onClick={handleMarkComplete} className="gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Mark Complete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
}
