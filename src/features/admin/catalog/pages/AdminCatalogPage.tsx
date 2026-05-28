/**
 * AdminCatalogPage
 *
 * Admin overview of the card_catalog source-of-truth. Each row shows
 * verification status, pending-change count from catalog_update_reviews, and
 * a one-click Extract button that calls the catalog-extract-card-rewards
 * Edge Function. Successful extractions toast with a deep-link to the review
 * queue if changes were detected.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Filter, RefreshCw, Search, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { catalogTable } from "@/integrations/supabase/catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";

interface CatalogCardRow {
  id: string;
  issuer: string;
  card_name: string;
  verification_status: string;
  last_verified_at?: string | null;
  last_checked_at?: string | null;
  pending_change_count?: number | null;
  card_reward_rules?: { id: string }[] | null;
}

type FilterId = "all" | "needs_review" | "verified" | "has_changes";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "needs_review", label: "Needs review" },
  { id: "verified", label: "Verified" },
  { id: "has_changes", label: "Has changes" },
];

export default function AdminCatalogPage() {
  const [cards, setCards] = useState<CatalogCardRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [extractingId, setExtractingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterId>("all");
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    const { data, error: queryError } = await catalogTable
      .cardCatalog()
      .select(
        `id, issuer, card_name, verification_status, last_verified_at,
         last_checked_at, pending_change_count,
         card_reward_rules ( id )`,
      )
      .order("issuer", { ascending: true })
      .limit(100);

    if (queryError) setError(queryError.message);
    else setCards((data ?? []) as unknown as CatalogCardRow[]);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleExtract(cardId: string, cardName: string) {
    setExtractingId(cardId);
    try {
      const { data, error: fnError } = await supabase.functions.invoke<{
        change_count: number;
        proposed_rule_count: number;
        extraction_confidence: number;
      }>("catalog-extract-card-rewards", {
        body: { card_catalog_id: cardId, mode: "extract" },
      });
      if (fnError) throw new Error(fnError.message || "Extraction failed");

      const changes = data?.change_count ?? 0;
      const rules = data?.proposed_rule_count ?? 0;
      const confidence = data?.extraction_confidence ?? 0;

      toast.success(`${cardName} extracted`, {
        description: `${rules} rule${rules === 1 ? "" : "s"} · ${Math.round(confidence * 100)}% confidence · ${changes} change${changes === 1 ? "" : "s"} flagged`,
        action: changes > 0
          ? { label: "Review", onClick: () => { window.location.href = "/app/admin/catalog/review"; } }
          : undefined,
      });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setExtractingId(null);
    }
  }

  const filtered = cards.filter((card) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q ||
      card.card_name.toLowerCase().includes(q) ||
      card.issuer.toLowerCase().includes(q);
    if (!matchesSearch) return false;
    if (filter === "verified") return card.verification_status === "verified";
    if (filter === "needs_review") return card.verification_status === "needs_review";
    if (filter === "has_changes") return (card.pending_change_count ?? 0) > 0;
    return true;
  });

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Catalog admin</h1>
            <p className="text-muted-foreground">
              Review source-of-truth cards and reward rules before they affect recommendations.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/app/admin/catalog/review">Review queue</Link>
            </Button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by issuer or card name…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="h-4 w-4 text-muted-foreground" />
            {FILTERS.map((f) => (
              <Button
                key={f.id}
                size="sm"
                variant={filter === f.id ? "default" : "ghost"}
                className="h-7 px-2 text-xs"
                onClick={() => setFilter(f.id)}
              >
                {f.label}
                {f.id === "has_changes" && cards.some((c) => (c.pending_change_count ?? 0) > 0) && (
                  <Badge variant="destructive" className="ml-1 h-4 px-1 text-[9px]">
                    {cards.reduce((sum, c) => sum + (c.pending_change_count ?? 0), 0)}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </div>

        {error && (
          <Card className="mb-4 border-destructive/30">
            <CardContent className="p-4 text-destructive">{error}</CardContent>
          </Card>
        )}

        {loading && (
          <div className="grid gap-3">
            {[0, 1, 2, 3, 4].map((idx) => (
              <Card key={idx}>
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && (
          <div className="grid gap-3">
            {filtered.map((card) => (
              <Card key={card.id} className="transition-colors hover:bg-muted/40">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{card.card_name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {card.issuer} · {card.card_reward_rules?.length ?? 0} rule{card.card_reward_rules?.length === 1 ? "" : "s"}
                      {card.last_checked_at && (
                        <> · checked {formatDistanceToNow(new Date(card.last_checked_at), { addSuffix: true })}</>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-6 px-2 capitalize",
                        card.verification_status === "verified"
                          ? "border-emerald-200 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : card.verification_status === "needs_review"
                          ? "border-amber-200 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                          : "border-muted-foreground/20 bg-muted text-muted-foreground",
                      )}
                    >
                      {card.verification_status.replace(/_/g, " ")}
                    </Badge>
                    {(card.pending_change_count ?? 0) > 0 && (
                      <Badge variant="destructive" className="h-6 px-2">
                        {card.pending_change_count} change{card.pending_change_count === 1 ? "" : "s"}
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 px-2 text-xs"
                      onClick={() => handleExtract(card.id, card.card_name)}
                      disabled={extractingId === card.id}
                    >
                      <Sparkles className={cn("h-3 w-3", extractingId === card.id && "animate-pulse")} />
                      {extractingId === card.id ? "Extracting…" : "Extract"}
                    </Button>
                    <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                      <Link to={`/app/admin/catalog/${card.id}`}>Open</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filtered.length === 0 && !error && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {search || filter !== "all" ? "No matches" : "No catalog cards found"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  {search || filter !== "all"
                    ? "Try clearing filters or your search."
                    : "Run the source-of-truth seed migrations before launch."}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
