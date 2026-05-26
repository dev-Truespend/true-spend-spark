import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardSearchCombobox, type CatalogSearchCard } from "../components/CardSearchCombobox";

export default function NewCardPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selected, setSelected] = useState<CatalogSearchCard | null>(null);
  const [last4, setLast4] = useState("");
  const [saving, setSaving] = useState(false);

  async function addCard() {
    if (!selected) return;
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("card-add-user-card", {
      body: {
        card_catalog_id: selected.id,
        display_name: selected.card_name,
        last4: last4.trim() || undefined,
      },
    });
    setSaving(false);

    if (error) {
      toast({ title: "Could not add card", description: error.message, variant: "destructive" });
      return;
    }

    const id = data?.card?.id as string | undefined;
    toast({ title: "Card added", description: "Review the default rewards before using it for recommendations." });
    navigate(id ? `/app/cards/${id}/rewards` : "/app/cards", { replace: true });
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Add a credit card</h1>
          <p className="text-muted-foreground">Search the verified catalog, then confirm the reward rules for your own account.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Search card catalog</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <CardSearchCombobox onSelect={setSelected} />

            {selected && (
              <div className="rounded-md border p-4">
                <h2 className="font-medium">{selected.card_name}</h2>
                <p className="text-sm text-muted-foreground">{selected.issuer}</p>
                <div className="mt-4 max-w-xs space-y-2">
                  <Label htmlFor="last4">Last 4 digits (optional)</Label>
                  <Input id="last4" value={last4} onChange={(event) => setLast4(event.target.value.replace(/\D/g, "").slice(0, 4))} />
                </div>
                <Button className="mt-4" onClick={() => void addCard()} disabled={saving}>
                  {saving ? "Adding..." : "Add to my cards"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
