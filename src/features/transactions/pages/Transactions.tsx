import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { bffClient, TransactionInput } from "@/lib/api/bffClient";
import { useGPSTracking } from "@/hooks/useGPSTracking";
import { useAuth } from "@/hooks/useAuth";
import { useBffTransactions } from "@/shared/hooks/useBffTransactions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Loader2, Plus, TrendingDown, TrendingUp, MapPin, Camera, Search,
  X as XIcon, ChevronLeft, ChevronRight, Filter, AlertTriangle,
  Trash2, Receipt as ReceiptIcon,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ReceiptCapture } from "@/components/receipts/ReceiptCapture";

const CATEGORIES = [
  "Dining", "Groceries", "Transportation", "Shopping",
  "Entertainment", "Health", "Utilities", "Travel", "Other",
];

const PAGE_SIZE = 25;

// ── Debounce hook (small, avoids extra dependency) ─────────────────────
function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

interface GeofenceRow {
  id: string;
  name: string;
  center_lat: number | string;
  center_lng: number | string;
  radius_meters: number;
}

interface TxRow {
  id:             string;
  amount:         number | string;
  category:       string | null;
  description:    string | null;
  timestamp:      string;
  receipt_url:    string | null;
  merchant?:      { id: string; name: string | null } | null;
  geofence?:      { id: string; name: string | null } | null;
  credit_card_id: string | null;
  geofence_id:    string | null;
}

export default function Transactions() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { position } = useGPSTracking(false);

  // ── Dialog state ─────────────────────────────────────────────────────
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTransaction, setNewTransaction] = useState<Partial<TransactionInput>>({ category: "Other" });
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [currentGeofence, setCurrentGeofence] = useState<GeofenceRow | null>(null);
  const [isReceiptCaptureOpen, setIsReceiptCaptureOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<TxRow | null>(null);

  // ── Filter / pagination state ───────────────────────────────────────
  const [page, setPage]                     = useState(1);
  const [searchInput, setSearchInput]       = useState("");
  const [geofenceFilter, setGeofenceFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dateFrom, setDateFrom]             = useState<string>("");
  const [dateTo, setDateTo]                 = useState<string>("");
  const [sortOrder, setSortOrder]           = useState<"newest" | "oldest" | "highest" | "lowest">("newest");
  const [showFilters, setShowFilters]       = useState(false);
  const [refreshKey, setRefreshKey]         = useState(0);

  const search = useDebouncedValue(searchInput, 300);

  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1); }, [search, geofenceFilter, categoryFilter, dateFrom, dateTo, sortOrder]);

  // ── Geofences ────────────────────────────────────────────────────────
  const userGeofences = useQuery<GeofenceRow[]>({
    queryKey: ['user-geofences', user?.id],
    enabled:  !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('geofences').select('id, name, center_lat, center_lng, radius_meters')
        .eq('user_id', user!.id).eq('active', true);
      if (error) throw error;
      return (data || []) as GeofenceRow[];
    },
  });

  // ── Detect if user is currently inside a known geofence ──────────────
  useEffect(() => {
    if (!isAddOpen || !position || !userGeofences.data) return;
    for (const geofence of userGeofences.data) {
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
  }, [isAddOpen, position, userGeofences.data]);

  // ── Main transactions query (BFF-backed pagination + filters) ───────
  const txQuery = useBffTransactions({
    page,
    limit: PAGE_SIZE,
    search: search.trim() || undefined,
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    geofenceId: geofenceFilter !== "all" ? geofenceFilter : undefined,
    dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
    dateTo: dateTo ? (() => {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      return end.toISOString();
    })() : undefined,
    sort: sortOrder,
    refreshKey,
  });

  // ── Mutations ────────────────────────────────────────────────────────
  const addTransactionMutation = useMutation({
    mutationFn: async (input: TransactionInput) => {
      const result = await bffClient.processTransaction(input);
      return result.transaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bff-transactions'] });
      setRefreshKey((key) => key + 1);
      queryClient.invalidateQueries({ queryKey: ['dashboard-month-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-recent-tx'] });
      toast.success('Transaction added');
      setIsAddOpen(false);
      setNewTransaction({ category: "Other" });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add transaction');
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bff-transactions'] });
      setRefreshKey((key) => key + 1);
      queryClient.invalidateQueries({ queryKey: ['dashboard-month-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-recent-tx'] });
      toast.success('Transaction deleted');
      setPendingDelete(null);
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to delete'),
  });

  // ── AI categorize ────────────────────────────────────────────────────
  const handleAICategorize = async () => {
    if (!newTransaction.description) {
      toast.error('Enter a description first');
      return;
    }
    setIsCategorizing(true);
    try {
      const result = await bffClient.categorizeTransaction({
        description: newTransaction.description,
        amount:      newTransaction.amount,
      });
      setNewTransaction((prev) => ({
        ...prev,
        category:    result.category,
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
      toast.error('Enter a valid amount');
      return;
    }
    addTransactionMutation.mutate(newTransaction as TransactionInput);
  };

  const handleReceiptExtracted = (tx: {
    amount: number; description: string; merchant?: string; category?: string; timestamp: string;
  }) => {
    setNewTransaction({
      amount:      tx.amount,
      description: tx.description,
      category:    tx.category || 'Other',
      timestamp:   tx.timestamp,
    });
    setIsReceiptCaptureOpen(false);
    setIsAddOpen(true);
  };

  // ── Derived ──────────────────────────────────────────────────────────
  const total      = txQuery.data?.pagination.total ?? 0;
  const totalPages = Math.max(1, txQuery.data?.pagination.totalPages ?? 1);
  const rows       = (txQuery.data?.transactions ?? []) as TxRow[];

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (search.trim())          n++;
    if (categoryFilter !== "all") n++;
    if (geofenceFilter !== "all") n++;
    if (dateFrom)               n++;
    if (dateTo)                 n++;
    return n;
  }, [search, categoryFilter, geofenceFilter, dateFrom, dateTo]);

  const clearAllFilters = () => {
    setSearchInput("");
    setGeofenceFilter("all");
    setCategoryFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-5 max-w-5xl">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {txQuery.isLoading ? "Loading…" : `${total.toLocaleString()} ${total === 1 ? "transaction" : "transactions"}`}
          </p>
        </div>

        <div className="flex gap-2">
          <Dialog open={isReceiptCaptureOpen} onOpenChange={setIsReceiptCaptureOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="camera-button" className="gap-2">
                <Camera className="h-4 w-4" />
                <span className="hidden sm:inline">Scan</span>
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
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Transaction</DialogTitle>
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
                    id="amount" type="number" step="0.01" placeholder="0.00"
                    value={newTransaction.amount || ''}
                    onChange={(e) => setNewTransaction((prev) => ({ ...prev, amount: parseFloat(e.target.value) }))}
                    required autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <div className="flex gap-2">
                    <Input
                      id="description" placeholder="Starbucks Coffee"
                      value={newTransaction.description || ''}
                      onChange={(e) => setNewTransaction((prev) => ({ ...prev, description: e.target.value }))}
                    />
                    <Button
                      type="button" variant="outline"
                      onClick={handleAICategorize}
                      disabled={isCategorizing || !newTransaction.description}
                      title="Auto-categorize with AI"
                    >
                      {isCategorizing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'AI'}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={newTransaction.category}
                    onValueChange={(value) => setNewTransaction((prev) => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={addTransactionMutation.isPending}>
                  {addTransactionMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding…</>
                  ) : 'Add Transaction'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Search + filter row ───────────────────────────────────── */}
      <Card>
        <CardContent className="p-3 sm:p-4 space-y-3">
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search description…"
                className="pl-9 pr-9"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted"
                  aria-label="Clear search"
                >
                  <XIcon className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>

            <Button
              variant={showFilters ? "default" : "outline"}
              onClick={() => setShowFilters((s) => !s)}
              className="gap-2 shrink-0"
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{activeFilterCount}</Badge>
              )}
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t">
              <div className="space-y-1">
                <Label className="text-xs">Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {(userGeofences.data?.length ?? 0) > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs">Location</Label>
                  <Select value={geofenceFilter} onValueChange={setGeofenceFilter}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All locations</SelectItem>
                      <SelectItem value="none">No location</SelectItem>
                      {userGeofences.data!.map((gf) => (
                        <SelectItem key={gf.id} value={gf.id}>{gf.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs">From</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">To</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9" />
              </div>

              <div className="space-y-1 col-span-2 lg:col-span-2">
                <Label className="text-xs">Sort</Label>
                <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as typeof sortOrder)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest first</SelectItem>
                    <SelectItem value="oldest">Oldest first</SelectItem>
                    <SelectItem value="highest">Highest amount</SelectItem>
                    <SelectItem value="lowest">Lowest amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {activeFilterCount > 0 && (
                <div className="col-span-2 lg:col-span-2 flex items-end">
                  <Button variant="ghost" size="sm" onClick={clearAllFilters} className="gap-1 text-muted-foreground">
                    <XIcon className="h-3.5 w-3.5" />
                    Clear filters
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── List / states ─────────────────────────────────────────── */}
      {txQuery.isError ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-10 text-center space-y-3">
            <AlertTriangle className="h-8 w-8 text-destructive/70 mx-auto" />
            <div>
              <p className="font-medium">Couldn't load transactions</p>
              <p className="text-sm text-muted-foreground mt-1">
                {txQuery.error instanceof Error ? txQuery.error.message : "Please try again."}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => txQuery.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : txQuery.isLoading ? (
        <div className="grid gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <TxRowSkeleton key={i} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <ReceiptIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            {activeFilterCount > 0 ? (
              <>
                <div>
                  <p className="font-medium">No transactions match your filters</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Try removing some filters or expanding your date range.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={clearAllFilters} className="gap-1">
                  <XIcon className="h-3.5 w-3.5" />
                  Clear all filters
                </Button>
              </>
            ) : (
              <>
                <div>
                  <p className="font-medium">No transactions yet</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                    Add your first transaction manually, scan a receipt, or connect a credit card to import automatically.
                  </p>
                </div>
                <div className="flex justify-center gap-2 pt-1">
                  <Button onClick={() => setIsAddOpen(true)} className="gap-1">
                    <Plus className="h-4 w-4" /> Add manually
                  </Button>
                  <Button variant="outline" onClick={() => setIsReceiptCaptureOpen(true)} className="gap-1">
                    <Camera className="h-4 w-4" /> Scan receipt
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Refetching overlay: keep prior rows but dim slightly */}
          <div className={cn("grid gap-2 transition-opacity", txQuery.isFetching && "opacity-60")}>
            {rows.map((tx) => {
              const amt = Number(tx.amount);
              const isExpense = amt > 0;
              return (
                <Card key={tx.id} className="group hover:shadow-sm transition-shadow">
                  <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                    <div className={cn(
                      "h-9 w-9 sm:h-10 sm:w-10 rounded-full flex items-center justify-center shrink-0",
                      isExpense ? "bg-red-100 dark:bg-red-950/40" : "bg-green-100 dark:bg-green-950/40"
                    )}>
                      {isExpense
                        ? <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                        : <TrendingUp   className="h-4 w-4 text-green-600 dark:text-green-400" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">
                          {tx.description || tx.merchant?.name || tx.category || 'Transaction'}
                        </p>
                        {tx.geofence?.name && (
                          <Badge variant="secondary" className="hidden sm:inline-flex h-5 px-1.5 text-[10px] gap-0.5">
                            <MapPin className="h-3 w-3" />
                            {tx.geofence.name}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {tx.category || 'Uncategorized'} · {format(new Date(tx.timestamp), 'MMM d, yyyy')}
                        {tx.merchant?.name && tx.description !== tx.merchant.name && ` · ${tx.merchant.name}`}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className={cn(
                        "text-base sm:text-lg font-semibold tabular-nums",
                        isExpense ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                      )}>
                        ${Math.abs(amt).toFixed(2)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPendingDelete(tx)}
                      className="p-1.5 rounded text-muted-foreground/0 hover:text-destructive hover:bg-destructive/10 group-hover:text-muted-foreground transition-all shrink-0"
                      aria-label="Delete transaction"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* ── Pagination ─────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                Page {page} of {totalPages} ·{" "}
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()}
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline" size="sm"
                  disabled={page === 1 || txQuery.isFetching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Prev</span>
                </Button>
                <Button
                  variant="outline" size="sm"
                  disabled={page >= totalPages || txQuery.isFetching}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="gap-1"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Delete confirmation ───────────────────────────────────── */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete && (
                <>
                  <strong>{pendingDelete.description || pendingDelete.category || 'This transaction'}</strong> for{" "}
                  <strong>${Math.abs(Number(pendingDelete.amount)).toFixed(2)}</strong> will be removed.
                  This cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingDelete && deleteTransactionMutation.mutate(pendingDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTransactionMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Skeleton for the loading state ─────────────────────────────────────
function TxRowSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
        <Skeleton className="h-6 w-16 shrink-0" />
      </CardContent>
    </Card>
  );
}
