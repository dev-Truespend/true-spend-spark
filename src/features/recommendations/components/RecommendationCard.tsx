/**
 * RecommendationCard
 *
 * Renders a single AI recommendation from the ai_recommendations table.
 * Adapts its icon, color, and CTA based on recommendation_type.
 *
 * @requires useRecommendations hook (for dismiss/action callbacks)
 * @requires ai_recommendations table (RLS: user sees own rows)
 */

import { CreditCard, Lightbulb, AlertTriangle, TrendingUp, Bell, RefreshCw, X, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { AIRecommendation } from "@/shared/hooks/useAIAgent";

interface RecommendationCardProps {
  rec: AIRecommendation;
  onDismiss: (id: string) => void;
  onAction?: (id: string) => void;
}

const TYPE_CONFIG: Record<
  string,
  { icon: React.ReactNode; color: string; label: string; actionLabel?: string }
> = {
  best_card_now: {
    icon: <CreditCard className="h-4 w-4" />,
    color: "bg-primary/10 text-primary border-primary/20",
    label: "Card tip",
    actionLabel: "Got it",
  },
  missed_rewards: {
    icon: <TrendingUp className="h-4 w-4" />,
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-400/20",
    label: "Missed rewards",
    actionLabel: "I'll fix this",
  },
  apply_suggestion: {
    icon: <CreditCard className="h-4 w-4" />,
    color: "bg-accent/10 text-accent border-accent/20",
    label: "Apply for card",
    actionLabel: "Learn more",
  },
  spending_insight: {
    icon: <Lightbulb className="h-4 w-4" />,
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-400/20",
    label: "Insight",
  },
  subscription_alert: {
    icon: <Bell className="h-4 w-4" />,
    color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-400/20",
    label: "Subscription",
    actionLabel: "Review",
  },
  duplicate_charge: {
    icon: <AlertTriangle className="h-4 w-4" />,
    color: "bg-destructive/10 text-destructive border-destructive/20",
    label: "Possible duplicate",
    actionLabel: "Review",
  },
};

export function RecommendationCard({ rec, onDismiss, onAction }: RecommendationCardProps) {
  const cfg = TYPE_CONFIG[rec.recommendation_type] ?? {
    icon: <Lightbulb className="h-4 w-4" />,
    color: "bg-muted text-muted-foreground border-border",
    label: "Insight",
  };

  const meta = rec.metadata as Record<string, unknown>;
  const applyUrl = meta?.apply_url as string | undefined;
  const estimatedDollars = rec.estimated_value_cents
    ? `$${(rec.estimated_value_cents / 100).toFixed(2)}`
    : null;

  return (
    <Card className={cn("border transition-shadow hover:shadow-md", rec.recommendation_type === "duplicate_charge" && "border-destructive/30")}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={cn("h-9 w-9 rounded-lg border flex items-center justify-center shrink-0 mt-0.5", cfg.color)}>
            {cfg.icon}
          </div>

          {/* Body */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4 border", cfg.color)}>
                {cfg.label}
              </Badge>
              {estimatedDollars && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40">
                  +{estimatedDollars}/yr
                </Badge>
              )}
              <span className="text-[10px] text-muted-foreground ml-auto">
                {formatDistanceToNow(new Date(rec.created_at), { addSuffix: true })}
              </span>
            </div>

            <p className="font-semibold text-sm mb-0.5">{rec.title}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{rec.body}</p>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3">
              {cfg.actionLabel && (
                applyUrl ? (
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 text-xs gap-1"
                    asChild
                  >
                    <a href={applyUrl} target="_blank" rel="noopener noreferrer" onClick={() => onAction?.(rec.id)}>
                      {cfg.actionLabel}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 text-xs"
                    onClick={() => onAction?.(rec.id)}
                  >
                    {cfg.actionLabel}
                  </Button>
                )
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-muted-foreground gap-1"
                onClick={() => onDismiss(rec.id)}
              >
                <X className="h-3 w-3" />
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
