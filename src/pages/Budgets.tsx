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
import { Loader2, Plus, AlertTriangle, CheckCircle2 } from "lucide-react";

const CATEGORIES = [
  "Dining",
  "Groceries",
  "Transportation",
  "Shopping",
  "Entertainment",
  "Health",
  "Utilities",
  "Travel",
  "Other",
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
  });

  const { data: budgets, isLoading } = useQuery({
    queryKey: ['budgets-with-spending'],
    queryFn: async () => {
      const { data: budgets, error: budgetsError } = await supabase
        .from('budgets')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (budgetsError) throw budgetsError;

      // Get spending for each budget
      const budgetsWithSpending = await Promise.all(
        budgets.map(async (budget) => {
          const { data: transactions } = await supabase
            .from('transactions')
            .select('amount')
            .eq('category', budget.category)
            .gte('timestamp', budget.start_date)
            .lte('timestamp', budget.end_date || new Date().toISOString());

          const spent = transactions?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0;

          return {
            ...budget,
            spent,
            remaining: Number(budget.limit_amount) - spent,
            utilization: (spent / Number(budget.limit_amount)) * 100,
          };
        })
      );

      return budgetsWithSpending;
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const startDate = new Date();
      let endDate: Date | null = null;

      if (input.period === 'weekly') {
        endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      } else if (input.period === 'monthly') {
        endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, startDate.getDate());
      } else if (input.period === 'quarterly') {
        endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 3, startDate.getDate());
      }

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
      setNewBudget({ category: "Other", limit_amount: 0, period: "monthly", alert_threshold: 0.8 });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Budgets</h1>
          <p className="text-muted-foreground">Monitor and manage your spending limits</p>
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
              <DialogDescription>
                Set spending limits for a category
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={newBudget.category}
                  onValueChange={(value) => setNewBudget(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIODS.map(period => (
                      <SelectItem key={period} value={period}>
                        {period.charAt(0).toUpperCase() + period.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full" disabled={addBudgetMutation.isPending}>
                {addBudgetMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Budget'
                )}
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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => acknowledgeAlertMutation.mutate(alert.id)}
                >
                  Acknowledge
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {budgets?.map((budget) => (
            <Card key={budget.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{budget.category}</CardTitle>
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