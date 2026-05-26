import { useState } from "react";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ExtensionSuggestion {
  merchant?: { merchant_name: string; normalized_category: string };
  recommendation?: {
    best_card?: { card_name: string; reward_rate_label: string; estimated_value_label: string } | null;
    why?: string;
  };
}

export default function ExtensionSetup() {
  const [result, setResult] = useState<ExtensionSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function testAmazon() {
    setLoading(true);
    setError(null);
    const { data, error: fnError } = await supabase.functions.invoke("extension-card-suggest", {
      body: {
        domain: "amazon.com",
        page_title: "Amazon",
        page_intent: "product",
        amount_cents: 5000,
      },
    });
    setLoading(false);

    if (fnError) {
      setError(fnError.message);
      return;
    }

    setResult(data as ExtensionSuggestion);
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Browser extension</h1>
          <p className="text-muted-foreground">The extension sends only the current domain by default and asks the deterministic rewards engine for the best card.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Setup flow</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
                <li>Install the Chrome extension locally.</li>
                <li>Sign in with your TrueSpend account.</li>
                <li>Visit Amazon, Target, Walmart, DoorDash, or another seeded merchant.</li>
                <li>Open the popup to see the best card and alternatives.</li>
              </ol>
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                <ShieldCheck className="mb-2 h-4 w-4" />
                TrueSpend stores domains such as amazon.com, not full browsing URLs.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Test Amazon suggestion</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={() => void testAmazon()} disabled={loading}>
                {loading ? "Testing..." : "Run test"}
              </Button>
              {error && <p className="text-sm text-destructive">{error}</p>}
              {result && (
                <div className="space-y-3 rounded-md border p-4">
                  <Badge>{result.merchant?.normalized_category ?? "unknown"}</Badge>
                  <h2 className="text-lg font-medium">{result.merchant?.merchant_name}</h2>
                  {result.recommendation?.best_card ? (
                    <div>
                      <p className="font-medium">{result.recommendation.best_card.card_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {result.recommendation.best_card.reward_rate_label} · {result.recommendation.best_card.estimated_value_label}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Add a card before testing recommendations.</p>
                  )}
                  <p className="text-sm text-muted-foreground">{result.recommendation?.why}</p>
                </div>
              )}
              <Button asChild variant="outline">
                <a href="chrome://extensions" target="_blank" rel="noreferrer">
                  Open Chrome extensions <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
