import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ReviewRow {
  id: string;
  change_type: string;
  status: string;
  source_url?: string | null;
  new_data: unknown;
  created_at: string;
}

export default function AdminCatalogReviewPage() {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<ReviewRow[]>([]);

  async function loadReviews() {
    const db = supabase as any;
    const { data } = await db
      .from("catalog_update_reviews")
      .select("id, change_type, status, source_url, new_data, created_at")
      .eq("status", "proposed")
      .order("created_at", { ascending: false });
    setReviews((data ?? []) as ReviewRow[]);
  }

  useEffect(() => {
    void loadReviews();
  }, []);

  async function updateReview(id: string, action: "approve" | "reject") {
    const { error } = await supabase.functions.invoke("admin-catalog-review-update", {
      body: { review_id: id, action },
    });
    if (error) {
      toast({ title: "Review failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: action === "approve" ? "Approved" : "Rejected" });
    await loadReviews();
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Catalog review queue</h1>
          <p className="text-muted-foreground">AI and imports can propose changes, but admins approve the source of truth.</p>
        </div>

        <div className="grid gap-4">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-lg">{review.change_type}</CardTitle>
                  <Badge>{review.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs">
                  {JSON.stringify(review.new_data, null, 2)}
                </pre>
                <div className="flex gap-2">
                  <Button onClick={() => void updateReview(review.id, "approve")}>Approve</Button>
                  <Button variant="outline" onClick={() => void updateReview(review.id, "reject")}>Reject</Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {reviews.length === 0 && (
            <Card>
              <CardContent className="p-8 text-muted-foreground">No proposed catalog updates are waiting for review.</CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
