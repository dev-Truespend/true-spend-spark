/**
 * UserCardTile
 *
 * Brand-aware tile for a single user-held card. Shows network-color gradient
 * strip, monospace last4, top-3 reward categories as chips, and the
 * confirmation state. Used on /app/cards (the portfolio grid).
 */

import { Link } from "react-router-dom";
import { CheckCircle2, CircleDashed, CreditCard, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/shared/lib/utils";

export interface UserCardTileRewardRule {
  category: string;
  reward_rate: number;
  reward_unit: "percent" | "points_per_dollar" | "miles_per_dollar";
  status?: string;
}

export interface UserCardTileData {
  id: string;
  display_name: string;
  issuer?: string | null;
  network?: string | null;
  last4?: string | null;
  rewards_confirmed_by_user: boolean;
  card_catalog?: {
    card_name?: string | null;
    issuer?: string | null;
    network?: string | null;
    annual_fee_cents?: number | null;
    base_reward_rate?: number | null;
    verification_status?: string | null;
    card_reward_rules?: UserCardTileRewardRule[] | null;
  } | null;
}

// Network → tailwind gradient tokens. Falls back to a neutral slate gradient.
const NETWORK_GRADIENTS: Record<string, string> = {
  visa: "from-blue-600 to-indigo-700",
  mastercard: "from-orange-500 to-red-600",
  amex: "from-emerald-500 to-teal-700",
  discover: "from-orange-400 to-amber-600",
  other: "from-slate-500 to-slate-700",
};

const NETWORK_LABEL: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "Amex",
  discover: "Discover",
  other: "Card",
};

function gradientFor(network?: string | null): string {
  const key = (network ?? "other").toLowerCase();
  return NETWORK_GRADIENTS[key] ?? NETWORK_GRADIENTS.other;
}

function formatRate(rate: number, unit: UserCardTileRewardRule["reward_unit"]): string {
  const value = Number.isInteger(rate) ? String(rate) : rate.toFixed(1);
  return unit === "percent" ? `${value}%` : `${value}x`;
}

function topRewardRules(rules: UserCardTileRewardRule[] | null | undefined): UserCardTileRewardRule[] {
  if (!rules?.length) return [];
  return rules
    .filter((rule) => (rule.status ?? "verified") !== "retired")
    .sort((a, b) => b.reward_rate - a.reward_rate)
    .slice(0, 3);
}

export function UserCardTile({ card }: { card: UserCardTileData }) {
  const network = card.network ?? card.card_catalog?.network ?? null;
  const issuer = card.issuer ?? card.card_catalog?.issuer ?? null;
  const gradient = gradientFor(network);
  const networkLabel = NETWORK_LABEL[(network ?? "other").toLowerCase()] ?? "Card";
  const topRules = topRewardRules(card.card_catalog?.card_reward_rules ?? null);
  const annualFeeDollars = (card.card_catalog?.annual_fee_cents ?? 0) / 100;

  return (
    <Card className="group relative overflow-hidden transition-shadow hover:shadow-lg">
      {/* Brand-color gradient strip */}
      <div className={cn("h-3 w-full bg-gradient-to-r", gradient)} aria-hidden />

      <CardContent className="space-y-4 p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold leading-tight">{card.display_name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {[issuer, networkLabel].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm",
            gradient,
          )}>
            <CreditCard className="h-4 w-4" />
          </div>
        </div>

        {/* Last4 monospace + status badge */}
        <div className="flex items-center justify-between">
          {card.last4 ? (
            <span className="font-mono text-sm tracking-wider text-muted-foreground">
              •••• {card.last4}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground italic">no last 4 yet</span>
          )}

          <Badge
            variant={card.rewards_confirmed_by_user ? "default" : "secondary"}
            className={cn(
              "h-5 gap-1 px-2 text-[10px]",
              card.rewards_confirmed_by_user
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                : "animate-pulse",
            )}
          >
            {card.rewards_confirmed_by_user
              ? <CheckCircle2 className="h-3 w-3" />
              : <CircleDashed className="h-3 w-3" />}
            {card.rewards_confirmed_by_user ? "Confirmed" : "Review rewards"}
          </Badge>
        </div>

        {/* Top reward chips */}
        {topRules.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {topRules.map((rule, idx) => (
              <Badge
                key={`${rule.category}-${idx}`}
                variant="outline"
                className="h-6 gap-1 border-primary/20 bg-primary/5 px-2 text-[11px] text-primary"
              >
                <span className="font-semibold">{formatRate(rule.reward_rate, rule.reward_unit)}</span>
                <span className="text-muted-foreground">{rule.category}</span>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No catalog rewards mapped yet.</p>
        )}

        {/* Footer: annual fee + CTA */}
        <div className="flex items-center justify-between border-t pt-3">
          <span className="text-xs text-muted-foreground">
            {annualFeeDollars > 0
              ? <>Annual fee <span className="font-medium text-foreground">${annualFeeDollars.toFixed(0)}</span></>
              : <>No annual fee</>}
          </span>
          <Button asChild size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs">
            <Link to={`/app/cards/${card.id}`}>
              Details
              <ChevronRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
