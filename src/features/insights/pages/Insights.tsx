import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdaptiveContent } from "@/features/sync/hooks/useAdaptiveContent";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Badge } from "@/shared/components/ui/badge";
import { toast } from "sonner";
import { Loader2, TrendingUp, Lightbulb, AlertCircle, Sparkles } from "lucide-react";
import { LowDataModeIndicator } from "@/shared/components/ui/LowDataModeIndicator";
import { SkeletonLoader } from "@/shared/components/ui/SkeletonLoader";
import { cn } from "@/shared/lib/utils";

interface SpendingAnalysis {
  insights: string[];
  patterns: string[];
  recommendations: string[];
  topCategories?: { category: string; spent: number; percentage: number }[];
  cached?: boolean;
}

export default function Insights() {
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('month');
  const [isGenerating, setIsGenerating] = useState(false);
  const { shouldDeferNonCritical, shouldAnimate } = useAdaptiveContent();

  const { data: analysis, isLoading, refetch } = useQuery<SpendingAnalysis>({
    queryKey: ['spending-analysis', period],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('ai-analyze-spending', {
        body: { period },
      });

      if (error) {
        if (error.message?.includes('Rate limit')) {
          toast.error('Rate limit exceeded. Please wait before requesting another analysis.');
        } else if (error.message?.includes('credits')) {
          toast.error('AI credits depleted. Please add credits to continue.');
        }
        throw error;
      }

      return data;
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });

  const { data: anomalies } = useQuery({
    queryKey: ['anomalies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('anomaly_detections')
        .select('*, transaction:transactions(*)')
        .eq('status', 'pending')
        .order('detected_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  const handleGenerateInsights = async () => {
    setIsGenerating(true);
    try {
      await refetch();
      toast.success('Insights refreshed!');
    } catch (error) {
      console.error('Failed to generate insights:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-blue-600" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <LowDataModeIndicator />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">AI Insights</h1>
          <p className="text-muted-foreground">Smart analysis of your spending patterns</p>
        </div>
        
        <Button onClick={handleGenerateInsights} disabled={isGenerating || shouldDeferNonCritical}>
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : shouldDeferNonCritical ? (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Deferred (Low Data)
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Refresh Insights
            </>
          )}
        </Button>
      </div>

      <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
        <TabsList>
          <TabsTrigger value="week">Last Week</TabsTrigger>
          <TabsTrigger value="month">Last Month</TabsTrigger>
          <TabsTrigger value="quarter">Last Quarter</TabsTrigger>
        </TabsList>

        <TabsContent value={period} className="space-y-6 mt-6">
          {isLoading ? (
            shouldDeferNonCritical ? (
              <div className="text-center py-12 text-muted-foreground">
                Deferring analysis... (Low Data Mode)
              </div>
            ) : (
              <div className="space-y-6">
                <SkeletonLoader variant="chart" count={1} />
                <SkeletonLoader variant="card" count={2} />
              </div>
            )
          ) : analysis ? (
            <div className={cn(
              "space-y-6",
              shouldAnimate && "animate-fade-in"
            )}>
              {analysis.cached && (
                <Badge variant="outline" className="mb-4">
                  <Sparkles className="mr-1 h-3 w-3" />
                  Cached from earlier analysis
                </Badge>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Key Insights
                  </CardTitle>
                  <CardDescription>What stands out in your spending</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {analysis.insights?.map((insight, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="mt-0.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                        <p className="text-sm">{insight}</p>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-yellow-500" />
                    Recommendations
                  </CardTitle>
                  <CardDescription>Ways to optimize your spending</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {analysis.recommendations?.map((rec, i) => (
                      <li key={i} className="flex items-start gap-3 p-3 bg-secondary rounded-lg">
                        <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm">{rec}</p>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {analysis.patterns && analysis.patterns.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Spending Patterns</CardTitle>
                    <CardDescription>Recurring trends detected</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.patterns.map((pattern, i) => (
                        <li key={i} className="text-sm text-muted-foreground">
                          • {pattern}
                        </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No analysis available yet. Add some transactions to get AI-powered insights!
              </CardContent>
            </Card>
          )}

          {anomalies && anomalies.length > 0 && (
            <Card className="border-orange-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  Detected Anomalies
                </CardTitle>
                <CardDescription>Unusual transactions requiring review</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {anomalies.map((anomaly) => (
                    <div key={anomaly.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                      <div className="flex items-start gap-3 flex-1">
                        {getSeverityIcon(anomaly.severity)}
                        <div className="flex-1">
                          <p className="font-medium text-sm capitalize">{anomaly.anomaly_type.replace('_', ' ')}</p>
                          <p className="text-xs text-muted-foreground">
                            {anomaly.transaction?.description || 'Unknown'} - $
                            {Number(anomaly.transaction?.amount).toFixed(2)}
                          </p>
                          {anomaly.confidence_score && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Confidence: {Math.round(Number(anomaly.confidence_score) * 100)}%
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant={anomaly.severity === 'critical' ? 'destructive' : 'outline'}>
                        {anomaly.severity}
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