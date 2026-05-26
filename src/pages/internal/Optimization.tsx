import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Zap, Database, DollarSign, TrendingUp, Layers, ShieldCheck } from "lucide-react";
import { useDashboardMetrics } from "@/shared/hooks/useDashboardMetrics";

export default function Optimization() {
  const metrics = useDashboardMetrics();

  const performanceOptimizations = [
    { name: "Route-level code splitting", impact: "Smaller user bundle", status: "In Progress", category: "Frontend" },
    { name: "BFF pagination", impact: "Lower database load", status: "Built", category: "API" },
    { name: "AI response cache", impact: "Lower Claude cost", status: "Built", category: "AI" },
    { name: "Per-user rate limits", impact: "Protects provider quotas", status: "Built", category: "Security" },
    { name: "Rewards-engine validation", impact: "Deterministic card math", status: "Next", category: "Rewards" },
    { name: "Extension endpoint validation", impact: "Safer browser flow", status: "Next", category: "Extension" },
    { name: "Cloudflare Pages deployment", impact: "Fast global static hosting", status: "Pending", category: "Hosting" },
    { name: "Sentry error tracking", impact: "Production issue visibility", status: "Pending", category: "Monitoring" },
  ];

  const scopeItems = [
    { name: "Deterministic rewards engine", impact: "Claude never decides reward math", status: "Required", category: "Core" },
    { name: "Verified card catalog", impact: "Source of truth for reward rules", status: "Required", category: "Catalog" },
    { name: "Merchant domain mapping", impact: "Known domains skip AI calls", status: "Required", category: "Extension" },
    { name: "Plaid transaction sync", impact: "Real spending analysis", status: "Pending Integration", category: "Plaid" },
    { name: "Stripe subscription gating", impact: "Revenue and feature limits", status: "Pending Integration", category: "Billing" },
    { name: "Resend email delivery", impact: "Verification and product emails", status: "Pending Integration", category: "Email" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Production Optimization</h1>
        <p className="text-muted-foreground mt-2">
          Focused on the rewards MVP: website, browser extension, Supabase, Plaid, Stripe, Resend, Cloudflare, and Claude explanations.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Performance</CardTitle>
            <Zap className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.apiLatencyImprovement} Faster</div>
            <p className="text-xs text-muted-foreground">
              {metrics.apiLatencyBefore} to {metrics.apiLatencyAfter} target p95
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database Queries</CardTitle>
            <Database className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.databaseLatencyImprovement} Faster</div>
            <p className="text-xs text-muted-foreground">
              Indexed reads, RLS, and BFF pagination
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Guardrails</CardTitle>
            <ShieldCheck className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rules First</div>
            <p className="text-xs text-muted-foreground">Claude explains, deterministic code decides</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost Control</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.costReduction}</div>
            <p className="text-xs text-muted-foreground">Cache, rate limits, and provider fallback</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Production Improvements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {performanceOptimizations.map((item) => (
              <div key={item.name} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div>
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.impact}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{item.category}</Badge>
                  <Badge variant={item.status === "Built" ? "default" : "secondary"}>{item.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-600" />
              MVP Scope Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {scopeItems.map((item) => (
              <div key={item.name} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div>
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.impact}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{item.category}</Badge>
                  <Badge variant="secondary">{item.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
