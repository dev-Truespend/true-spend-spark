import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ValidationCheck {
  name: string;
  passed: boolean;
  details: string;
}

export default function ValidationPage() {
  const [checks, setChecks] = useState<ValidationCheck[]>([]);
  const [running, setRunning] = useState(false);

  async function runChecks() {
    setRunning(true);
    const results: ValidationCheck[] = [];
    const db = supabase as any;

    const { count: cardCount, error: cardError } = await db
      .from("card_catalog")
      .select("id", { count: "exact", head: true });
    results.push({
      name: "Card catalog seeded",
      passed: !cardError && (cardCount ?? 0) >= 25,
      details: cardError?.message ?? `${cardCount ?? 0} cards found`,
    });

    const { count: merchantCount, error: merchantError } = await db
      .from("merchant_domains")
      .select("id", { count: "exact", head: true })
      .eq("is_verified", true);
    results.push({
      name: "Merchant domains seeded",
      passed: !merchantError && (merchantCount ?? 0) >= 10,
      details: merchantError?.message ?? `${merchantCount ?? 0} verified domains found`,
    });

    const { data: extensionData, error: extensionError } = await supabase.functions.invoke("extension-card-suggest", {
      body: { domain: "amazon.com", page_title: "Amazon", page_intent: "product", amount_cents: 5000 },
    });
    results.push({
      name: "Amazon extension endpoint",
      passed: !extensionError && extensionData?.merchant?.normalized_category === "shopping",
      details: extensionError?.message ?? `Category: ${extensionData?.merchant?.normalized_category ?? "unknown"}`,
    });

    const { data: healthData, error: healthError } = await supabase.functions.invoke("health-check/source-of-truth");
    results.push({
      name: "Health check",
      passed: !healthError && ["healthy", "degraded"].includes(healthData?.status),
      details: healthError?.message ?? `Status: ${healthData?.status ?? "unknown"}`,
    });

    setChecks(results);
    setRunning(false);
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Production validation</h1>
            <p className="text-muted-foreground">Admin-only smoke checks for the source-of-truth layer.</p>
          </div>
          <Button onClick={() => void runChecks()} disabled={running}>{running ? "Running..." : "Run checks"}</Button>
        </div>

        <div className="grid gap-4">
          {checks.map((check) => (
            <Card key={check.name}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  {check.passed ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-destructive" />}
                  {check.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{check.details}</CardContent>
            </Card>
          ))}
          {checks.length === 0 && (
            <Card>
              <CardContent className="p-8 text-muted-foreground">Run checks after applying migrations and logging in as an admin.</CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
