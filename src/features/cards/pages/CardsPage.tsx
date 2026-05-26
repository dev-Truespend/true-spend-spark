/**
 * CardsPage
 *
 * User's credit-card portfolio. Each card is a UserCardTile with brand-color
 * gradient, network badge, and a top-3 reward summary pulled from the catalog.
 *
 * @requires user_credit_cards (RLS: user sees own rows)
 * @requires card_catalog (public read for verified rows)
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CreditCard, Plus, ShieldCheck } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { catalogTable } from "@/integrations/supabase/catalog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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

      const { data, error: queryError } = await catalogTable
        .userCreditCards()
        .select(
          `id, display_name, issuer, network, last4, rewards_confirmed_by_user,
           card_catalog:card_catalog_id (
             card_name, issuer, network, annual_fee_cents, base_reward_rate, verification_status,
             card_reward_rules ( category, reward_rate, reward_unit, status )
           )`,
        )
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (cancelled) return;
      if (queryError) {
        setError(queryError.message);
      } else {
        setCards((data ?? []) as unknown as UserCardTileData[]);
      }
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
            <p className="text-muted-foreground">
              Your portfolio is the input for every TrueSpend recommendation.
            </p>
          </div>
          <Button asChild>
            <Link to="/app/cards/new">
              <Plus className="mr-2 h-4 w-4" />
              Add card
            </Link>
          </Button>
        </div>

        {loading && (
          <div className="grid gap-4 md:grid-cols-2">
            {[0, 1, 2, 3].map((idx) => (
              <Card key={idx} className="overflow-hidden">
                <div className="h-3 w-full bg-muted" />
                <CardContent className="space-y-3 p-4">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex gap-2 pt-2">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {error && (
          <Card className="border-destructive/30">
            <CardContent className="p-6">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && cards.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-start gap-4 p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-medium">Add your first card</h2>
                <p className="mt-1 text-muted-foreground">
                  Search the verified catalog of 25+ cards. Plaid sync can come later
                  — manual setup gets the rewards engine working in under a minute.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link to="/app/cards/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Search catalog
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/app/extension">
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Install browser extension
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && cards.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {cards.map((card) => <UserCardTile key={card.id} card={card} />)}
          </div>
        )}
      </div>
    </main>
  );
}
