import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RewardRuleList, type RewardRuleListItem } from "../components/RewardRuleList";

interface CardDetail {
  id: string;
  display_name: string;
  issuer?: string | null;
  network?: string | null;
  last4?: string | null;
  rewards_confirmed_by_user: boolean;
  card_catalog?: {
    card_name: string;
    annual_fee_cents: number;
    verification_status: string;
    last_verified_at?: string | null;
    card_reward_rules?: RewardRuleListItem[];
  } | null;
}

export default function CardDetailPage() {
  const { id } = useParams();
  const [card, setCard] = useState<CardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadCard() {
      if (!id) return;
      const db = supabase as any;
      const { data, error: queryError } = await db
        .from("user_credit_cards")
        .select(`
          id,
          display_name,
          issuer,
          network,
          last4,
          rewards_confirmed_by_user,
          card_catalog:card_catalog_id (
            card_name,
            annual_fee_cents,
            verification_status,
            last_verified_at,
            card_reward_rules (
              id,
              category,
              reward_rate,
              reward_unit,
              cap_amount_cents,
              cap_period,
              requires_activation,
              status
            )
          )
        `)
        .eq("id", id)
        .maybeSingle();

      if (cancelled) return;
      if (queryError) setError(queryError.message);
      else setCard(data as CardDetail | null);
      setLoading(false);
    }

    void loadCard();
    return () => { cancelled = true; };
  }, [id]);

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        {loading && <p className="text-muted-foreground">Loading card...</p>}
        {error && <p className="text-destructive">{error}</p>}
        {!loading && !card && <p className="text-muted-foreground">Card not found.</p>}

        {card && (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">{card.display_name}</h1>
                <p className="text-muted-foreground">
                  {[card.issuer, card.network, card.last4 ? `•••• ${card.last4}` : null].filter(Boolean).join(" · ")}
                </p>
              </div>
              <Button asChild><Link to={`/app/cards/${card.id}/rewards`}>Edit rewards</Link></Button>
            </div>

            <Card>
              <CardHeader><CardTitle>Catalog reward rules</CardTitle></CardHeader>
              <CardContent>
                <RewardRuleList rules={card.card_catalog?.card_reward_rules ?? []} />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
