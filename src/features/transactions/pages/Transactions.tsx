import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { bffClient, TransactionInput } from "@/lib/api/bffClient";
import { useGPSTracking } from "@/hooks/useGPSTracking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, TrendingDown, TrendingUp, MapPin, Camera } from "lucide-react";
import { format } from "date-fns";
import { ReceiptCapture } from "@/components/receipts/ReceiptCapture";

const CATEGORIES = [
  "Dining", "Groceries", "Transportation", "Shopping",
  "Entertainment", "Health", "Utilities", "Travel", "Other",
];

export default function Transactions() {
  const queryClient = useQueryClient();
  const { position } = useGPSTracking(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTransaction, setNewTransaction] = useState<Partial<TransactionInput>>({ category: "Other" });
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [geofenceFilter, setGeofenceFilter] = useState<string>("all");
  const [currentGeofence, setCurrentGeofence] = useState<any>(null);
  const [isReceiptCaptureOpen, setIsReceiptCaptureOpen] = useState(false);

  const { data: userGeofences } = useQuery({
    queryKey: ['user-geofences'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from('geofences').select('*').eq('user_id', user.id).eq('active', true);
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (!isAddOpen || !position || !userGeofences) return;
    for (const geofence of userGeofences) {
      const φ1 = (position.latitude * Math.PI) / 180;
      const φ2 = (Number(geofence.center_lat) * Math.PI) / 180;
      const Δφ = ((Number(geofence.center_lat) - position.latitude) * Math.PI) / 180;
      const Δλ = ((Number(geofence.center_lng) - position.longitude) * Math.PI) / 180;
      const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
      const distance = 6371e3 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      if (distance <= geofence.radius_meters) {
        setCurrentGeofence(geofence);
        return;
      }
    }
    setCurrentGeofence(null);
  }, [isAddOpen, position, userGeofences]);

  const { data: transactions, isLoading } = useQuery<any[]>({
    queryKey: ['transactions', geofenceFilter],
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select('*, merchant:merchants(*), geofence:geofences(*)')
        .order('timestamp', { ascending: false })
        .limit(100);
      if (geofenceFilter === 'none') query = query.is('geofence_id', null);
      else if (geofenceFilter !== 'all') query = query.eq('geofence_id', geofenceFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const addTransactionMutation = useMutation({
    mutationFn: async (input: TransactionInput) => {
      const result = await bffClient.processTransaction(input);
      return result.transaction;
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

  const handleReceiptExtracted = (transaction: {
    amount: number; description: string; merchant?: string; category?: string; timestamp: string;
  }) => {
    setNewTransaction({
      amount: transaction.amount,
      description: transaction.description,
      category: transaction.category || 'Other',
      timestamp: transaction.timestamp,
    });
    setIsReceiptCaptureOpen(false);
    setIsAddOpen(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Transactions</h1>
          <p className="text-muted-foreground mt-1">Track and manage your spending</p>
        </div>

        <div className="flex gap-2">
          {userGeofences && userGeofences.length > 0 && (
            <Select value={geofenceFilter} onValueChange={setGeofenceFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="none">No Location</SelectItem>
                {userGeofences.map((gf: any) => (
                  <SelectItem key={gf.id} value={gf.id}>{gf.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Dialog open={isReceiptCaptureOpen} onOpenChange={setIsReceiptCaptureOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="camera-button">
                <Camera className="mr-2 h-4 w-4" />
                Scan Receipt
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <ReceiptCapture
                onTransactionExtracted={handleReceiptExtracted}
                onCancel={() => setIsReceiptCaptureOpen(false)}
              />
            </DialogContent>
          </Dialog>

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
                  {currentGeofence && (
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="font-medium">Inside {currentGeofence.name}</span>
                    </div>
                  )}
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
                      {isCategorizing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'AI'}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={newTransaction.category}
                    onValueChange={(value) => setNewTransaction(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={addTransactionMutation.isPending}>
                  {addTransactionMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding...</>
                  ) : 'Add Transaction'}
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
                      {Number(tx.amount) > 0
                        ? <TrendingDown className="h-4 w-4 text-red-600" />
                        : <TrendingUp className="h-4 w-4 text-green-600" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-lg">{tx.description || 'Transaction'}</CardTitle>
                        {tx.geofence && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {tx.geofence.name}
                          </Badge>
                        )}
                      </div>
                      <CardDescription>{tx.merchant?.name || 'Unknown'} • {tx.category}</CardDescription>
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
