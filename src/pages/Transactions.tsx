import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { bffClient, TransactionInput } from "@/lib/api/bffClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, TrendingDown, TrendingUp } from "lucide-react";
import { format } from "date-fns";

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

export default function Transactions() {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTransaction, setNewTransaction] = useState<Partial<TransactionInput>>({
    category: "Other",
  });
  const [isCategorizing, setIsCategorizing] = useState(false);

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, merchant:merchants(*), geofence:geofences(*)')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  const addTransactionMutation = useMutation({
    mutationFn: async (input: TransactionInput) => {
      return bffClient.processTransaction(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transaction added successfully');
      setIsAddOpen(false);
      setNewTransaction({ category: "Other" });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add transaction');
    },
  });

  const handleAICategorize = async () => {
    if (!newTransaction.description) {
      toast.error('Please enter a description first');
      return;
    }

    setIsCategorizing(true);
    try {
      const result = await bffClient.categorizeTransaction({
        description: newTransaction.description,
        amount: newTransaction.amount,
      });

      setNewTransaction(prev => ({
        ...prev,
        category: result.category,
        description: result.merchant_normalized || prev.description,
      }));

      toast.success(`Categorized as ${result.category} (${Math.round(result.confidence * 100)}% confidence)`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'AI categorization failed');
    } finally {
      setIsCategorizing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newTransaction.amount || newTransaction.amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    addTransactionMutation.mutate(newTransaction as TransactionInput);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Transactions</h1>
          <p className="text-muted-foreground">Track and manage your spending</p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Transaction
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Transaction</DialogTitle>
              <DialogDescription>
                Enter transaction details. Use AI to auto-categorize.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newTransaction.amount || ''}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <div className="flex gap-2">
                  <Input
                    id="description"
                    placeholder="Starbucks Coffee"
                    value={newTransaction.description || ''}
                    onChange={(e) => setNewTransaction(prev => ({ ...prev, description: e.target.value }))}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAICategorize}
                    disabled={isCategorizing || !newTransaction.description}
                  >
                    {isCategorizing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'AI'
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={newTransaction.category}
                  onValueChange={(value) => setNewTransaction(prev => ({ ...prev, category: value }))}
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

              <Button type="submit" className="w-full" disabled={addTransactionMutation.isPending}>
                {addTransactionMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Transaction'
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4">
          {transactions?.map((tx) => (
            <Card key={tx.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${Number(tx.amount) > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                      {Number(tx.amount) > 0 ? (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      ) : (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{tx.description || 'Transaction'}</CardTitle>
                      <CardDescription>
                        {tx.merchant?.name || 'Unknown'} • {tx.category}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${Number(tx.amount) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ${Math.abs(Number(tx.amount)).toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(tx.timestamp), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              </CardHeader>
              {tx.geofence && (
                <CardContent className="pt-0">
                  <div className="text-sm text-muted-foreground">
                    📍 {tx.geofence.name}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
          
          {transactions?.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No transactions yet. Add your first transaction to get started!
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}