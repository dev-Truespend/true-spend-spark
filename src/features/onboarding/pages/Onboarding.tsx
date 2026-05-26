import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCompleteOnboarding } from "@/shared/hooks/useOnboarding";
import { useCreditCards } from "@/features/credit-cards/hooks/useCreditCards";
import { usePlaidLinkFlow } from "@/features/credit-cards/hooks/usePlaid";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles, CreditCard, Target, Bell, ChevronRight, ChevronLeft,
  CheckCircle2, Loader2, Lock, Shield, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Wizard steps ─────────────────────────────────────────────────────
type Step = "welcome" | "card" | "budget" | "notifications" | "done";

const STEPS: Step[] = ["welcome", "card", "budget", "notifications", "done"];
const STEP_TITLES: Record<Step, string> = {
  welcome:       "Welcome to TrueSpend",
  card:          "Connect a credit card",
  budget:        "Set your first budget",
  notifications: "Stay in the loop",
  done:          "You're all set",
};

const BUDGET_CATEGORIES = [
  "Dining", "Groceries", "Transportation", "Shopping",
  "Entertainment", "Health", "Utilities", "Travel", "Other",
];

// ── Main page ────────────────────────────────────────────────────────
export default function Onboarding() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const completeOnboarding = useCompleteOnboarding();
  const [step, setStep] = useState<Step>("welcome");
  const [confirmSkip, setConfirmSkip] = useState(false);

  // ── Guards ──────────────────────────────────────────────────────────
  // If user is already onboarded, send them to the dashboard. We allow
  // them to *visit* /onboarding manually (e.g. via a help link) but
  // skip the wizard if they finished it.
  if (!loading && profile?.onboarding_completed_at) {
    return <Navigate to="/dashboard" replace />;
  }

  const stepIndex = STEPS.indexOf(step);
  const progress  = ((stepIndex + 1) / STEPS.length) * 100;

  const goNext = () => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  };
  const goPrev = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  const finish = () => {
    completeOnboarding.mutate(undefined, {
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "Couldn't complete onboarding");
      },
    });
  };

  const handleSkipAll = () => setConfirmSkip(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* ── Progress bar / step indicator ──────────────────────────── */}
        <div className="mb-6 flex items-center gap-3">
          <Progress value={progress} className="h-1.5 flex-1" />
          <span className="text-xs text-muted-foreground tabular-nums">
            {stepIndex + 1} of {STEPS.length}
          </span>
        </div>

        {/* ── Card ───────────────────────────────────────────────────── */}
        <Card className="border-0 shadow-xl">
          <CardContent className="p-6 sm:p-10">
            {step === "welcome"       && <WelcomeStep user={user} profile={profile} onNext={goNext} />}
            {step === "card"          && <CardStep onNext={goNext} />}
            {step === "budget"        && <BudgetStep onNext={goNext} />}
            {step === "notifications" && <NotificationsStep onNext={goNext} />}
            {step === "done"          && <DoneStep onFinish={finish} loading={completeOnboarding.isPending} />}
          </CardContent>
        </Card>

        {/* ── Footer nav ─────────────────────────────────────────────── */}
        <div className="mt-4 flex items-center justify-between">
          {step !== "welcome" && step !== "done" ? (
            <Button variant="ghost" size="sm" onClick={goPrev} className="gap-1 text-muted-foreground">
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
          ) : (
            <div />
          )}

          {step !== "done" && (
            confirmSkip ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Skip setup?</span>
                <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => setConfirmSkip(false)}>
                  No, continue
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-7 px-2 text-muted-foreground" onClick={finish}>
                  Yes, skip
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkipAll}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                Skip setup
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ── Step 1: Welcome ──────────────────────────────────────────────────
function WelcomeStep({ user, profile, onNext }: { user: { email?: string } | null; profile: { first_name?: string | null } | null; onNext: () => void }) {
  const name = profile?.first_name || user?.email?.split("@")[0] || "there";
  return (
    <div className="text-center space-y-6">
      <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-brand-blue via-brand-purple to-brand-teal flex items-center justify-center shadow-lg">
        <Sparkles className="h-8 w-8 text-white" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Welcome to TrueSpend, {name}!
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Let's get you set up in under 2 minutes. You'll connect a card,
          set a budget, and turn on alerts — then you're ready to track.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        <FeaturePill icon={<CreditCard className="h-4 w-4 text-primary" />} label="Auto-sync transactions" />
        <FeaturePill icon={<Target     className="h-4 w-4 text-accent"  />} label="Smart budget alerts" />
        <FeaturePill icon={<Sparkles   className="h-4 w-4 text-brand-teal" />} label="AI-powered insights" />
      </div>

      <Button onClick={onNext} size="lg" className="w-full sm:w-auto gap-2">
        Let's get started <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function FeaturePill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-lg border bg-card p-3 text-sm">
      {icon}
      <span className="truncate">{label}</span>
    </div>
  );
}

// ── Step 2: Connect card ─────────────────────────────────────────────
function CardStep({ onNext }: { onNext: () => void }) {
  const { cardCount } = useCreditCards();
  const initialCount = useRefSnapshot(cardCount);
  const { initializeLinkToken, openPlaidLink, isLoading, ready } = usePlaidLinkFlow({
    onComplete: () => { /* PlaidLink closed; useCreditCards will refresh */ },
  });

  // Auto-advance once they've connected a card
  useEffect(() => {
    if (cardCount > initialCount) {
      toast.success("Card connected!");
      setTimeout(onNext, 600);
    }
  }, [cardCount, initialCount, onNext]);

  useEffect(() => { initializeLinkToken(); }, [initializeLinkToken]);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <CreditCard className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Connect a credit card</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          We use <strong>Plaid</strong> to securely link your card so transactions
          import automatically. You can always add cards later.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-2 text-xs text-center">
        <div className="rounded-lg border p-3 space-y-1">
          <Lock className="h-4 w-4 mx-auto text-primary" />
          <p className="font-medium">256-bit encryption</p>
        </div>
        <div className="rounded-lg border p-3 space-y-1">
          <Shield className="h-4 w-4 mx-auto text-accent" />
          <p className="font-medium">Read-only access</p>
        </div>
        <div className="rounded-lg border p-3 space-y-1">
          <Clock className="h-4 w-4 mx-auto text-brand-teal" />
          <p className="font-medium">Syncs daily</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          onClick={() => openPlaidLink()}
          disabled={isLoading || !ready}
          className="flex-1 gap-2"
          size="lg"
        >
          {isLoading || !ready ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
          {isLoading ? "Connecting…" : ready ? "Connect with Plaid" : "Preparing…"}
        </Button>
        <Button variant="outline" onClick={onNext} className="sm:w-32">
          Skip for now
        </Button>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        First 3 cards are free. Additional cards $1.50/mo each.
      </p>
    </div>
  );
}

// Hook to snapshot a value once on mount (so we can detect changes from it)
function useRefSnapshot<T>(value: T): T {
  const [snap] = useState(value);
  return snap;
}

// ── Step 3: First budget ─────────────────────────────────────────────
function BudgetStep({ onNext }: { onNext: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [category, setCategory] = useState("Dining");
  const [amount,   setAmount]   = useState<number>(300);

  const createBudget = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      if (amount <= 0) throw new Error("Enter a valid amount");

      const start = new Date();
      const end   = new Date(start.getFullYear(), start.getMonth() + 1, start.getDate());

      const { error } = await supabase.from("budgets").insert({
        user_id:         user.id,
        category,
        limit_amount:    amount,
        period:          "monthly",
        start_date:      start.toISOString(),
        end_date:        end.toISOString(),
        alert_threshold: 0.8,
        active:          true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${category} budget created`);
      qc.invalidateQueries({ queryKey: ["budgets-with-spending"] });
      qc.invalidateQueries({ queryKey: ["dashboard-budgets"] });
      onNext();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Couldn't create budget");
    },
  });

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center">
          <Target className="h-7 w-7 text-accent" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Set your first budget</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Pick a category you'd like to track. We'll alert you at 80% spent
          and again when you hit your limit.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 max-w-md mx-auto w-full">
        <div className="space-y-1.5">
          <Label htmlFor="ob-category" className="text-xs">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="ob-category"><SelectValue /></SelectTrigger>
            <SelectContent>
              {BUDGET_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ob-amount" className="text-xs">Monthly limit ($)</Label>
          <Input
            id="ob-amount"
            type="number"
            step="10"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          onClick={() => createBudget.mutate()}
          disabled={createBudget.isPending || amount <= 0}
          className="flex-1 gap-2"
          size="lg"
        >
          {createBudget.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Create {category} budget
        </Button>
        <Button variant="outline" onClick={onNext} className="sm:w-32">
          Skip for now
        </Button>
      </div>
    </div>
  );
}

// ── Step 4: Notifications ────────────────────────────────────────────
function NotificationsStep({ onNext }: { onNext: () => void }) {
  const [enabled, setEnabled] = useState<"pending" | "yes" | "no">("pending");
  const [busy, setBusy]       = useState(false);

  const handleEnable = async () => {
    setBusy(true);
    try {
      if (!("Notification" in window)) {
        toast.info("This browser doesn't support notifications.");
        setEnabled("no");
        return;
      }
      const result = await Notification.requestPermission();
      if (result === "granted") {
        toast.success("Notifications enabled");
        setEnabled("yes");
      } else {
        toast.info("Notifications dismissed. You can enable them later in Settings.");
        setEnabled("no");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-brand-teal/10 flex items-center justify-center">
          <Bell className="h-7 w-7 text-brand-teal" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Stay in the loop</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Get a notification when you're nearing a budget limit, when a large
          unusual transaction shows up, or when a bill is due soon.
        </p>
      </div>

      <div className="space-y-2 max-w-md mx-auto">
        {[
          "Budget alerts at 80% and 100% spent",
          "Unusual transaction detection",
          "Bill due-date reminders",
        ].map((line) => (
          <div key={line} className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
            <span>{line}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        {enabled === "yes" ? (
          <Button onClick={onNext} className="flex-1 gap-2" size="lg">
            <CheckCircle2 className="h-4 w-4" /> Continue
          </Button>
        ) : (
          <>
            <Button
              onClick={handleEnable}
              disabled={busy}
              className="flex-1 gap-2"
              size="lg"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              <Bell className="h-4 w-4" />
              Enable notifications
            </Button>
            <Button variant="outline" onClick={onNext} className="sm:w-32">
              Skip
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Step 5: Done ─────────────────────────────────────────────────────
function DoneStep({ onFinish, loading }: { onFinish: () => void; loading: boolean }) {
  return (
    <div className="text-center space-y-6">
      <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg">
        <CheckCircle2 className="h-8 w-8 text-white" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">You're all set!</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Your dashboard is ready. As transactions come in, you'll start seeing
          insights, trends, and budget progress in real time.
        </p>
      </div>

      <Badge variant="outline" className="gap-1.5">
        <Sparkles className="h-3 w-3" />
        Pro tip: install the Chrome extension to track online purchases
      </Badge>

      <Button onClick={onFinish} disabled={loading} size="lg" className="w-full sm:w-auto gap-2">
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Go to my dashboard <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
