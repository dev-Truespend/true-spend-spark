import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Loader2, TrendingUp, Lightbulb, AlertCircle, Sparkles, AlertTriangle,
  RefreshCw, BarChart3, PieChart,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────
interface TopCategory {
  category:   string;
  spent:      number;
  percentage: number;
}

interface SpendingAnalysis {
  insights:        string[];
  patterns:        string[];
  recommendations: string[];
  topCategories?:  TopCategory[];
  totalSpent?:     number;
  txCount?:        number;
  cached?:         boolean;
}

interface AnomalyRow {
  id:               string;
  anomaly_type:     string;
  severity:         string;
  confidence_score: number | null;
  detected_at:      string;
  status:           string;
  transaction?:     { description?: string | null; amount?: number | string } | null;
}

type Period = "week" | "month" | "quarter";
const PERIOD_DAYS: Record<Period, number> = { week: 7, month: 30, quarter: 90 };
const PERIOD_LABEL: Record<Period, string> = {
  week:    "Last 7 days",
  month:   "Last 30 days",
  quarter: "Last 90 days",
};

// ── Main page ────────────────────────────────────────────────────────
export default function Insights() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [period, setPeriod] = useState<Period>("month");

  // ── Analysis query ─────────────────────────────────────────────────
  const analysisQuery = useQuery<SpendingAnalysis>({
    queryKey: ['spending-analysis', period, user?.id],
    enabled:  !!user,
    staleTime: 60 * 60 * 1000, // 1 hour client-side (server caches 24h)
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('ai-analyze-spending', {
        body: { period },
      });
      if (error) {
        if (error.message?.includes('Rate limit')) {
          toast.error('Rate limit exceeded — please wait a few minutes.');
        } else if (error.message?.includes('credits')) {
          toast.error('AI credits depleted — contact support.');
        }
        throw error;
      }
      return data;
    },
  });

  // ── Force-refresh mutation (bypass cache) ──────────────────────────
  // The Edge Function reads from spending_patterns first; deleting the
  // current period's cache row before refetch forces a fresh AI call.
  const refresh = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const patternType = period === 'week' ? 'weekly' : period === 'quarter' ? 'quarterly' : 'monthly';
      // Best-effort cache bust — ignore errors (RLS may block, the
      // Edge Function will fall back to whatever's in the cache).
      await supabase
        .from('spending_patterns')
        .delete()
        .eq('user_id', user.id)
        .eq('pattern_type', patternType);

      qc.invalidateQueries({ queryKey: ['spending-analysis', period] });
      // Wait for refetch so the spinner is honest
      await analysisQuery.refetch();
    },
    onSuccess: () => toast.success("Insights refreshed"),
  });

  // ── Anomalies query ────────────────────────────────────────────────
  const anomaliesQuery = useQuery<AnomalyRow[]>({
    queryKey: ['anomalies', user?.id],
    enabled:  !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('anomaly_detections')
        .select('id, anomaly_type, severity, confidence_score, detected_at, status, transaction:transactions(description, amount)')
        .eq('status', 'pending')
        .order('detected_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as unknown as AnomalyRow[];
    },
  });

  const analysis = analysisQuery.data;
  const anomalies = anomaliesQuery.data ?? [];

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-5 max-w-5xl">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            AI Insights
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Smart analysis of your spending patterns · {PERIOD_LABEL[period]}
            {analysis?.cached && (
              <Badge variant="outline" className="ml-2 gap-1 text-[10px]">
                <Sparkles className="h-3 w-3" />
                Cached
              </Badge>
            )}
          </p>
        </div>

        <Button
          onClick={() => refresh.mutate()}
          disabled={refresh.isPending || analysisQuery.isFetching}
          variant="outline"
          className="gap-2 self-start"
        >
          {(refresh.isPending || analysisQuery.isFetching) ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {/* ── Period tabs ─────────────────────────────────────────── */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
        <TabsList className="grid grid-cols-3 w-full max-w-sm">
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="month">Month</TabsTrigger>
          <TabsTrigger value="quarter">Quarter</TabsTrigger>
        </TabsList>

        <TabsContent value={period} className="space-y-5 mt-5">
          {/* ── Error state ─────────────────────────────────────── */}
          {analysisQuery.isError ? (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="py-10 text-center space-y-3">
                <AlertTriangle className="h-8 w-8 text-destructive/70 mx-auto" />
                <div>
                  <p className="font-medium">Couldn't generate insights</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {analysisQuery.error instanceof Error ? analysisQuery.error.message : "Please try again."}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => analysisQuery.refetch()}>
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : analysisQuery.isLoading ? (
            <AnalysisSkeleton />
          ) : !analysis || (analysis.txCount === 0 && (!analysis.insights || analysis.insights.length === 0)) ? (
            <EmptyState />
          ) : (
            <>
              {/* ── Summary tiles ──────────────────────────────── */}
              {analysis.totalSpent !== undefined && analysis.txCount !== undefined && analysis.txCount > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  <SummaryTile
                    label="Total spent"
                    value={`$${analysis.totalSpent.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                    caption={PERIOD_LABEL[period]}
                  />
                  <SummaryTile
                    label="Transactions"
                    value={String(analysis.txCount)}
                    caption={PERIOD_LABEL[period]}
                  />
                  <SummaryTile
                    label="Avg per transaction"
                    value={`$${(analysis.totalSpent / analysis.txCount).toFixed(2)}`}
                    caption=" "
                  />
                </div>
              )}

              {/* ── Top categories chart ──────────────────────── */}
              {analysis.topCategories && analysis.topCategories.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <PieChart className="h-4 w-4 text-primary" />
                      Top spending categories
                    </CardTitle>
                    <CardDescription>Where your money went</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {analysis.topCategories.slice(0, 6).map((cat, i) => (
                      <div key={cat.category} className="space-y-1.5">
                        <div className="flex justify-between items-baseline text-sm">
                          <span className="font-medium">{cat.category}</span>
                          <span className="text-muted-foreground tabular-nums">
                            ${Number(cat.spent).toFixed(2)} · <strong>{Math.round(cat.percentage)}%</strong>
                          </span>
                        </div>
                        <Progress
                          value={cat.percentage}
                          className={cn(
                            "h-2",
                            i === 0 && "[&>div]:bg-primary",
                            i === 1 && "[&>div]:bg-accent",
                            i === 2 && "[&>div]:bg-brand-teal"
                          )}
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* ── Key insights ──────────────────────────────── */}
              {analysis.insights?.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Key insights
                    </CardTitle>
                    <CardDescription>What stands out in your spending</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {analysis.insights.map((insight, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                          <p className="text-sm leading-relaxed">{insight}</p>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* ── Recommendations ───────────────────────────── */}
              {analysis.recommendations?.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-amber-500" />
                      Recommendations
                    </CardTitle>
                    <CardDescription>Ways to optimize your spending</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/30">
                          <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                          <p className="text-sm leading-relaxed">{rec}</p>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* ── Patterns ──────────────────────────────────── */}
              {analysis.patterns?.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-accent" />
                      Spending patterns
                    </CardTitle>
                    <CardDescription>Recurring trends we detected</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.patterns.map((pattern, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-accent">•</span>
                          <span>{pattern}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* ── Anomalies (always shown if present) ────────────── */}
          {anomalies.length > 0 && (
            <Card className="border-orange-300 dark:border-orange-700">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  {anomalies.length} unusual transaction{anomalies.length === 1 ? '' : 's'}
                </CardTitle>
                <CardDescription>Review and dismiss if expected</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {anomalies.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-card border">
                      <div className="flex items-start gap-3 min-w-0">
                        <AlertCircle className={cn(
                          "h-4 w-4 mt-0.5 shrink-0",
                          a.severity === 'critical' ? "text-red-600" :
                          a.severity === 'warning'  ? "text-orange-600" :
                                                       "text-blue-600"
                        )} />
                        <div className="min-w-0">
                          <p className="font-medium text-sm capitalize truncate">
                            {a.anomaly_type.replace(/_/g, ' ')}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {a.transaction?.description || 'Unknown'}
                            {a.transaction?.amount !== undefined && ` · $${Number(a.transaction.amount).toFixed(2)}`}
                          </p>
                          {a.confidence_score && (
                            <p className="text-xs text-muted-foreground">
                              {Math.round(Number(a.confidence_score) * 100)}% confidence
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant={a.severity === 'critical' ? 'destructive' : 'outline'} className="capitalize shrink-0">
                        {a.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────

function SummaryTile({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <Card className="border-0 shadow-sm bg-gradient-to-br from-muted/40 to-muted/10">
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
        <p className="text-xl sm:text-2xl font-bold tabular-nums">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{caption}</p>
      </CardContent>
    </Card>
  );
}

function AnalysisSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48 mt-1" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="py-14 text-center space-y-4">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
          <Sparkles className="h-7 w-7 text-primary" />
        </div>
        <div>
          <p className="text-lg font-semibold">Not enough data yet</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Add a few transactions or connect a card. We'll generate
            personalised insights once you have at least a week of data.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
