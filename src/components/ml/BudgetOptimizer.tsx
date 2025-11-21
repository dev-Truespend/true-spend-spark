import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Brain, TrendingUp, DollarSign, Loader2 } from 'lucide-react';

interface BudgetAllocation {
  category: string;
  allocated_amount: number;
  confidence_score: number;
}

export function BudgetOptimizer() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [totalBudget, setTotalBudget] = useState('1000');
  const [categories, setCategories] = useState('Groceries,Dining,Entertainment,Transportation,Shopping');
  const [allocations, setAllocations] = useState<BudgetAllocation[]>([]);

  const handleOptimize = async () => {
    setLoading(true);
    try {
      const categoryList = categories.split(',').map(c => c.trim()).filter(c => c.length > 0);
      
      if (categoryList.length < 2) {
        toast({
          title: 'Invalid Input',
          description: 'Please enter at least 2 categories separated by commas',
          variant: 'destructive',
        });
        return;
      }

      const periodStart = new Date();
      periodStart.setDate(1); // Start of current month
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      periodEnd.setDate(0); // End of current month

      const { data, error } = await supabase.functions.invoke('thompson-sampling-budget', {
        body: {
          categories: categoryList,
          totalBudget: parseFloat(totalBudget),
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
        },
      });

      if (error) throw error;

      setAllocations(data.allocations);
      
      toast({
        title: 'Budget Optimized!',
        description: `Successfully allocated $${totalBudget} across ${categoryList.length} categories using Thompson Sampling`,
      });
    } catch (error: any) {
      console.error('Optimization error:', error);
      toast({
        title: 'Optimization Failed',
        description: error.message || 'Failed to optimize budget',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <CardTitle>AI Budget Optimizer</CardTitle>
        </div>
        <CardDescription>
          Uses Thompson Sampling (Multi-Armed Bandit) to optimize budget allocation across categories based on historical spending patterns
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="totalBudget">Total Budget ($)</Label>
            <Input
              id="totalBudget"
              type="number"
              value={totalBudget}
              onChange={(e) => setTotalBudget(e.target.value)}
              placeholder="Enter total budget"
              min="0"
              step="10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="categories">Categories (comma-separated)</Label>
            <Input
              id="categories"
              value={categories}
              onChange={(e) => setCategories(e.target.value)}
              placeholder="Groceries, Dining, Entertainment"
            />
          </div>

          <Button 
            onClick={handleOptimize} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Optimizing...
              </>
            ) : (
              <>
                <TrendingUp className="mr-2 h-4 w-4" />
                Optimize Budget
              </>
            )}
          </Button>
        </div>

        {allocations.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Optimized Allocations</h3>
            <div className="space-y-2">
              {allocations.map((allocation, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <div>
                      <p className="font-medium">{allocation.category}</p>
                      <p className="text-sm text-muted-foreground">
                        ${allocation.allocated_amount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {(allocation.confidence_score * 100).toFixed(1)}% confidence
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
