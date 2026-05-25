import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, AlertTriangle, MapPin } from "lucide-react";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";

const CATEGORIES = [
  "Dining", "Groceries", "Transportation", "Shopping",
  "Entertainment", "Health", "Utilities", "Travel", "Other",
];

const PERIODS = ["monthly", "weekly", "quarterly"];

export default function Budgets() {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newBudget, setNewBudget] = useState({
    category: "Other",
    limit_amount: 0,
    period: "monthly",
    alert_threshold: 0.8,
    geofence_id: null as string | null,
  });

  const { data: userGeofences } = useQuery({
    queryKey: ['user-geofences'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];
      const { data, error } = await supabase
        .from('geofences')
        .select('*')
        .eq('user_id', user.user.id)
        .eq('active', true);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: geofenceSpending } = useQuery({
    queryKey: ['geofence-spending'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('amount, geofence_id, geofence:geofences(name)')
        .eq('user_id', user.user.id)
        .not('geofence_id', 'is', null)
        .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      if (error) throw error;
      const grouped = transactions?.reduce((acc: any, tx: any) => {
        const geofenceId = tx.geofence_id;
        if (!acc[geofenceId]) {
          acc[geofenceId] = { geofence_id: geofenceId, name: tx.geofence?.name || 'Unknown', total: 0, count: 0 };
        }
        acc[geofenceId].total += Number(tx.amount);
        acc[geofenceId].count += 1;
        return acc;
      }, {});
      return Object.values(grouped || {});
    },
  });

  const { data: budgets, isLoading } = useQuery<any[]>({
    queryKey: ['budgets-with-spending'],
    queryFn: async () => {
      const { data: budgetRows, error: budgetsError } = await supabase
        .from('budgets')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });
      if (budgetsError) throw budgetsError;
      if (!budgetRows.length) return [];

      // Single query for all transactions across all budget categories (avoids N+1)
      const earliestStart = budgetRows.reduce((earliest, b) =>
        b.start_date < earliest ? b.start_date : earliest, budgetRows[0].start_date);

      const { data: allTransactions } = await supabase
        .from('transactions')
        .select('amount, category, geofence_id')
        .in('category', budgetRows.map(b => b.category))
        .gte('timestamp', earliestStart);

      // Single query for all referenced geofences
      const geofenceIds = [...new Set(budgetRows.map(b => b.geofence_id).filter(Boolean))];
      const geofenceMap: Record<string, { name: string }> = {};
      if (geofenceIds.length) {
        const { data: geofences } = await supabase
          .from('geofences')
          .select('id, name')
          .in('id', geofenceIds);
        geofences?.forEach(g => { geofenceMap[g.id] = { name: g.name }; });
      }

      // Compute spending per budget in JS (no further DB calls)
      return budgetRows.map(budget => {
        const cutoff = budget.end_date || new Date().toISOString();
        const spent = (allTransactions ?? [])
          .filter(tx =>
            tx.category === budget.category &&
            (!budget.geofence_id || tx.geofence_id === budget.geofence_id)
          )
          .reduce((sum, tx) => {
            const amt = Number(tx.amount);
            return sum + (isNaN(amt) ? 0 : amt);
          }, 0);

        const limit = Number(budget.limit_amount) || 1; // guard: never divide by zero
        return {
          ...budget,
          spent,
          remaining: Number(budget.limit_amount) - spent,
          utilization: (spent / limit) * 100,
          geofence: budget.geofence_id ? geofenceMap[budget.geofence_id] ?? null : null,
        };
      });
    },
  });

  const { data: alerts } = useQuery({
    queryKey: ['budget-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_alerts')
        .select('*, budget:budgets(*)')
        .is('acknowledged_at', null)
        .order('triggered_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addBudgetMutation = useMutation({
    mutationFn: async (input: typeof newBudget) => {
      const startDate = new Date();
      let endDate: Date | null = null;
      if (input.period === 'weekly') {
        endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      } else if (input.period === 'monthly') {
        endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, startDate.getDate());
      } else if (input.period === 'quarterly') {
        endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 3, startDate.getDate());
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('budgets')
        .insert({
          user_id: user.id,
          category: input.category,
          limit_amount: input.limit_amount,
          period: input.period,
          start_date: startDate.toISOString(),
          end_date: endDate?.toISOString() || null,
          alert_threshold: input.alert_threshold,
          geofence_id: input.geofence_id || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets-with-spending'] });
      toast.success('Budget created successfully');
      setIsAddOpen(false);
      setNewBudget({ category: "Other", limit_amount: 0, period: "monthly", alert_threshold: 0.8, geofence_id: null });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create budget');
    },
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
      queryClient.invalidateQueries({ queryKey: ['budget-alerts'] });
      toast.success('Alert acknowledged');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBudget.limit_amount <= 0) {
      toast.error('Please enter a valid budget amount');
      return;
    }
    addBudgetMutation.mutate(newBudget);
  };

  const getSeverityColor = (utilization: number) => {
    if (utilization >= 100) return 'text-destructive';
    if (utilization >= 90) return 'text-orange-600';
    if (utilization >= 75) return 'text-yellow-600';
    return 'text-primary';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Budgets</h1>
          <p className="text-muted-foreground mt-1">Monitor and manage your spending limits</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Budget
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Budget</DialogTitle>
              <DialogDescription>Set spending limits for a category</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={newBudget.category}
                  onValueChange={(value) => setNewBudget(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="limit">Budget Limit</Label>
                <Input
                  id="limit"
                  type="number"
                  step="0.01"
                  placeholder="500.00"
                  value={newBudget.limit_amount || ''}
                  onChange={(e) => setNewBudget(prev => ({ ...prev, limit_amount: parseFloat(e.target.value) }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="period">Period</Label>
                <Select
                  value={newBudget.period}
                  onValueChange={(value) => setNewBudget(prev => ({ ...prev, period: value }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PERIODS.map(period => (
                      <SelectItem key={period} value={period}>
                        {period.charAt(0).toUpperCase() + period.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {userGeofences && userGeofences.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="geofence">Link to Location (Optional)</Label>
                  <Select
                    value={newBudget.geofence_id || "none"}
                    onValueChange={(value) => setNewBudget(prev => ({ ...prev, geofence_id: value === "none" ? null : value }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No location</SelectItem>
                      {userGeofences.map((gf: any) => (
                        <SelectItem key={gf.id} value={gf.id}>{gf.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Track spending only at this location</p>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={addBudgetMutation.isPending}>
                {addBudgetMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
                ) : 'Create Budget'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {alerts && alerts.length > 0 && (
        <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Budget Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-3 bg-background rounded-lg">
                <div>
                  <p className="font-medium">{alert.budget.category}</p>
                  <p className="text-sm text-muted-foreground">
                    {alert.threshold_percentage}% threshold reached (${Number(alert.current_spent).toFixed(2)} / ${Number(alert.budget_limit).toFixed(2)})
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => acknowledgeAlertMutation.mutate(alert.id)}>
                  Acknowledge
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {geofenceSpending && geofenceSpending.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <CardTitle>Spending by Location</CardTitle>
            </div>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {geofenceSpending.map((gf: any) => (
                <div key={gf.geofence_id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{gf.name}</p>
                      <p className="text-sm text-muted-foreground">{gf.count} transactions</p>
                    </div>
                    <p className="text-lg font-bold">${gf.total.toFixed(2)}</p>
                  </div>
                  <Progress
                    value={(gf.total / Math.max(...(geofenceSpending as any[]).map((g: any) => g.total))) * 100}
                    className="h-2"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <SkeletonLoader variant="card" count={3} />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {budgets?.map((budget: any) => (
            <Card key={budget.id}>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle>{budget.category}</CardTitle>
                    {budget.geofence && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {budget.geofence.name}
                      </Badge>
                    )}
                  </div>
                  {budget.utilization >= 100 ? (
                    <Badge variant="destructive">Exceeded</Badge>
                  ) : budget.utilization >= 90 ? (
                    <Badge variant="destructive" className="bg-orange-500">Alert</Badge>
                  ) : (
                    <Badge variant="outline">Active</Badge>
                  )}
                </div>
                <CardDescription className="capitalize">{budget.period}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Spent</span>
                    <span className={`font-bold ${getSeverityColor(budget.utilization)}`}>
                      ${budget.spent.toFixed(2)}
                    </span>
                  </div>
                  <Progress value={Math.min(budget.utilization, 100)} className="h-2" />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Limit</span>
                    <span className="font-medium">${Number(budget.limit_amount).toFixed(2)}</span>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Remaining</span>
                    <span className={`text-lg font-bold ${budget.remaining > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${Math.abs(budget.remaining).toFixed(2)}
                    </span>
                  </div>
                  {budget.remaining < 0 && (
                    <p className="text-xs text-destructive mt-1">Over budget!</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {budgets?.length === 0 && (
            <Card className="col-span-full">
              <CardContent className="pt-6 text-center text-muted-foreground">
                No budgets yet. Create your first budget to start tracking spending!
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
