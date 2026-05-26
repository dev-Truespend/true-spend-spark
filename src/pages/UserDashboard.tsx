import { Link } from "react-router-dom";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/shared/hooks/useSubscription";
import { useCreditCards } from "@/features/credit-cards/hooks/useCreditCards";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { UnverifiedBanner } from "@/components/auth/UnverifiedBanner";
import { ErrorBoundary } from "@/shared/components/error/ErrorBoundary";

import {
  Receipt,
  Wallet,
  TrendingUp,
  CreditCard,
  BarChart3,
  Sparkles,
  Plus,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  ChevronRight,
  Settings as SettingsIcon,
  MapPin,
  Lightbulb,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Type for our queries ─────────────────────────────────────────────────
interface TxRow {
  id:          string;
  amount:      number;
  category:    string | null;
  description: string | null;
  timestamp:   string;
}

interface BudgetRow {
  id:           string;
  category:     string;
  limit_amount: number;
  period:       string;
}

interface UpcomingBill {
  id: string;
  name: string;
  mask: string | null;
  dueDate: Date;
  minimumPayment: number | null;
  balance: number | null;
  daysUntilDue: number;
}

// ── Section error fallback so one query failure doesn't kill the page ──
function SectionError({ label }: { label: string }) {
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="py-6 text-center text-sm text-muted-foreground">
        <AlertTriangle className="h-5 w-5 mx-auto mb-2 text-destructive/70" />
        Could not load {label}. Try refreshing the page.
      </CardContent>
    </Card>
  );
}

// ── Main page ────────────────────────────────────────────────────────────
export default function UserDashboard() {
  const { user, profile }     = useAuth();
  const { plan, isPro }       = useSubscription();
  const { cards, cardCount, isLoading: cardsLoading }  = useCreditCards();

  const isRestricted = profile?.status === "pending_verification";

  // Calendar-month window for "this month" stats
  const now    = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  // ── Monthly totals (Total Expenses + Receipt count) ───────────────────
  const monthStats = useQuery({
    queryKey: ["dashboard-month-stats", user?.id],
    enabled:  !!user,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("amount, receipt_url")
        .eq("user_id", user!.id)
        .gte("timestamp", monthStart)
        .lte("timestamp", monthEnd);

      if (error) throw error;
      const total       = (data ?? []).reduce((s, t) => s + Number(t.amount), 0);
      const txCount     = data?.length ?? 0;
      const receiptCount = (data ?? []).filter((t) => !!t.receipt_url).length;
      return { total, txCount, receiptCount };
    },
  });

  // ── Recent activity (last 5) ──────────────────────────────────────────
  const recent = useQuery({
    queryKey: ["dashboard-recent-tx", user?.id],
    enabled:  !!user,
    staleTime: 1000 * 30,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, amount, category, description, timestamp")
        .eq("user_id", user!.id)
        .order("timestamp", { ascending: false })
        .limit(5);

      if (error) throw error;
      return (data ?? []) as TxRow[];
    },
  });

  // ── Active budgets with this-month spend per category ─────────────────
  const budgets = useQuery({
    queryKey: ["dashboard-budgets", user?.id],
    enabled:  !!user,
    staleTime: 1000 * 60 * 2,
    queryFn: async () => {
      const { data: rows, error: budErr } = await supabase
        .from("budgets")
        .select("id, category, limit_amount, period")
        .eq("user_id", user!.id)
        .eq("active", true)
        .limit(50);

      if (budErr) throw budErr;
      const budgetRows = (rows ?? []) as BudgetRow[];
      if (!budgetRows.length) return [];

      // Aggregate this-month spend per category in a single round-trip
      const { data: spend } = await supabase
        .from("transactions")
        .select("category, amount")
        .eq("user_id", user!.id)
        .in("category", budgetRows.map((b) => b.category))
        .gte("timestamp", monthStart)
        .lte("timestamp", monthEnd);

      const spendMap = (spend ?? []).reduce<Record<string, number>>((acc, r) => {
        acc[r.category] = (acc[r.category] ?? 0) + Number(r.amount);
        return acc;
      }, {});

      return budgetRows.map((b) => ({
        ...b,
        spent:    spendMap[b.category] ?? 0,
        percent:  b.limit_amount > 0 ? Math.min(100, (spendMap[b.category] ?? 0) / b.limit_amount * 100) : 0,
        overBudget: (spendMap[b.category] ?? 0) > b.limit_amount,
      }));
    },
  });

  // ── AI nudge: ask the agent for one concise monthly action ─────────────
  const aiNudge = useQuery({
    queryKey: ["spending-analysis", "month", user?.id],
    enabled:  !!user,
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("ai-agent", {
        body: { intent: "analyze_spending", payload: { period: "month" } },
      });
      if (error) throw error;
      return data as { response?: string };
    },
  });

  const nudgeText = aiNudge.data?.response
    ?.split("\n")
    .map((line) => line.replace(/^[-*#\s]+/, "").trim())
    .find(Boolean)
    ?.slice(0, 220) ?? null;

  // Derived
  const activeBudgetCount = budgets.data?.length ?? null;
  const atRiskCount       = budgets.data?.filter((b) => b.percent >= 80).length ?? 0;

  const primaryAction = useMemo(() => {
    if (isRestricted) {
      return {
        eyebrow: "Account setup",
        title: "Verify your email to unlock your workspace",
        description: "Protected finance features stay paused until your account is verified.",
        to: "/settings",
        cta: "Open settings",
        icon: <CheckCircle2 className="h-5 w-5" />,
      };
    }

    if (!cardsLoading && cardCount === 0) {
      return {
        eyebrow: "Start here",
        title: "Connect your first card",
        description: "TrueSpend needs at least one card before it can compare rewards or suggest the best card to use.",
        to: "/credit-cards",
        cta: "Add card",
        icon: <CreditCard className="h-5 w-5" />,
      };
    }

    if (!monthStats.isLoading && (monthStats.data?.txCount ?? 0) === 0) {
      return {
        eyebrow: "Build your baseline",
        title: "Add or sync your first transaction",
        description: "A few transactions give the AI agent enough context to find missed rewards and spending patterns.",
        to: "/transactions",
        cta: "Add transaction",
        icon: <Receipt className="h-5 w-5" />,
      };
    }

    if (activeBudgetCount === 0) {
      return {
        eyebrow: "Add guardrails",
        title: "Create one budget for your highest-spend category",
        description: "Start with one category. You can expand after the dashboard proves useful.",
        to: "/budgets",
        cta: "Create budget",
        icon: <TrendingUp className="h-5 w-5" />,
      };
    }

    return {
      eyebrow: "Next best action",
      title: "Review your AI recommendations",
      description: "See where a different card, category rule, or spending habit could improve rewards.",
      to: "/recommendations",
      cta: "View recommendations",
      icon: <Bot className="h-5 w-5" />,
    };
  }, [activeBudgetCount, cardCount, cardsLoading, isRestricted, monthStats.data?.txCount, monthStats.isLoading]);

  const upcomingBills = useMemo<UpcomingBill[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const windowEnd = new Date(today);
    windowEnd.setDate(windowEnd.getDate() + 30);

    return cards
      .map((card) => {
        if (!card.due_date) return null;
        const dueDate = new Date(card.due_date);
        if (Number.isNaN(dueDate.getTime())) return null;
        dueDate.setHours(0, 0, 0, 0);
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / 86_400_000);
        if (dueDate < today || dueDate > windowEnd) return null;
        return {
          id: card.id,
          name: card.account_name || "Credit card",
          mask: card.account_mask,
          dueDate,
          minimumPayment: card.minimum_payment,
          balance: card.current_balance,
          daysUntilDue,
        };
      })
      .filter((bill): bill is UpcomingBill => bill !== null)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
      .slice(0, 5);
  }, [cards]);

  const greeting =
    now.getHours() < 12 ? "Good morning" :
    now.getHours() < 18 ? "Good afternoon" :
                          "Good evening";

  const firstName = profile?.first_name?.trim() || (profile?.email?.split("@")[0] ?? "");

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-7xl">
        <UnverifiedBanner />

        {/* ── Hero / greeting ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1 tracking-tight">
              {greeting}{firstName ? `, ${firstName}` : ""}
            </h1>
            <p className="text-muted-foreground text-sm">
              Here's a quick look at your finances{plan !== "free" && (
                <Badge variant="secondary" className="ml-2 capitalize">{plan}</Badge>
              )}
            </p>
          </div>

          <div className="flex gap-2">
            <Button asChild variant="outline" className="gap-2">
              <Link to="/credit-cards">
                <CreditCard className="h-4 w-4" />
                Manage cards
              </Link>
            </Button>
            <Button asChild className="gap-2 bg-gradient-to-r from-brand-blue to-brand-purple hover:opacity-90 text-white">
              <Link to="/transactions">
                <Plus className="h-4 w-4" />
                Add transaction
              </Link>
            </Button>
          </div>
        </div>

        <Card className="mb-6 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  {primaryAction.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">
                    {primaryAction.eyebrow}
                  </p>
                  <h2 className="text-base sm:text-lg font-semibold tracking-tight">
                    {primaryAction.title}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                    {primaryAction.description}
                  </p>
                </div>
              </div>
              <Button asChild className="gap-2 shrink-0 self-start sm:self-center">
                <Link to={primaryAction.to}>
                  {primaryAction.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── AI nudge banner ──────────────────────────────────────────── */}
        {nudgeText && (
          <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/10">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Lightbulb className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-0.5">AI insight</p>
              <p className="text-sm leading-relaxed">{nudgeText}</p>
            </div>
            <Link to="/insights" className="shrink-0">
              <Button variant="ghost" size="sm" className="gap-1 text-primary text-xs">
                See all <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        )}

        {/* ── Metric tiles ─────────────────────────────────────────────── */}
        <ErrorBoundary fallback={<SectionError label="monthly stats" />}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
            <MetricTile
              label="Total Expenses"
              icon={<Wallet className="h-4 w-4" />}
              accent="from-primary/10 to-primary/5"
              iconBg="bg-primary/10 text-primary"
              loading={monthStats.isLoading}
              value={monthStats.data ? `$${monthStats.data.total.toFixed(2)}` : null}
              caption={monthStats.data?.total === 0 ? "No spending yet" : "This month"}
            />
            <MetricTile
              label="Transactions"
              icon={<BarChart3 className="h-4 w-4" />}
              accent="from-accent/10 to-accent/5"
              iconBg="bg-accent/10 text-accent"
              loading={monthStats.isLoading}
              value={monthStats.data?.txCount ?? null}
              caption={monthStats.data?.txCount === 0 ? "Add your first one" : "This month"}
            />
            <MetricTile
              label="Receipts"
              icon={<Receipt className="h-4 w-4" />}
              accent="from-brand-teal/10 to-brand-teal/5"
              iconBg="bg-brand-teal/10 text-brand-teal"
              loading={monthStats.isLoading}
              value={monthStats.data?.receiptCount ?? null}
              caption={monthStats.data?.receiptCount === 0 ? "Scan or upload" : "Captured this month"}
            />
            <MetricTile
              label="Active Budgets"
              icon={<TrendingUp className="h-4 w-4" />}
              accent="from-amber-500/10 to-amber-500/5"
              iconBg="bg-amber-500/10 text-amber-600 dark:text-amber-400"
              loading={budgets.isLoading}
              value={activeBudgetCount ?? null}
              caption={
                activeBudgetCount === 0   ? "Set your first budget" :
                atRiskCount > 0           ? `${atRiskCount} approaching limit` :
                                            "All on track"
              }
              captionTone={atRiskCount > 0 ? "warning" : "default"}
            />
          </div>
        </ErrorBoundary>

        {/* ── Two-column: Recent activity + Budgets at a glance ──────── */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* ── Recent activity ─────────────────────────────────────── */}
          <ErrorBoundary fallback={<SectionError label="recent activity" />}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div>
                  <CardTitle className="text-base">Recent activity</CardTitle>
                  <CardDescription>Your latest transactions</CardDescription>
                </div>
                <Button asChild variant="ghost" size="sm" className="gap-1">
                  <Link to="/transactions">
                    View all <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {recent.isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className="h-3 w-2/3" />
                          <Skeleton className="h-2.5 w-1/3" />
                        </div>
                        <Skeleton className="h-3 w-16" />
                      </div>
                    ))}
                  </div>
                ) : recent.data?.length === 0 ? (
                  <EmptyState
                    icon={<Receipt className="h-8 w-8 text-muted-foreground/50" />}
                    title="No transactions yet"
                    description="Add a transaction or connect a card to get started."
                    cta={
                      <Button asChild size="sm" className="gap-1">
                        <Link to="/transactions">
                          <Plus className="h-3.5 w-3.5" /> Add transaction
                        </Link>
                      </Button>
                    }
                  />
                ) : (
                  <ul className="divide-y -mx-2">
                    {recent.data?.map((tx) => (
                      <li key={tx.id}>
                        <Link
                          to="/transactions"
                          className="flex items-center gap-3 px-2 py-2.5 hover:bg-muted/50 rounded-md transition-colors"
                        >
                          <div className="h-9 w-9 rounded-full bg-muted/70 flex items-center justify-center text-xs font-semibold uppercase shrink-0">
                            {(tx.category || "??").slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {tx.description || tx.category || "Transaction"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(tx.timestamp).toLocaleDateString("en-US", {
                                month: "short", day: "numeric",
                              })}
                              {tx.category && ` • ${tx.category}`}
                            </p>
                          </div>
                          <span className="text-sm font-semibold tabular-nums">
                            ${Math.abs(Number(tx.amount)).toFixed(2)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </ErrorBoundary>

          {/* ── Budgets at a glance ─────────────────────────────────── */}
          <ErrorBoundary fallback={<SectionError label="budgets" />}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div>
                  <CardTitle className="text-base">Budgets at a glance</CardTitle>
                  <CardDescription>This month's progress</CardDescription>
                </div>
                <Button asChild variant="ghost" size="sm" className="gap-1">
                  <Link to="/budgets">
                    Manage <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {budgets.isLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="space-y-1.5">
                        <div className="flex justify-between">
                          <Skeleton className="h-3 w-20" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                        <Skeleton className="h-2 w-full" />
                      </div>
                    ))}
                  </div>
                ) : budgets.data?.length === 0 ? (
                  <EmptyState
                    icon={<TrendingUp className="h-8 w-8 text-muted-foreground/50" />}
                    title="No budgets yet"
                    description="Set spending limits per category to keep your finances on track."
                    cta={
                      <Button asChild size="sm" className="gap-1">
                        <Link to="/budgets">
                          <Plus className="h-3.5 w-3.5" /> Create budget
                        </Link>
                      </Button>
                    }
                  />
                ) : (
                  <ul className="space-y-3">
                    {budgets.data?.slice(0, 4).map((b) => (
                      <li key={b.id}>
                        <div className="flex items-center justify-between text-sm mb-1.5">
                          <span className="font-medium truncate">{b.category}</span>
                          <span
                            className={cn(
                              "text-xs tabular-nums",
                              b.overBudget ? "text-destructive font-semibold" : "text-muted-foreground"
                            )}
                          >
                            ${b.spent.toFixed(0)} / ${b.limit_amount.toFixed(0)}
                          </span>
                        </div>
                        <Progress
                          value={b.percent}
                          className={cn(
                            "h-1.5",
                            b.overBudget && "[&>div]:bg-destructive",
                            !b.overBudget && b.percent >= 80 && "[&>div]:bg-amber-500"
                          )}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </ErrorBoundary>
        </div>

        {/* ── Connected cards strip ───────────────────────────────────── */}
        <ErrorBoundary fallback={<SectionError label="credit cards" />}>
          <Card className="mb-8">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Connected cards
                </CardTitle>
                <CardDescription>
                  {cardCount === 0
                    ? "Connect a card to auto-sync transactions"
                    : `${cardCount} card${cardCount === 1 ? "" : "s"} connected`}
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="gap-1">
                <Link to="/credit-cards">
                  Manage <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {cardCount === 0 ? (
                <EmptyState
                  icon={<CreditCard className="h-8 w-8 text-muted-foreground/50" />}
                  title="No cards connected"
                  description="Securely link your credit cards via Plaid to track balances and import transactions automatically."
                  cta={
                    <Button asChild className="gap-1">
                      <Link to="/credit-cards">
                        <Plus className="h-4 w-4" /> Add your first card
                      </Link>
                    </Button>
                  }
                />
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                  {cards.slice(0, 6).map((c) => (
                    <Link
                      key={c.id}
                      to="/credit-cards"
                      className="shrink-0 w-44 rounded-lg border bg-card p-3 hover:border-primary/50 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <CreditCard className="h-5 w-5 text-muted-foreground" />
                        {c.is_primary && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Primary</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {c.account_name || "Card"}
                      </p>
                      <p className="text-xs text-muted-foreground mb-2">
                        •••• {c.account_mask || "••••"}
                      </p>
                      <p className="text-sm font-semibold tabular-nums">
                        ${Math.abs(c.current_balance || 0).toFixed(2)}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </ErrorBoundary>

        {/* ── Upcoming bills ─────────────────────────────────────────── */}
        <ErrorBoundary fallback={<SectionError label="upcoming bills" />}>
          <Card className="mb-8">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Upcoming bills
                </CardTitle>
                <CardDescription>Minimum payments due in the next 30 days</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="gap-1">
                <Link to="/credit-cards">
                  Manage <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {cardsLoading ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-lg" />
                  ))}
                </div>
              ) : upcomingBills.length === 0 ? (
                <EmptyState
                  icon={<Calendar className="h-8 w-8 text-muted-foreground/50" />}
                  title="No bills due soon"
                  description={
                    cardCount === 0
                      ? "Connect a credit card to track due dates and minimum payments."
                      : "No connected cards have payments due in the next 30 days."
                  }
                  cta={
                    <Button asChild size="sm" variant="outline" className="gap-1">
                      <Link to="/credit-cards">
                        <CreditCard className="h-3.5 w-3.5" /> Manage cards
                      </Link>
                    </Button>
                  }
                />
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {upcomingBills.map((bill) => (
                    <Link
                      key={bill.id}
                      to="/credit-cards"
                      className={cn(
                        "rounded-lg border p-3 transition-all hover:border-primary/50 hover:shadow-sm",
                        bill.daysUntilDue <= 3 && "border-amber-500/40 bg-amber-500/5"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{bill.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {bill.mask ? `•••• ${bill.mask}` : "Card"}
                          </p>
                        </div>
                        <Badge variant={bill.daysUntilDue <= 3 ? "secondary" : "outline"}>
                          {bill.daysUntilDue === 0 ? "Today" : `${bill.daysUntilDue}d`}
                        </Badge>
                      </div>
                      <div className="mt-3 flex items-end justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Minimum due</p>
                          <p className="text-lg font-semibold tabular-nums">
                            ${(bill.minimumPayment ?? 0).toFixed(2)}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {bill.dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </ErrorBoundary>

        {/* ── Feature navigation grid ─────────────────────────────────── */}
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Explore
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FeatureCard
            to="/transactions"
            icon={<Receipt className="h-5 w-5" />}
            color="text-primary bg-primary/10"
            title="Transactions"
            description="Browse, filter, and add expenses"
            disabled={isRestricted}
            disabledHint="Verify your email to access"
          />
          <FeatureCard
            to="/budgets"
            icon={<TrendingUp className="h-5 w-5" />}
            color="text-accent bg-accent/10"
            title="Budgets"
            description="Set spending limits per category"
            disabled={isRestricted}
            disabledHint="Verify your email to access"
          />
          <FeatureCard
            to="/credit-cards"
            icon={<CreditCard className="h-5 w-5" />}
            color="text-blue-600 bg-blue-500/10"
            title="Credit Cards"
            description="Connect and manage cards"
            disabled={isRestricted}
            disabledHint="Verify your email to access"
          />
          <FeatureCard
            to="/insights"
            icon={<Sparkles className="h-5 w-5" />}
            color="text-purple-600 bg-purple-500/10"
            title="Insights"
            description="AI-powered spending analysis"
            disabled={isRestricted}
            disabledHint="Verify your email to access"
            badge={!isPro ? <Badge variant="outline" className="text-[10px]">Pro</Badge> : undefined}
          />
          <FeatureCard
            to="/recommendations"
            icon={<Bot className="h-5 w-5" />}
            color="text-emerald-600 bg-emerald-500/10"
            title="AI Assistant"
            description="Ask Claude about your money"
            disabled={isRestricted}
            disabledHint="Verify your email to access"
          />
          <FeatureCard
            to="/location-history"
            icon={<MapPin className="h-5 w-5" />}
            color="text-brand-teal bg-brand-teal/10"
            title="Location History"
            description="Where you spend, mapped"
            disabled={isRestricted}
            disabledHint="Verify your email to access"
          />
          <FeatureCard
            to="/settings"
            icon={<SettingsIcon className="h-5 w-5" />}
            color="text-muted-foreground bg-muted"
            title="Settings"
            description="Profile, security, billing"
          />
        </div>

        {/* ── Upgrade banner for free users ──────────────────────────── */}
        {!isPro && !isRestricted && (
          <Card className="mt-8 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardContent className="py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Unlock AI insights, unlimited cards &amp; bank sync</p>
                  <p className="text-sm text-muted-foreground">14-day free trial — no card required</p>
                </div>
              </div>
              <Button asChild className="gap-2">
                <Link to="/settings/billing">
                  Start free trial <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── Reusable building blocks ─────────────────────────────────────────────

interface MetricTileProps {
  label:      string;
  icon:       React.ReactNode;
  accent:     string;       // gradient classes for card bg
  iconBg:     string;       // bg classes for icon container
  loading:    boolean;
  value:      string | number | null;
  caption:    string;
  captionTone?: "default" | "warning";
}

function MetricTile({ label, icon, accent, iconBg, loading, value, caption, captionTone = "default" }: MetricTileProps) {
  return (
    <Card className={cn("border-0 shadow-sm bg-gradient-to-br", accent)}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground">{label}</p>
          <div className={cn("h-7 w-7 sm:h-8 sm:w-8 rounded-md flex items-center justify-center", iconBg)}>
            {icon}
          </div>
        </div>
        {loading || value === null ? (
          <Skeleton className="h-7 w-20 mt-1" />
        ) : (
          <p className="text-xl sm:text-2xl font-bold tabular-nums leading-tight">
            {value}
          </p>
        )}
        <p
          className={cn(
            "text-[11px] sm:text-xs mt-1",
            captionTone === "warning" ? "text-amber-600 dark:text-amber-400 font-medium" : "text-muted-foreground"
          )}
        >
          {caption}
        </p>
      </CardContent>
    </Card>
  );
}

interface FeatureCardProps {
  to:           string;
  icon:         React.ReactNode;
  color:        string;
  title:        string;
  description:  string;
  badge?:       React.ReactNode;
  disabled?:    boolean;
  disabledHint?: string;
}

function FeatureCard({ to, icon, color, title, description, badge, disabled, disabledHint }: FeatureCardProps) {
  const content = (
    <Card
      className={cn(
        "h-full transition-all border",
        disabled
          ? "opacity-60 cursor-not-allowed"
          : "hover:border-primary/50 hover:shadow-md cursor-pointer group"
      )}
      aria-disabled={disabled}
    >
      <CardContent className="p-5 flex items-start gap-3">
        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", color)}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold truncate">{title}</h3>
            {badge}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
            {disabled && disabledHint ? disabledHint : description}
          </p>
        </div>
        {!disabled && (
          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
        )}
      </CardContent>
    </Card>
  );

  if (disabled) return <div>{content}</div>;
  return <Link to={to} className="block">{content}</Link>;
}

interface EmptyStateProps {
  icon:        React.ReactNode;
  title:       string;
  description: string;
  cta:         React.ReactNode;
}

function EmptyState({ icon, title, description, cta }: EmptyStateProps) {
  return (
    <div className="py-8 text-center space-y-3">
      <div className="mx-auto">{icon}</div>
      <div className="space-y-1">
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto">{description}</p>
      </div>
      <div className="pt-1">{cta}</div>
    </div>
  );
}
