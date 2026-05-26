import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

type Period = "week" | "month" | "quarter";

function periodToDays(period: Period): number {
  return period === "week" ? 7 : period === "quarter" ? 90 : 30;
}

function patternType(period: Period): string {
  return period === "week" ? "weekly" : period === "quarter" ? "quarterly" : "monthly";
}

function parseJsonObject(text: string) {
  const jsonText = text.replace(/```json\n?|\n?```/g, "").trim();
  return JSON.parse(jsonText);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { period = "month" } = await req.json().catch(() => ({})) as { period?: Period };
    const daysAgo = periodToDays(period);
    const cacheType = patternType(period);

    const { data: cached } = await supabase
      .from("spending_patterns")
      .select("*")
      .eq("user_id", user.id)
      .eq("pattern_type", cacheType)
      .gte("expires_at", new Date().toISOString())
      .order("cached_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached) {
      return new Response(JSON.stringify({ ...cached.data, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: transactions } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .gte("timestamp", new Date(Date.now() - daysAgo * 86_400_000).toISOString());

    if (!transactions?.length) {
      return new Response(JSON.stringify({
        insights: ["No transaction data available for analysis."],
        patterns: [],
        recommendations: ["Add a few transactions or connect a card to unlock AI insights."],
        topCategories: [],
        totalSpent: 0,
        txCount: 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const totalSpent = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
    const categoryTotals: Record<string, number> = {};
    transactions.forEach((tx) => {
      categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + Number(tx.amount);
    });

    const topCategories = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([category, spent]) => ({
        category,
        spent,
        percentage: totalSpent > 0 ? Math.round((spent / totalSpent) * 100) : 0,
      }));

    const fallbackResult = {
      insights: [
        `You spent $${totalSpent.toFixed(2)} across ${transactions.length} transactions in the last ${daysAgo} days.`,
        topCategories[0]
          ? `${topCategories[0].category} is your top category at $${topCategories[0].spent.toFixed(2)} (${topCategories[0].percentage}%).`
          : "No category concentration detected.",
      ],
      patterns: topCategories.slice(0, 3).map((cat) => `${cat.category}: ${cat.percentage}% of spend`),
      recommendations: ["Review your top category against your best rewards card before the next purchase."],
      topCategories,
      totalSpent,
      txCount: transactions.length,
    };

    let result = fallbackResult;

    if (ANTHROPIC_API_KEY) {
      const dataContext = `
Period: Last ${daysAgo} days
Total transactions: ${transactions.length}
Total spent: $${totalSpent.toFixed(2)}
Average transaction: $${(totalSpent / transactions.length).toFixed(2)}

Category breakdown:
${topCategories.map((cat) => `- ${cat.category}: $${cat.spent.toFixed(2)} (${cat.percentage}%)`).join("\n")}
`;

      try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: 1000,
            temperature: 0.3,
            system: `Analyze spending data and return ONLY JSON:
{
  "insights": ["3-5 key observations"],
  "patterns": ["2-3 recurring patterns"],
  "recommendations": ["3-4 actionable recommendations"],
  "topCategories": [{"category": "name", "spent": 0, "percentage": 0}],
  "totalSpent": 0,
  "txCount": 0
}`,
            messages: [{ role: "user", content: dataContext }],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.content?.find((part: { type: string }) => part.type === "text")?.text;
          if (content) {
            result = { ...fallbackResult, ...parseJsonObject(content), totalSpent, txCount: transactions.length };
          }
        } else {
          console.warn("[ai-analyze-spending] Claude failed, using deterministic fallback", response.status);
        }
      } catch (error) {
        console.warn("[ai-analyze-spending] Claude parse/call failed, using deterministic fallback", error);
      }
    }

    const periodStart = new Date(Date.now() - daysAgo * 86_400_000);
    const periodEnd = new Date();

    await supabase.from("spending_patterns").insert({
      user_id: user.id,
      pattern_type: cacheType,
      period_start: periodStart.toISOString().split("T")[0],
      period_end: periodEnd.toISOString().split("T")[0],
      data: result,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    return new Response(JSON.stringify({ ...result, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[ai-analyze-spending] error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
