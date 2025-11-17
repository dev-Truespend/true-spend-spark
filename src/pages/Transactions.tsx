import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { bffClient, TransactionInput } from "@/lib/api/bffClient";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, TrendingDown, TrendingUp, RefreshCw, WifiOff } from "lucide-react";
import { format } from "date-fns";
import { OfflineIndicator } from "@/components/network/OfflineIndicator";
import { SyncStatusBadge } from "@/components/sync/SyncStatusBadge";

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
  const { storage, saveOffline, status } = useOfflineStorage();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTransaction, setNewTransaction] = useState<Partial<TransactionInput>>({
    category: "Other",
  });
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: transactions, isLoading } = useQuery<any[]>({
    queryKey: ['transactions'],
    queryFn: async () => {
      // Try local storage first for offline-first experience
      const localTransactions = await storage.getAll('transactions');
      
      // If offline, return local data
      if (!status.isOnline) {
        console.log('[Transactions] Offline: Using local data');
        return localTransactions;
      }

      // If online, fetch from Supabase
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('*, merchant:merchants(*), geofence:geofences(*)')
          .order('timestamp', { ascending: false })
          .limit(100);

        if (error) throw error;

        // Update local storage with fresh data
        if (data) {
          await storage.bulkSet(
            'transactions',
            data.map(t => ({ key: t.id, value: { ...t, synced: true } }))
          );
        }

        return data;
      } catch (error) {
        console.error('[Transactions] Fetch error, falling back to local:', error);
        // Fallback to local if online fetch fails
        return localTransactions.length > 0 ? localTransactions : [];
      }
    },
  });

  const addTransactionMutation = useMutation({
    mutationFn: async (input: TransactionInput) => {
      // If offline, save locally
      if (!status.isOnline) {
        const offlineTransaction = {
          id: crypto.randomUUID(),
          ...input,
          timestamp: input.timestamp || new Date().toISOString(),
          synced: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: '', // Will be set by backend
        };

        await saveOffline('transactions', offlineTransaction, 'CREATE');
        
        console.log('[Transactions] Saved offline:', offlineTransaction.id);
        return offlineTransaction;
      }

      // If online, process through BFF
      const result = await bffClient.processTransaction(input);
      const transaction = result.transaction;
      
      // Also save to local storage
      await storage.set('transactions', transaction.id, { ...transaction, synced: true });
      
      return transaction;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      
      if ('synced' in data && !data.synced) {
        toast.success('Transaction saved offline - will sync when online', {
          icon: <WifiOff className="h-4 w-4" />,
        });
      } else {
        toast.success('Transaction added successfully');
      }
      
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

  const handleSyncNow = async () => {
    if (!status.isOnline) {
      toast.error('Cannot sync while offline');
      return;
    }

    setIsSyncing(true);
    try {
      // Get all unsynced transactions
      const allTransactions = await storage.getAll('transactions');
      const unsyncedTransactions = allTransactions.filter((t: any) => !t.synced);

      if (unsyncedTransactions.length === 0) {
        toast.info('All transactions are already synced');
        return;
      }

      // Process each unsynced transaction
      for (const tx of unsyncedTransactions) {
        try {
          const input: TransactionInput = {
            amount: (tx as any).amount,
            category: (tx as any).category,
            description: (tx as any).description,
            merchant_id: (tx as any).merchant_id,
            location_lat: (tx as any).location_lat,
            location_lng: (tx as any).location_lng,
            timestamp: (tx as any).timestamp,
          };
          
          const result = await bffClient.processTransaction(input);
          const transaction = result.transaction;
          
          // Mark as synced in local storage
          await storage.set('transactions', (tx as any).id, { ...transaction, synced: true });
        } catch (error) {
          console.error('[Transactions] Sync error:', error);
          toast.error(`Failed to sync transaction: ${(tx as any).description || 'Unknown'}`);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success(`Synced ${unsyncedTransactions.length} transaction(s)`);
    } catch (error) {
      toast.error('Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <OfflineIndicator />
      
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Transactions</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-muted-foreground">Track and manage your spending</p>
            {status.pendingChanges > 0 && (
              <Badge variant="secondary" className="gap-1">
                <WifiOff className="h-3 w-3" />
                {status.pendingChanges} pending
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">{status.pendingChanges > 0 && status.isOnline && (
            <Button
              data-testid="sync-now-button"
              variant="outline"
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="gap-2"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Sync Now
                </>
              )}
            </Button>
          )}
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
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4">
          {transactions?.map((tx: any) => (
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
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{tx.description || 'Transaction'}</CardTitle>
                        <SyncStatusBadge
                          status={(tx as any).synced === false ? 'pending' : 'synced'}
                          lastSyncTime={(tx as any).updated_at}
                        />
                      </div>
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