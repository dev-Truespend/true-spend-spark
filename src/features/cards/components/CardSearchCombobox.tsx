import { useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AnnualFeeBadge } from "./AnnualFeeBadge";

export interface CatalogSearchCard {
  id: string;
  card_name: string;
  issuer: string;
  annual_fee_cents: number;
  verification_status: string;
  top_rewards: string[];
}

export function CardSearchCombobox({
  onSelect,
}: {
  onSelect: (card: CatalogSearchCard) => void;
}) {
  const [query, setQuery] = useState("");
  const [cards, setCards] = useState<CatalogSearchCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function searchCards() {
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    const { data, error: fnError } = await supabase.functions.invoke("card-search", {
      body: { query: trimmed },
    });
    setLoading(false);

    if (fnError) {
      setError(fnError.message);
      return;
    }

    setCards((data?.cards ?? []) as CatalogSearchCard[]);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void searchCards();
          }}
          placeholder="Search Amex Gold, Citi Double Cash, Chase Freedom..."
        />
        <Button type="button" onClick={() => void searchCards()} disabled={loading}>
          <Search className="mr-2 h-4 w-4" />
          {loading ? "Searching" : "Search"}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-3">
        {cards.map((card) => (
          <Card key={card.id} className="border-muted">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="font-medium">{card.card_name}</p>
                <p className="text-sm text-muted-foreground">{card.issuer}</p>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {card.top_rewards.slice(0, 3).map((reward) => <span key={reward}>{reward}</span>)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <AnnualFeeBadge cents={card.annual_fee_cents} />
                <Button type="button" onClick={() => onSelect(card)}>Select</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
