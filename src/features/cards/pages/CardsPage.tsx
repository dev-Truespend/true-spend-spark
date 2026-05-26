import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserCardTile, type UserCardTileData } from "../components/UserCardTile";

export default function CardsPage() {
  const { user } = useAuth();
  const [cards, setCards] = useState<UserCardTileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadCards() {
      if (!user) return;
      setLoading(true);
      setError(null);
      const db = supabase as any;
      const { data, error: queryError } = await db
        .from("user_credit_cards")
        .select("id, display_name, issuer, network, last4, rewards_confirmed_by_user")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (cancelled) return;
      if (queryError) setError(queryError.message);
      else setCards((data ?? []) as UserCardTileData[]);
      setLoading(false);
    }

    void loadCards();
    return () => { cancelled = true; };
  }, [user]);

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">My cards</h1>
            <p className="text-muted-foreground">Your portfolio is the input for every TrueSpend recommendation.</p>
          </div>
          <Button asChild>
            <Link to="/app/cards/new">
              <Plus className="mr-2 h-4 w-4" />
              Add card
            </Link>
          </Button>
        </div>

        {loading && <p className="text-muted-foreground">Loading cards...</p>}
        {error && <p className="text-destructive">{error}</p>}

        {!loading && !error && cards.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-start gap-4 p-8">
              <div>
                <h2 className="text-xl font-medium">Add your first card</h2>
                <p className="text-muted-foreground">Start manually. Plaid can be connected later after the rewards engine is stable.</p>
              </div>
              <Button asChild><Link to="/app/cards/new">Search catalog</Link></Button>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {cards.map((card) => <UserCardTile key={card.id} card={card} />)}
        </div>
      </div>
    </main>
  );
}
