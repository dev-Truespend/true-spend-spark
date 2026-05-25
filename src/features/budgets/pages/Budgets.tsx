import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Loader2, Plus, AlertTriangle, MapPin, MoreVertical, Pencil, Trash2,
  PauseCircle, PlayCircle, Target, TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "Dining", "Groceries", "Transportation", "Shopping",
  "Entertainment", "Health", "Utilities", "Travel", "Other",
];

const PERIODS = ["monthly", "weekly", "quarterly"] as const;
type Period = typeof PERIODS[number];

// ── Types ─────────────────────────────────────────────────────────────
interface GeofenceRow { id: string; name: string }

interface BudgetRow {
  id:               string;
  user_id:          string;
  category:         string;
  limit_amount:     number;
  period:           string;
  start_date:       string;
  end_date:         string | null;
  alert_threshold:  number;
  geofence_id:      string | null;
  active:           boolean;
  created_at:       string;
}

interface BudgetWithSpending extends BudgetRow {
  spent:       number;
  remaining:   number;
  utilization: number;        // capped [0,100] for the bar
  rawUtilization: number;     // actual ratio for badges
  geofence:    { name: string } | null;
  daysLeft:    number | null;
  dailyBurn:   number | null; // avg spend per day so far
}

interface BudgetAlertRow {
  id:                   string;
  acknowledged_at:      string | null;
  triggered_at:         string;
  threshold_percentage: number;
  current_spent:        number | string;
  budget_limit:         number | string;
  budget:               { category: string };
}

interface GeofenceSpending {
  geofence_id: string;
  name:        string;
  total:       number;
  count:       number;
}

// ── Default budget form state ─────────────────────────────────────────
function emptyForm() {
  return {
    category:        "Other",
    limit_amount:    0,
    period:          "monthly" as Period,
    alert_threshold: 0.8,
    geofence_id:     null as string | null,
  };
}

// ── Page ──────────────────────────────────────────────────────────────
export default function Budgets() {
  const qc       = useQueryClient();
  const { user } = useAuth();

  const [isAddOpen, setIsAddOpen]           = useState(false);
  const [editingBudget, setEditingBudget]   = useState<BudgetWithSpending | null>(null);
  const [pendingDelete, setPendingDelete]   = useState<BudgetWithSpending | null>(null);
  const [form, setForm]                     = useState(emptyForm());

  // ── Geofences (for picker) ──────────────────────────────────────────
  const userGeofences = useQuery<GeofenceRow[]>({
    queryKey: ['user-geofences', user?.id],
    enabled:  !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('geofences').select('id, name')
        .eq('user_id', user!.id).eq('active', true);
      if (error) throw error;
      return (data ?? []) as GeofenceRow[];
    },
  });

  // ── Spending by geofence (last 30 days) ─────────────────────────────
  const geofenceSpending = useQuery<GeofenceSpending[]>({
    queryKey: ['geofence-spending', user?.id],
    enabled:  !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('amount, geofence_id, geofence:geofences(name)')
        .eq('user_id', user!.id)
        .not('geofence_id', 'is', null)
        .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;
      const grouped: Record<string, GeofenceSpending> = {};
      (data ?? []).forEach((tx) => {
        const row = tx as { amount: number | string; geofence_id: string; geofence: { name: string } | null };
        const id = row.geofence_id;
        if (!grouped[id]) {
          grouped[id] = { geofence_id: id, name: row.geofence?.name ?? 'Unknown', total: 0, count: 0 };
        }
        grouped[id].total += Number(row.amount);
        grouped[id].count += 1;
      });
      return Object.values(grouped);
    },
  });

  // ── Budgets with computed spending ──────────────────────────────────
  const budgetsQuery = useQuery<BudgetWithSpending[]>({
    queryKey: ['budgets-with-spending', user?.id],
    enabled:  !!user,
    queryFn: async () => {
      const { data: budgetRows, error: budgetsError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user!.id)
        .order('active', { ascending: false })
        .order('created_at', { ascending: false });

      if (budgetsError) throw budgetsError;
      const rows = (budgetRows ?? []) as BudgetRow[];
      if (!rows.length) return [];

      // Single join-free query for all transactions across all budget categories
      const earliestStart = rows.reduce(
        (e, b) => (b.start_date < e ? b.start_date : e),
        rows[0].start_date
      );

      const { data: allTransactions } = await supabase
        .from('transactions')
        .select('amount, category, geofence_id, timestamp')
        .eq('user_id', user!.id)
        .in('category', rows.map((b) => b.category))
        .gte('timestamp', earliestStart);

      // Resolve geofence names in a single round-trip
      const geofenceIds = [...new Set(rows.map((b) => b.geofence_id).filter(Boolean))] as string[];
      const geofenceMap: Record<string, { name: string }> = {};
      if (geofenceIds.length) {
        const { data: geofences } = await supabase
          .from('geofences').select('id, name').in('id', geofenceIds);
        (geofences ?? []).forEach((g) => {
          const row = g as { id: string; name: string };
          geofenceMap[row.id] = { name: row.name };
        });
      }

      const now = new Date();

      return rows.map<BudgetWithSpending>((budget) => {
        const periodStart = new Date(budget.start_date);
        const periodEnd   = budget.end_date ? new Date(budget.end_date) : null;

        const spent = (allTransactions ?? [])
          .filter((tx) => {
            const t = tx as { category: string; geofence_id: string | null; timestamp: string; amount: number | string };
            if (t.category !== budget.category) return false;
            if (budget.geofence_id && t.geofence_id !== budget.geofence_id) return false;
            const ts = new Date(t.timestamp);
            if (ts < periodStart) return false;
            if (periodEnd && ts > periodEnd) return false;
            return true;
          })
          .reduce((sum, tx) => sum + Number((tx as { amount: number | string }).amount || 0), 0);

        const limit = Number(budget.limit_amount) || 1;
        const rawUtil = (spent / limit) * 100;

        // Days remaining + daily burn rate (only meaningful for periodic budgets)
        let daysLeft: number | null = null;
        let dailyBurn: number | null = null;
        if (periodEnd) {
          daysLeft = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / 86400000));
          const elapsedDays = Math.max(1, Math.floor((now.getTime() - periodStart.getTime()) / 86400000));
          dailyBurn = spent / elapsedDays;
        }

        return {
          ...budget,
          spent,
          remaining:      Number(budget.limit_amount) - spent,
          utilization:    Math.min(100, rawUtil),
          rawUtilization: rawUtil,
          geofence:       budget.geofence_id ? geofenceMap[budget.geofence_id] ?? null : null,
          daysLeft,
          dailyBurn,
        };
      });
    },
  });

  // ── Active alerts ───────────────────────────────────────────────────
  const alertsQuery = useQuery<BudgetAlertRow[]>({
    queryKey: ['budget-alerts', user?.id],
    enabled:  !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_alerts')
        .select('id, acknowledged_at, triggered_at, threshold_percentage, current_spent, budget_limit, budget:budgets(category)')
        .is('acknowledged_at', null)
        .order('triggered_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BudgetAlertRow[];
    },
  });

  // ── Mutations ───────────────────────────────────────────────────────
  function computeEndDate(period: Period, start: Date): Date {
    switch (period) {
      case 'weekly':    return new Date(start.getTime() + 7 * 86400000);
      case 'quarterly': return new Date(start.getFullYear(), start.getMonth() + 3, start.getDate());
      case 'monthly':
      default:          return new Date(start.getFullYear(), start.getMonth() + 1, start.getDate());
    }
  }

  const addOrUpdateMutation = useMutation({
    mutationFn: async (input: ReturnType<typeof emptyForm> & { id?: string }) => {
      if (!user) throw new Error('Not authenticated');

      if (input.id) {
        // UPDATE — keep original start_date / end_date, only change limit/period/etc.
        const { error } = await supabase
          .from('budgets')
          .update({
            category:        input.category,
            limit_amount:    input.limit_amount,
            period:          input.period,
            alert_threshold: input.alert_threshold,
            geofence_id:     input.geofence_id || null,
          })
          .eq('id', input.id);
        if (error) throw error;
      } else {
        // INSERT — compute fresh start/end
        const startDate = new Date();
        const endDate   = computeEndDate(input.period, startDate);
        const { error } = await supabase
          .from('budgets')
          .insert({
            user_id:         user.id,
            category:        input.category,
            limit_amount:    input.limit_amount,
            period:          input.period,
            start_date:      startDate.toISOString(),
            end_date:        endDate.toISOString(),
            alert_threshold: input.alert_threshold,
            geofence_id:     input.geofence_id || null,
            active:          true,
          });
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['budgets-with-spending'] });
      qc.invalidateQueries({ queryKey: ['dashboard-budgets'] });
      toast.success(vars.id ? 'Budget updated' : 'Budget created');
      setIsAddOpen(false);
      setEditingBudget(null);
      setForm(emptyForm());
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to save budget'),
  });

  const togglePauseMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('budgets').update({ active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['budgets-with-spending'] });
      qc.invalidateQueries({ queryKey: ['dashboard-budgets'] });
      toast.success(vars.active ? 'Budget resumed' : 'Budget paused');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to update budget'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('budgets').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets-with-spending'] });
      qc.invalidateQueries({ queryKey: ['dashboard-budgets'] });
      toast.success('Budget deleted');
      setPendingDelete(null);
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to delete'),
  });

  const acknowledgeAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('budget_alerts')
        .update({ acknowledged_at: new Date().toISOString() })
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budget-alerts'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to acknowledge'),
  });

  // ── Form handlers ───────────────────────────────────────────────────
  const openCreate = () => {
    setEditingBudget(null);
    setForm(emptyForm());
    setIsAddOpen(true);
  };

  const openEdit = (b: BudgetWithSpending) => {
    setEditingBudget(b);
    setForm({
      category:        b.category,
      limit_amount:    Number(b.limit_amount),
      period:          (PERIODS.includes(b.period as Period) ? b.period : 'monthly') as Period,
      alert_threshold: Number(b.alert_threshold) || 0.8,
      geofence_id:     b.geofence_id,
    });
    setIsAddOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.limit_amount <= 0) {
      toast.error('Enter a valid budget amount');
      return;
    }
    addOrUpdateMutation.mutate({ ...form, id: editingBudget?.id });
  };

  // ── Derived ─────────────────────────────────────────────────────────
  const budgets       = budgetsQuery.data ?? [];
  const activeBudgets = budgets.filter((b) => b.active);
  const pausedBudgets = budgets.filter((b) => !b.active);
  const alerts        = alertsQuery.data ?? [];
  const spendingByLoc = geofenceSpending.data ?? [];
  const maxLocSpend   = spendingByLoc.length ? Math.max(...spendingByLoc.map((g) => g.total)) : 1;

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-5 max-w-5xl">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Budgets</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor spending limits per category
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 self-start sm:self-auto">
          <Plus className="h-4 w-4" />
          Create budget
        </Button>
      </div>

      {/* ── Alerts ─────────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-950/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
              <AlertTriangle className="h-5 w-5" />
              {alerts.length} active alert{alerts.length === 1 ? "" : "s"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between gap-3 p-3 bg-background rounded-lg">
                <div className="min-w-0">
                  <p className="font-medium truncate">{alert.budget.category}</p>
                  <p className="text-xs text-muted-foreground">
                    {alert.threshold_percentage}% reached · ${Number(alert.current_spent).toFixed(2)} of ${Number(alert.budget_limit).toFixed(2)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => acknowledgeAlertMutation.mutate(alert.id)}
                  disabled={acknowledgeAlertMutation.isPending}
                >
                  Dismiss
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Spending by location (only if data) ──────────────────── */}
      {spendingByLoc.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4 text-primary" />
              Spending by location
            </CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {spendingByLoc.map((gf) => (
              <div key={gf.geofence_id} className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{gf.name}</p>
                    <p className="text-xs text-muted-foreground">{gf.count} transaction{gf.count === 1 ? '' : 's'}</p>
                  </div>
                  <p className="font-semibold tabular-nums">${gf.total.toFixed(2)}</p>
                </div>
                <Progress value={(gf.total / maxLocSpend) * 100} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Budget list ──────────────────────────────────────────── */}
      {budgetsQuery.isError ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-10 text-center space-y-3">
            <AlertTriangle className="h-8 w-8 text-destructive/70 mx-auto" />
            <div>
              <p className="font-medium">Couldn't load budgets</p>
              <p className="text-sm text-muted-foreground mt-1">
                {budgetsQuery.error instanceof Error ? budgetsQuery.error.message : "Please try again."}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => budgetsQuery.refetch()}>Retry</Button>
          </CardContent>
        </Card>
      ) : budgetsQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <BudgetSkeleton key={i} />)}
        </div>
      ) : budgets.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center space-y-4">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
              <Target className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="text-lg font-semibold">No budgets yet</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Set monthly limits per category to keep your spending on track and get alerts when you're approaching them.
              </p>
            </div>
            <Button onClick={openCreate} className="gap-1">
              <Plus className="h-4 w-4" /> Create your first budget
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {activeBudgets.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Active ({activeBudgets.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {activeBudgets.map((b) => (
                  <BudgetCard
                    key={b.id}
                    budget={b}
                    onEdit={openEdit}
                    onPause={(id) => togglePauseMutation.mutate({ id, active: false })}
                    onDelete={setPendingDelete}
                  />
                ))}
              </div>
            </div>
          )}

          {pausedBudgets.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 mt-6">
                Paused ({pausedBudgets.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pausedBudgets.map((b) => (
                  <BudgetCard
                    key={b.id}
                    budget={b}
                    onEdit={openEdit}
                    onResume={(id) => togglePauseMutation.mutate({ id, active: true })}
                    onDelete={setPendingDelete}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Create / edit dialog ─────────────────────────────────── */}
      <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) { setEditingBudget(null); setForm(emptyForm()); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBudget ? 'Edit budget' : 'Create new budget'}</DialogTitle>
            <DialogDescription>
              {editingBudget ? 'Update spending limits or alert threshold.' : 'Set spending limits for a category.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bd-category">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
                <SelectTrigger id="bd-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bd-limit">Budget limit ($)</Label>
              <Input
                id="bd-limit" type="number" step="0.01" placeholder="500.00"
                value={form.limit_amount || ''}
                onChange={(e) => setForm((p) => ({ ...p, limit_amount: parseFloat(e.target.value) || 0 }))}
                required autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bd-period">Period</Label>
              <Select value={form.period} onValueChange={(v) => setForm((p) => ({ ...p, period: v as Period }))}>
                <SelectTrigger id="bd-period"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERIODS.map((p) => (
                    <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bd-threshold">Alert at</Label>
              <Select
                value={String(form.alert_threshold)}
                onValueChange={(v) => setForm((p) => ({ ...p, alert_threshold: parseFloat(v) }))}
              >
                <SelectTrigger id="bd-threshold"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.5">50% spent</SelectItem>
                  <SelectItem value="0.75">75% spent</SelectItem>
                  <SelectItem value="0.8">80% spent (recommended)</SelectItem>
                  <SelectItem value="0.9">90% spent</SelectItem>
                  <SelectItem value="1">100% spent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(userGeofences.data?.length ?? 0) > 0 && (
              <div className="space-y-2">
                <Label htmlFor="bd-geofence">Link to location <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Select
                  value={form.geofence_id || "none"}
                  onValueChange={(v) => setForm((p) => ({ ...p, geofence_id: v === "none" ? null : v }))}
                >
                  <SelectTrigger id="bd-geofence"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No location filter</SelectItem>
                    {userGeofences.data!.map((gf) => (
                      <SelectItem key={gf.id} value={gf.id}>{gf.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Only count spending at this location toward the budget.</p>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={addOrUpdateMutation.isPending}>
                {addOrUpdateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingBudget ? 'Save changes' : 'Create budget'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ───────────────────────────────────── */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this budget?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete && (
                <>
                  The <strong>{pendingDelete.category}</strong> budget (${Number(pendingDelete.limit_amount).toFixed(2)} / {pendingDelete.period}) will be removed.
                  Past alerts and transactions are kept.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Budget card ───────────────────────────────────────────────────────

interface BudgetCardProps {
  budget:   BudgetWithSpending;
  onEdit:   (b: BudgetWithSpending) => void;
  onPause?: (id: string) => void;
  onResume?:(id: string) => void;
  onDelete: (b: BudgetWithSpending) => void;
}

function BudgetCard({ budget, onEdit, onPause, onResume, onDelete }: BudgetCardProps) {
  const over   = budget.rawUtilization > 100;
  const warn   = budget.rawUtilization >= 80 && !over;

  const statusBadge = !budget.active
    ? <Badge variant="outline" className="text-muted-foreground">Paused</Badge>
    : over
      ? <Badge variant="destructive">Over budget</Badge>
      : warn
        ? <Badge className="bg-amber-500 hover:bg-amber-500/90">{Math.round(budget.rawUtilization)}%</Badge>
        : <Badge variant="secondary">On track</Badge>;

  // Projected end-of-period spend (based on current burn rate) — only if
  // we have a period end and the budget is active
  const projection = budget.dailyBurn !== null && budget.daysLeft !== null
    ? budget.spent + budget.dailyBurn * budget.daysLeft
    : null;

  return (
    <Card className={cn(
      "transition-shadow hover:shadow-md",
      !budget.active && "opacity-70",
      over && budget.active && "border-destructive/40"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <CardTitle className="text-base truncate">{budget.category}</CardTitle>
              {statusBadge}
            </div>
            <CardDescription className="text-xs flex items-center gap-2 capitalize">
              {budget.period}
              {budget.geofence && (
                <span className="inline-flex items-center gap-0.5">
                  · <MapPin className="h-3 w-3" /> {budget.geofence.name}
                </span>
              )}
            </CardDescription>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(budget)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              {budget.active && onPause && (
                <DropdownMenuItem onClick={() => onPause(budget.id)}>
                  <PauseCircle className="h-4 w-4 mr-2" />
                  Pause
                </DropdownMenuItem>
              )}
              {!budget.active && onResume && (
                <DropdownMenuItem onClick={() => onResume(budget.id)}>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Resume
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(budget)} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between">
          <span className={cn(
            "text-2xl font-bold tabular-nums",
            over ? "text-destructive" : "text-foreground"
          )}>
            ${budget.spent.toFixed(2)}
          </span>
          <span className="text-sm text-muted-foreground tabular-nums">
            of ${Number(budget.limit_amount).toFixed(0)}
          </span>
        </div>

        <Progress
          value={budget.utilization}
          className={cn(
            "h-2",
            over   && "[&>div]:bg-destructive",
            !over && warn && "[&>div]:bg-amber-500"
          )}
        />

        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
          <div>
            <p className="text-muted-foreground">{over ? "Over by" : "Remaining"}</p>
            <p className={cn(
              "font-semibold tabular-nums",
              over ? "text-destructive" : budget.active ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
            )}>
              ${Math.abs(budget.remaining).toFixed(2)}
            </p>
          </div>
          {budget.daysLeft !== null && budget.active && (
            <div className="text-right">
              <p className="text-muted-foreground">Days left</p>
              <p className="font-semibold tabular-nums">{budget.daysLeft}</p>
            </div>
          )}
        </div>

        {/* Projection: only show if active, has period end, and projection is meaningfully different */}
        {budget.active && projection !== null && Math.abs(projection - budget.spent) > budget.limit_amount * 0.05 && (
          <div className={cn(
            "text-[11px] flex items-center gap-1 rounded-md px-2 py-1.5",
            projection > budget.limit_amount
              ? "bg-destructive/10 text-destructive"
              : "bg-muted text-muted-foreground"
          )}>
            <TrendingUp className="h-3 w-3 shrink-0" />
            <span>
              At this rate: ~${projection.toFixed(0)} by period end
              {projection > budget.limit_amount && ` (over by $${(projection - budget.limit_amount).toFixed(0)})`}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Skeleton card ─────────────────────────────────────────────────────
function BudgetSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-24 mb-1" />
        <Skeleton className="h-3 w-16" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-2 w-full" />
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
