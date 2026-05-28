/**
 * CardDetailPage
 *
 * Detail view for a single user-held card. Shows: brand-color hero with
 * monospace last4, catalog reward rules, active signup bonus, catalog
 * verification status with "last checked X ago" + confidence, and the recent
 * extraction history pulled from catalog_update_reviews.
 *
 * @requires user_credit_cards, card_catalog, card_reward_rules,
 *           card_signup_bonuses, catalog_update_reviews
 */

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  CreditCard,
  Sparkles,
  ChevronLeft,
  ShieldCheck,
  ShieldAlert,
  Gift,
  History,
  ExternalLink,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { catalogTable, type CatalogChangeType } from "@/integrations/supabase/catalog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import { RewardRuleList, type RewardRuleListItem } from "../components/RewardRuleList";

interface CardDetail {
  id: string;
  display_name: string;
  issuer?: string | null;
  network?: string | null;
  last4?: string | null;
  rewards_confirmed_by_user: boolean;
  card_catalog?: {
    id?: string;
    card_name: string;
    issuer?: string | null;
    network?: string | null;
    annual_fee_cents: number;
    verification_status: string;
    last_verified_at?: string | null;
    last_checked_at?: string | null;
    last_extraction_confidence?: number | null;
    pending_change_count?: number | null;
    official_product_url?: string | null;
    card_reward_rules?: RewardRuleListItem[];
  } | null;
}

interface SignupBonus {
  id: string;
  bonus_description: string;
  bonus_value_cents: number | null;
  spend_requirement_cents: number | null;
  window_days: number | null;
  source_url: string | null;
}

interface ExtractionReview {
  id: string;
  change_type: string;
  status: string;
  detected_by: string;
  created_at: string;
}

const NETWORK_GRADIENTS: Record<string, string> = {
  visa: "from-blue-600 to-indigo-700",
  mastercard: "from-orange-500 to-red-600",
  amex: "from-emerald-500 to-teal-700",
  discover: "from-orange-400 to-amber-600",
  other: "from-slate-500 to-slate-700",
};

function gradientFor(network?: string | null): string {
  return NETWORK_GRADIENTS[(network ?? "other").toLowerCase()] ?? NETWORK_GRADIENTS.other;
}

function confidenceBadge(value: number | null | undefined) {
  if (value == null) return null;
  const pct = Math.round(value * 100);
  const tone = pct >= 85
    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
    : pct >= 50
      ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
      : "bg-destructive/10 text-destructive";
  return (
    <Badge variant="outline" className={cn("h-5 px-1.5 text-[10px]", tone)}>
      {pct}% confidence
    </Badge>
  );
}

function changeTypeLabel(type: string): string {
  const map: Record<CatalogChangeType, string> = {
    reward_rate_change: "Rate changed",
    cap_change: "Cap changed",
    applies_to_change: "Terms updated",
    new_rule: "New rule",
    removed_rule: "Rule removed",
    fee_change: "Fee changed",
    bonus_change: "Bonus updated",
  };
  return map[type as CatalogChangeType] ?? type.replace(/_/g, " ");
}

export default function CardDetailPage() {
  const { id } = useParams();
  const [card, setCard] = useState<CardDetail | null>(null);
  const [bonus, setBonus] = useState<SignupBonus | null>(null);
  const [reviews, setReviews] = useState<ExtractionReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) return;
      setLoading(true);

      const { data, error: queryError } = await catalogTable
        .userCreditCards()
        .select(
          `id, display_name, issuer, network, last4, rewards_confirmed_by_user,
           card_catalog:card_catalog_id (
             id, card_name, issuer, network, annual_fee_cents, verification_status,
             last_verified_at, last_checked_at, last_extraction_confidence,
             pending_change_count, official_product_url,
             card_reward_rules ( id, category, reward_rate, reward_unit,
               cap_amount_cents, cap_period, requires_activation, status )
           )`,
        )
        .eq("id", id)
        .maybeSingle();

      if (cancelled) return;
      if (queryError) {
        setError(queryError.message);
        setLoading(false);
        return;
      }

      const detail = data as unknown as CardDetail | null;
      setCard(detail);
      setLoading(false);

      const catalogId = detail?.card_catalog?.id;
      if (!catalogId) return;

      const [{ data: bonusRow }, { data: reviewRows }] = await Promise.all([
        catalogTable
          .cardSignupBonuses()
          .select("id, bonus_description, bonus_value_cents, spend_requirement_cents, window_days, source_url")
          .eq("card_catalog_id", catalogId)
          .eq("status", "verified")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        catalogTable
          .catalogUpdateReviews()
          .select("id, change_type, status, detected_by, created_at")
          .eq("card_catalog_id", catalogId)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      if (cancelled) return;
      setBonus((bonusRow as SignupBonus | null) ?? null);
      setReviews((reviewRows as ExtractionReview[] | null) ?? []);
    }

    void load();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto max-w-4xl space-y-6 px-4 py-8">
          <Skeleton className="h-9 w-32" />
          <Card className="overflow-hidden">
            <Skeleton className="h-32 w-full" />
            <CardContent className="space-y-3 p-6">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </CardContent>
          </Card>
          <Card><CardContent className="space-y-3 p-6">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent></Card>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto max-w-4xl px-4 py-8">
          <Card className="border-destructive/30">
            <CardContent className="p-6 text-destructive">{error}</CardContent>
          </Card>
        </div>
      </main>
    );
  }

  if (!card) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto max-w-4xl px-4 py-8">
          <p className="text-muted-foreground">Card not found.</p>
          <Button asChild variant="ghost" className="mt-4">
            <Link to="/app/cards"><ChevronLeft className="mr-1 h-4 w-4" /> Back to cards</Link>
          </Button>
        </div>
      </main>
    );
  }

  const network = card.network ?? card.card_catalog?.network ?? null;
  const issuer = card.issuer ?? card.card_catalog?.issuer ?? null;
  const gradient = gradientFor(network);
  const verifiedAt = card.card_catalog?.last_verified_at;
  const checkedAt = card.card_catalog?.last_checked_at;
  const confidence = card.card_catalog?.last_extraction_confidence ?? null;
  const pendingChanges = card.card_catalog?.pending_change_count ?? 0;
  const verificationStatus = card.card_catalog?.verification_status ?? "unverified";
  const isVerified = verificationStatus === "verified";

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl space-y-6 px-4 py-8">
        {/* Back link */}
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/app/cards">
            <ChevronLeft className="mr-1 h-4 w-4" />
            All cards
          </Link>
        </Button>

        {/* Card hero: gradient + name + last4 */}
        <Card className="overflow-hidden">
          <div className={cn("relative bg-gradient-to-br p-6 text-white", gradient)}>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wider opacity-80">{issuer ?? "Credit card"}</p>
                <h1 className="text-2xl font-semibold tracking-tight">{card.display_name}</h1>
              </div>
              <CreditCard className="h-7 w-7 opacity-90" />
            </div>
            <div className="mt-8 flex items-end justify-between">
              <span className="font-mono text-xl tracking-[0.3em] opacity-90">
                {card.last4 ? `•••• ${card.last4}` : "•••• ••••"}
              </span>
              <span className="text-xs uppercase tracking-wider opacity-80">
                {network ?? "card"}
              </span>
            </div>
          </div>

          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "h-6 gap-1 px-2",
                  isVerified
                    ? "border-emerald-200 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "border-amber-200 bg-amber-500/10 text-amber-700 dark:text-amber-400",
                )}
              >
                {isVerified ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
                {verificationStatus.replace(/_/g, " ")}
              </Badge>
              {confidenceBadge(confidence)}
              {pendingChanges > 0 && (
                <Badge variant="destructive" className="h-6 px-2">
                  {pendingChanges} pending change{pendingChanges === 1 ? "" : "s"}
                </Badge>
              )}
              {verifiedAt && (
                <span className="text-xs text-muted-foreground">
                  Verified {formatDistanceToNow(new Date(verifiedAt), { addSuffix: true })}
                </span>
              )}
              {!verifiedAt && checkedAt && (
                <span className="text-xs text-muted-foreground">
                  Last checked {formatDistanceToNow(new Date(checkedAt), { addSuffix: true })}
                </span>
              )}
            </div>
            <Button asChild size="sm">
              <Link to={`/app/cards/${card.id}/rewards`}>
                <Sparkles className="mr-1 h-3 w-3" />
                Edit rewards
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Catalog reward rules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Catalog reward rules</span>
              {card.card_catalog?.official_product_url && (
                <Button asChild size="sm" variant="ghost" className="h-7 gap-1 text-xs">
                  <a
                    href={card.card_catalog.official_product_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Issuer page
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RewardRuleList rules={card.card_catalog?.card_reward_rules ?? []} />
          </CardContent>
        </Card>

        {/* Signup bonus */}
        {bonus && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-primary" />
                Current signup bonus
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">{bonus.bonus_description}</p>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {bonus.bonus_value_cents != null && (
                  <Badge variant="secondary" className="h-5 px-2">
                    Worth ~${(bonus.bonus_value_cents / 100).toLocaleString()}
                  </Badge>
                )}
                {bonus.spend_requirement_cents != null && (
                  <Badge variant="secondary" className="h-5 px-2">
                    Spend ${(bonus.spend_requirement_cents / 100).toLocaleString()}
                  </Badge>
                )}
                {bonus.window_days != null && (
                  <Badge variant="secondary" className="h-5 px-2">
                    In {bonus.window_days} days
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Extraction history */}
        {reviews.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                Recent catalog updates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {reviews.map((review) => (
                  <li key={review.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{changeTypeLabel(review.change_type)}</p>
                      <p className="text-xs text-muted-foreground">
                        {review.detected_by} · {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-5 px-1.5 text-[10px] capitalize",
                        review.status === "approved" && "border-emerald-200 text-emerald-700 dark:text-emerald-400",
                        review.status === "rejected" && "border-destructive/30 text-destructive",
                        review.status === "proposed" && "border-amber-200 text-amber-700 dark:text-amber-400",
                      )}
                    >
                      {review.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
