/**
 * AdminCatalogReviewPage
 *
 * Replaces the previous JSON.stringify dump with a typed diff view per
 * catalog_update_reviews row. Each card shows: which card the change is for,
 * what changed (rate / cap / new rule / etc), old → new values in a two-column
 * red/green diff, confidence score, and the source URL it was extracted from.
 *
 * @requires admin role (RLS-enforced on catalog_update_reviews via admin
 *           function admin-catalog-review-update)
 */

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Gift,
  Layers,
  Minus,
  Percent,
  Plus,
  Receipt,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { catalogTable, type CatalogChangeType } from "@/integrations/supabase/catalog";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";

interface ReviewRow {
  id: string;
  change_type: string;
  status: string;
  source_url: string | null;
  detected_by: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
  card_catalog_id: string | null;
  card_catalog?: { card_name: string; issuer: string; network: string | null } | null;
}

const CHANGE_META: Record<CatalogChangeType, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  reward_rate_change: { label: "Reward rate changed", icon: Percent, color: "text-amber-600 dark:text-amber-400" },
  cap_change: { label: "Spending cap changed", icon: Layers, color: "text-blue-600 dark:text-blue-400" },
  applies_to_change: { label: "Eligible merchants updated", icon: Receipt, color: "text-slate-600 dark:text-slate-300" },
  new_rule: { label: "New reward rule", icon: Plus, color: "text-emerald-600 dark:text-emerald-400" },
  removed_rule: { label: "Reward rule removed", icon: Minus, color: "text-destructive" },
  fee_change: { label: "Annual fee changed", icon: AlertCircle, color: "text-amber-600 dark:text-amber-400" },
  bonus_change: { label: "Signup bonus updated", icon: Gift, color: "text-primary" },
};

function changeMeta(changeType: string) {
  return CHANGE_META[changeType as CatalogChangeType] ?? {
    label: changeType.replace(/_/g, " "),
    icon: ShieldAlert,
    color: "text-muted-foreground",
  };
}

function formatCents(cents: unknown): string {
  if (typeof cents !== "number" || !Number.isFinite(cents)) return "—";
  return `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function formatRate(rate: unknown, unit: unknown): string {
  if (typeof rate !== "number" || !Number.isFinite(rate)) return "—";
  const value = Number.isInteger(rate) ? String(rate) : rate.toFixed(1);
  if (unit === "percent") return `${value}%`;
  if (unit === "points_per_dollar") return `${value}x points`;
  if (unit === "miles_per_dollar") return `${value}x miles`;
  return `${value}`;
}

/** Render the old/new sides of a change row in a way that matches the change_type. */
function renderDiffSide(changeType: string, value: unknown, side: "old" | "new"): React.ReactNode {
  if (value == null || value === "") return <span className="italic text-muted-foreground">(none)</span>;

  switch (changeType as CatalogChangeType) {
    case "fee_change":
      return <span className="font-mono text-sm">{formatCents(value)}</span>;

    case "reward_rate_change": {
      const obj = value as { rate?: number; unit?: string };
      return <span className="font-mono text-sm">{formatRate(obj.rate, obj.unit)}</span>;
    }

    case "cap_change": {
      const obj = value as { amount_cents?: number | null; period?: string | null };
      return (
        <span className="text-sm">
          <span className="font-mono">{obj.amount_cents != null ? formatCents(obj.amount_cents) : "uncapped"}</span>
          {obj.period && <span className="text-muted-foreground"> / {obj.period}</span>}
        </span>
      );
    }

    case "applies_to_change":
      return <span className="text-sm">{String(value)}</span>;

    case "new_rule":
    case "removed_rule": {
      const obj = value as Record<string, unknown>;
      const rate = obj.reward_rate as number | undefined;
      const unit = obj.reward_unit as string | undefined;
      const cat = obj.category as string | undefined;
      const cap = obj.cap_amount_cents as number | undefined;
      return (
        <div className="space-y-1 text-sm">
          <div>
            <span className="font-semibold">{formatRate(rate, unit)}</span>
            <span className="text-muted-foreground"> on </span>
            <span>{cat ?? "—"}</span>
          </div>
          {cap != null && (
            <div className="text-xs text-muted-foreground">cap {formatCents(cap)}</div>
          )}
          {typeof obj.applies_to === "string" && obj.applies_to && (
            <div className="text-xs italic text-muted-foreground">{obj.applies_to}</div>
          )}
        </div>
      );
    }

    case "bonus_change": {
      const obj = value as { description?: string; estimated_value_cents?: number; spend_requirement_cents?: number; window_days?: number };
      return (
        <div className="space-y-1 text-sm">
          {obj.description && <div className="font-medium">{obj.description}</div>}
          <div className="text-xs text-muted-foreground">
            {obj.estimated_value_cents != null && <>~{formatCents(obj.estimated_value_cents)} value · </>}
            {obj.spend_requirement_cents != null && <>spend {formatCents(obj.spend_requirement_cents)} </>}
            {obj.window_days != null && <>in {obj.window_days}d</>}
          </div>
        </div>
      );
    }

    default: {
      // Fallback: minimal JSON-ish for unknown change types — way better than <pre>JSON.stringify</pre>
      const compact = JSON.stringify(value);
      return <span className="font-mono text-xs">{compact.length > 80 ? `${compact.slice(0, 80)}…` : compact}</span>;
    }
  }
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  const tone =
    pct >= 85 ? "bg-emerald-500" :
    pct >= 50 ? "bg-amber-500" :
    "bg-destructive";
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full transition-all", tone)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-medium tabular-nums text-muted-foreground">{pct}%</span>
    </div>
  );
}

export default function AdminCatalogReviewPage() {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function loadReviews() {
    setLoading(true);
    const { data } = await catalogTable
      .catalogUpdateReviews()
      .select(
        `id, change_type, status, source_url, detected_by, old_data, new_data,
         created_at, card_catalog_id,
         card_catalog:card_catalog_id ( card_name, issuer, network )`,
      )
      .eq("status", "proposed")
      .order("created_at", { ascending: false });
    setReviews((data ?? []) as unknown as ReviewRow[]);
    setLoading(false);
  }

  useEffect(() => {
    void loadReviews();
  }, []);

  async function updateReview(id: string, action: "approve" | "reject") {
    setUpdatingId(id);
    const { error } = await supabase.functions.invoke("admin-catalog-review-update", {
      body: { review_id: id, action },
    });
    setUpdatingId(null);
    if (error) {
      toast({ title: "Review failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: action === "approve" ? "Approved" : "Rejected",
      description: action === "approve"
        ? "Change applied to the live catalog."
        : "Change discarded.",
    });
    await loadReviews();
  }

  const grouped = useMemo(() => {
    const map = new Map<string, ReviewRow[]>();
    for (const review of reviews) {
      const key = review.card_catalog_id ?? "_orphan";
      const list = map.get(key) ?? [];
      list.push(review);
      map.set(key, list);
    }
    return Array.from(map.values());
  }, [reviews]);

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Catalog review queue</h1>
          <p className="text-muted-foreground">
            AI extractions and imports propose changes here. Admins approve each one before it
            affects user recommendations.
          </p>
        </div>

        {loading && (
          <div className="space-y-3">
            {[0, 1, 2].map((idx) => (
              <Card key={idx}>
                <CardHeader>
                  <Skeleton className="h-5 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Skeleton className="h-16" />
                    <Skeleton className="h-16" />
                  </div>
                  <Skeleton className="h-8 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && reviews.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-start gap-3 p-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-medium">Queue is empty</h2>
                <p className="text-sm text-muted-foreground">
                  No proposed catalog updates are waiting for review. The extractor cron runs
                  daily — new changes will appear here when issuers update their pages.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && grouped.map((group) => {
          const first = group[0];
          const cardName = first.card_catalog?.card_name ?? "Unknown card";
          const issuer = first.card_catalog?.issuer ?? "—";
          return (
            <Card key={first.card_catalog_id ?? first.id} className="mb-4">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{cardName}</CardTitle>
                    <p className="text-xs text-muted-foreground">{issuer}</p>
                  </div>
                  <Badge variant="secondary">{group.length} change{group.length === 1 ? "" : "s"}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {group.map((review) => {
                  const meta = changeMeta(review.change_type);
                  const Icon = meta.icon;
                  const confidence = typeof review.new_data?.change_confidence === "number"
                    ? (review.new_data.change_confidence as number)
                    : null;

                  return (
                    <div key={review.id} className="rounded-lg border bg-muted/30 p-3">
                      {/* Change header */}
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className={cn("flex h-6 w-6 items-center justify-center rounded", meta.color)}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-sm font-medium">{meta.label}</span>
                          <Badge variant="outline" className="h-5 px-1.5 text-[10px] capitalize text-muted-foreground">
                            {review.detected_by.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          {confidence != null && <ConfidenceBar value={confidence} />}
                          <span className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>

                      {/* Old → new diff */}
                      <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr]">
                        <div className="rounded border border-destructive/20 bg-destructive/5 p-2.5">
                          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-destructive">Before</p>
                          {renderDiffSide(review.change_type, review.old_data, "old")}
                        </div>
                        <div className="flex items-center justify-center text-muted-foreground sm:px-1">
                          <ArrowRight className="h-4 w-4" />
                        </div>
                        <div className="rounded border border-emerald-200 bg-emerald-500/5 p-2.5">
                          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">After</p>
                          {renderDiffSide(review.change_type, review.new_data, "new")}
                        </div>
                      </div>

                      {/* Source URL */}
                      {review.source_url && (
                        <a
                          href={review.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View issuer source
                        </a>
                      )}

                      {/* Actions */}
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          disabled={updatingId === review.id}
                          onClick={() => void updateReview(review.id, "approve")}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 text-xs"
                          disabled={updatingId === review.id}
                          onClick={() => void updateReview(review.id, "reject")}
                        >
                          <XCircle className="h-3 w-3" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
