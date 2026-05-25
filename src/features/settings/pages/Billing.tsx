import { useState } from "react";
import { useSubscription } from "@/shared/hooks/useSubscription";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getStripe } from "@/integrations/stripe";
import { useToast } from "@/hooks/use-toast";
import { Button }   from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge }    from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  Zap,
  Building2,
  CreditCard,
  Loader2,
  AlertTriangle,
  Clock,
} from "lucide-react";

// ── Price IDs — override via environment ────────────────────────────────
const PRICE_IDS = {
  pro_monthly:    import.meta.env.VITE_STRIPE_PRO_MONTHLY_PRICE_ID  as string ?? "",
  pro_annual:     import.meta.env.VITE_STRIPE_PRO_ANNUAL_PRICE_ID   as string ?? "",
};

// ── Plan cards ───────────────────────────────────────────────────────────

const PLANS = [
  {
    id:          "free",
    name:        "Free",
    price:       "$0",
    period:      "forever",
    icon:        <CheckCircle2 className="h-6 w-6 text-muted-foreground" />,
    features:    ["Up to 3 credit cards", "50 transactions/month", "Basic insights", "Mobile app"],
    priceId:     null,
    highlight:   false,
  },
  {
    id:          "pro",
    name:        "Pro",
    price:       "$9",
    period:      "/ month",
    annualPrice: "$79 / year",
    icon:        <Zap className="h-6 w-6 text-primary" />,
    features:    [
      "Unlimited credit cards",
      "Unlimited transactions",
      "AI categorisation",
      "Plaid bank sync",
      "Chrome extension",
      "Priority support",
      "14-day free trial",
    ],
    priceId:     PRICE_IDS.pro_monthly,
    annualPriceId: PRICE_IDS.pro_annual,
    highlight:   true,
  },
  {
    id:          "enterprise",
    name:        "Enterprise",
    price:       "Custom",
    period:      "",
    icon:        <Building2 className="h-6 w-6 text-accent" />,
    features:    [
      "Everything in Pro",
      "SSO / SAML",
      "Custom data retention",
      "Dedicated support SLA",
      "Volume pricing",
    ],
    priceId:     null,
    highlight:   false,
  },
] as const;

// ── Component ────────────────────────────────────────────────────────────

export default function Billing() {
  const { session }     = useAuth();
  const { subscription, plan, status, isPro, isTrialing, trialEnd, periodEnd, cancelAtPeriodEnd } = useSubscription();
  const { toast }       = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  // Format a date string to "May 25, 2026"
  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—";

  const authHeader = () => ({
    Authorization: `Bearer ${session?.access_token ?? ""}`,
  });

  // ── Checkout ──────────────────────────────────────────────────────────
  async function startCheckout(priceId: string, label: string) {
    if (!priceId) {
      toast({ title: "Coming soon", description: "Contact us for enterprise pricing." });
      return;
    }
    setLoading(label);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-create-checkout-session", {
        body:    { priceId, successUrl: `${window.location.origin}/settings/billing?success=true`, cancelUrl: `${window.location.origin}/settings/billing?canceled=true` },
        headers: authHeader(),
      });

      if (error || !data?.url) throw error ?? new Error("No checkout URL returned");

      const stripe = await getStripe();
      if (!stripe) throw new Error("Stripe.js failed to load");

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      console.error("[Billing] checkout error:", err);
      toast({
        title:       "Checkout failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant:     "destructive",
      });
    } finally {
      setLoading(null);
    }
  }

  // ── Portal ────────────────────────────────────────────────────────────
  async function openPortal() {
    setLoading("portal");
    try {
      const { data, error } = await supabase.functions.invoke("stripe-create-portal-session", {
        body:    { returnUrl: `${window.location.origin}/settings/billing` },
        headers: authHeader(),
      });

      if (error || !data?.url) throw error ?? new Error("No portal URL returned");
      window.location.href = data.url;
    } catch (err) {
      console.error("[Billing] portal error:", err);
      toast({
        title:       "Billing portal unavailable",
        description: err instanceof Error ? err.message : "Please try again.",
        variant:     "destructive",
      });
    } finally {
      setLoading(null);
    }
  }

  // ── Status badge ──────────────────────────────────────────────────────
  const statusBadge = () => {
    if (!subscription) return null;
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      active:     { label: "Active",      variant: "default"     },
      trialing:   { label: "Trial",       variant: "secondary"   },
      past_due:   { label: "Past due",    variant: "destructive" },
      canceled:   { label: "Canceled",    variant: "outline"     },
      incomplete: { label: "Incomplete",  variant: "outline"     },
    };
    const s = map[status ?? ""] ?? { label: status ?? "", variant: "outline" as const };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">
      <div>
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground mt-1">Manage your plan and payment details.</p>
      </div>

      {/* ── Current plan summary ────────────────────────────────────── */}
      {subscription && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="capitalize">{plan} Plan</CardTitle>
              {statusBadge()}
            </div>
            <CardDescription>
              {isTrialing && trialEnd && (
                <span className="flex items-center gap-1 text-amber-600">
                  <Clock className="h-4 w-4" />
                  Trial ends {fmtDate(trialEnd)}
                </span>
              )}
              {isPro && !isTrialing && periodEnd && (
                <span>
                  {cancelAtPeriodEnd
                    ? `Cancels on ${fmtDate(periodEnd)}`
                    : `Renews ${fmtDate(periodEnd)}`}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          {isPro && (
            <CardContent>
              <Button
                variant="outline"
                onClick={openPortal}
                disabled={loading === "portal"}
                className="gap-2"
              >
                {loading === "portal" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                Manage billing &amp; invoices
              </Button>
            </CardContent>
          )}
        </Card>
      )}

      {/* ── Trial / past-due banner ─────────────────────────────────── */}
      {status === "past_due" && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <div>
            <p className="font-medium text-destructive">Payment failed</p>
            <p className="text-sm text-muted-foreground">
              Please update your payment method to keep your Pro features.
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={openPortal}
            disabled={loading === "portal"}
            className="ml-auto"
          >
            Update payment
          </Button>
        </div>
      )}

      <Separator />

      {/* ── Plan cards ──────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Choose a plan</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((p) => {
            const isCurrent = plan === p.id;
            const canUpgrade = !isPro && p.id === "pro";

            return (
              <Card
                key={p.id}
                className={`relative flex flex-col ${
                  p.highlight
                    ? "border-primary shadow-lg shadow-primary/10"
                    : "border"
                }`}
              >
                {p.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-3">Most popular</Badge>
                  </div>
                )}
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    {p.icon}
                    <CardTitle>{p.name}</CardTitle>
                  </div>
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-bold">{p.price}</span>
                    <span className="text-muted-foreground pb-1">{p.period}</span>
                  </div>
                  {"annualPrice" in p && p.annualPrice && (
                    <p className="text-sm text-muted-foreground">{p.annualPrice} billed annually</p>
                  )}
                </CardHeader>

                <CardContent className="flex flex-col flex-1 gap-4">
                  <ul className="space-y-2 flex-1">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <Button variant="outline" disabled className="w-full">
                      Current plan
                    </Button>
                  ) : p.id === "enterprise" ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.open("mailto:sales@truespend.org", "_blank")}
                    >
                      Contact sales
                    </Button>
                  ) : canUpgrade && p.priceId ? (
                    <div className="space-y-2">
                      <Button
                        className="w-full"
                        onClick={() => startCheckout(p.priceId!, "pro_monthly")}
                        disabled={!!loading}
                      >
                        {loading === "pro_monthly" ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Start free trial
                      </Button>
                      {"annualPriceId" in p && p.annualPriceId && (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => startCheckout((p as typeof PLANS[1]).annualPriceId!, "pro_annual")}
                          disabled={!!loading}
                        >
                          {loading === "pro_annual" ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : null}
                          Save 27% — annual
                        </Button>
                      )}
                    </div>
                  ) : isPro && p.id === "free" ? (
                    <Button variant="outline" className="w-full" onClick={openPortal} disabled={!!loading}>
                      {loading === "portal" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Cancel subscription
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Payments are processed securely by Stripe. You can cancel at any time.
      </p>
    </div>
  );
}
