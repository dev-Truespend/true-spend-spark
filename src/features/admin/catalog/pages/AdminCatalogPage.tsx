import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface CatalogCardRow {
  id: string;
  issuer: string;
  card_name: string;
  verification_status: string;
  last_verified_at?: string | null;
  last_checked_at?: string | null;
  pending_change_count?: number | null;
  card_reward_rules?: { id: string }[];
}

export default function AdminCatalogPage() {
  const [cards, setCards] = useState<CatalogCardRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [extractingId, setExtractingId] = useState<string | null>(null);

  async function load() {
    const db = supabase as any;
    const { data, error: queryError } = await db
      .from("card_catalog")
      .select(
        "id, issuer, card_name, verification_status, last_verified_at, last_checked_at, pending_change_count, card_reward_rules(id)"
      )
      .order("issuer", { ascending: true })
      .limit(100);

    if (queryError) setError(queryError.message);
    else setCards((data ?? []) as CatalogCardRow[]);
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleExtract(cardId: string) {
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
      toast.success(
        `Extracted ${data?.proposed_rule_count ?? 0} rules · ${data?.change_count ?? 0} change(s) flagged`,
      );
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setExtractingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Catalog admin</h1>
            <p className="text-muted-foreground">Review source-of-truth cards and reward rules before they affect recommendations.</p>
          </div>
          <Button asChild variant="outline"><Link to="/app/admin/catalog/review">Review queue</Link></Button>
        </div>

        {error && <p className="text-destructive">{error}</p>}
        <div className="grid gap-3">
          {cards.map((card) => (
            <Card key={card.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{card.card_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {card.issuer} · {card.card_reward_rules?.length ?? 0} rules
                    {card.last_checked_at && (
                      <> · checked {new Date(card.last_checked_at).toLocaleDateString()}</>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={card.verification_status === "verified" ? "default" : "secondary"}>{card.verification_status}</Badge>
                  {(card.pending_change_count ?? 0) > 0 && (
                    <Badge variant="destructive">{card.pending_change_count} change{card.pending_change_count === 1 ? "" : "s"}</Badge>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleExtract(card.id)}
                    disabled={extractingId === card.id}
                  >
                    {extractingId === card.id ? "Extracting…" : "Extract"}
                  </Button>
                  <Button asChild size="sm" variant="outline"><Link to={`/app/admin/catalog/${card.id}`}>Open</Link></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {!error && cards.length === 0 && (
            <Card>
              <CardHeader><CardTitle>No catalog cards found</CardTitle></CardHeader>
              <CardContent className="text-muted-foreground">Run the source-of-truth seed migrations before launch.</CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
