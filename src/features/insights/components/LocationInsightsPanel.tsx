import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Lightbulb, TrendingUp, AlertTriangle, Sparkles } from "lucide-react";
import { useLocationInsights, useTriggerInsightsAnalysis } from "@/features/location/hooks/useLocationInsights";
import { toast } from "sonner";

const insightIcons = {
  spending_pattern: TrendingUp,
  budget_recommendation: Lightbulb,
  anomaly_detection: AlertTriangle,
  optimization: Sparkles,
};

export function LocationInsightsPanel() {
  const { data: insights, isLoading, refetch } = useLocationInsights();
  const { triggerAnalysis } = useTriggerInsightsAnalysis();

  const handleRefresh = async () => {
    try {
      await triggerAnalysis();
      toast.success("Analyzing your spending patterns...");
      setTimeout(() => refetch(), 3000);
    } catch (error) {
      toast.error("Failed to generate insights");
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">AI Location Insights</h2>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <Sparkles className="h-4 w-4 mr-2" />
          Refresh Insights
        </Button>
      </div>

      {insights?.length === 0 ? (
        <Card className="p-8 text-center">
          <Lightbulb className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No insights yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            We need more spending data to generate personalized insights
          </p>
          <Button onClick={handleRefresh}>Generate Insights</Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {insights?.map((insight) => {
            const Icon = insightIcons[insight.insight_type];
            return (
              <Card key={insight.id} className="p-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{insight.insight_type.replace('_', ' ')}</Badge>
                      <Badge variant="outline">
                        {Math.round(insight.confidence_score * 100)}% confidence
                      </Badge>
                    </div>
                    <p className="font-medium">{insight.recommendation}</p>
                    {insight.metadata.reasoning && (
                      <p className="text-sm text-muted-foreground">
                        {insight.metadata.reasoning}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(insight.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
