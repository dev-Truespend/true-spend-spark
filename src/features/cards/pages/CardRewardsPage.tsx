import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { catalogTable } from "@/integrations/supabase/catalog";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { RewardRuleList, type RewardRuleListItem } from "../components/RewardRuleList";
import type { RewardUnit } from "@/shared/types/rewards";

const categories = ["dining", "groceries", "shopping", "travel", "gas", "streaming", "drugstore", "other"];
const units: RewardUnit[] = ["percent", "points_per_dollar", "miles_per_dollar"];

interface CardRewardsData {
  id: string;
  display_name: string;
  card_catalog?: {
    card_reward_rules?: RewardRuleListItem[];
  } | null;
}

interface OverrideFormRow {
  category: string;
  reward_rate: number;
  reward_unit: RewardUnit;
}

export default function CardRewardsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [card, setCard] = useState<CardRewardsData | null>(null);
  const [rows, setRows] = useState<OverrideFormRow[]>([{ category: "shopping", reward_rate: 1, reward_unit: "percent" }]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCard() {
      if (!id) return;
      setLoading(true);
      const { data } = await catalogTable
        .userCreditCards()
        .select(
          `id, display_name,
           card_catalog:card_catalog_id (
             card_reward_rules ( id, category, reward_rate, reward_unit,
               cap_amount_cents, cap_period, requires_activation, status )
           )`,
        )
        .eq("id", id)
        .maybeSingle();
      setCard(data as unknown as CardRewardsData | null);
      setLoading(false);
    }
    void loadCard();
  }, [id]);

  function updateRow(index: number, patch: Partial<OverrideFormRow>) {
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  }

  async function saveOverrides() {
    if (!id) return;
    setSaving(true);
    const { error } = await supabase.functions.invoke("card-update-reward-overrides", {
      body: { user_credit_card_id: id, overrides: rows },
    });
    setSaving(false);

    if (error) {
      toast({ title: "Could not save rewards", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Rewards confirmed", description: "Future recommendations will use your overrides first." });
    navigate(`/app/cards/${id}`, { replace: true });
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Confirm rewards</h1>
          <p className="text-muted-foreground">{card?.display_name ?? "Card"} · user overrides beat catalog defaults.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader><CardTitle>Catalog defaults</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-3/4" />
                </div>
              ) : (
                <RewardRuleList rules={card?.card_catalog?.card_reward_rules ?? []} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Your overrides</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {rows.map((row, index) => (
                <div key={`${row.category}-${index}`} className="space-y-3 rounded-md border p-3">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={row.category} onValueChange={(value) => updateRow(index, { category: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Rate</Label>
                      <Input type="number" min="0" step="0.1" value={row.reward_rate} onChange={(event) => updateRow(index, { reward_rate: Number(event.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Unit</Label>
                      <Select value={row.reward_unit} onValueChange={(value) => updateRow(index, { reward_unit: value as RewardUnit })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {units.map((unit) => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => setRows((current) => [...current, { category: "other", reward_rate: 1, reward_unit: "percent" }])}>
                Add override
              </Button>
              <Button className="w-full" onClick={() => void saveOverrides()} disabled={saving}>
                {saving ? "Saving..." : "Confirm rewards"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
