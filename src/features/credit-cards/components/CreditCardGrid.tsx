import { CreditCard, Lock, RefreshCw, BarChart3 } from 'lucide-react';
import { useCreditCards } from '@/features/credit-cards/hooks/useCreditCards';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { CreditCardTile } from './CreditCardTile';
import { AddCardButton } from './AddCardButton';

// ── Skeleton for the loading state — matches CreditCardTile shape ──────
function CardTileSkeleton() {
  return (
    <div className="rounded-lg border overflow-hidden">
      <Skeleton className="h-48 w-full" />
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-10" />
        </div>
        <Skeleton className="h-2 w-full" />
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    </div>
  );
}

// ── Loading / empty / list states ──────────────────────────────────────
export function CreditCardGrid() {
  const { cards, isLoading, cardCount, maxCards } = useCreditCards();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CardTileSkeleton />
          <CardTileSkeleton />
          <CardTileSkeleton />
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 p-5 mb-6">
            <CreditCard className="h-12 w-12 text-primary" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 tracking-tight">
            Connect your first card
          </h2>
          <p className="text-muted-foreground max-w-lg mb-8">
            Securely link credit cards via Plaid to automatically track balances,
            due dates, and transactions — without sharing your bank password with us.
          </p>
          <AddCardButton />
          <p className="text-xs text-muted-foreground mt-4">
            Up to <strong>3 cards free</strong> · Additional cards from $1.50/month
          </p>
        </div>

        {/* Trust badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 border-t">
          <div className="flex items-start gap-3 p-3">
            <Lock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium mb-0.5">Bank-grade security</p>
              <p className="text-xs text-muted-foreground">256-bit encryption via Plaid</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3">
            <RefreshCw className="h-5 w-5 text-accent shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium mb-0.5">Auto-sync</p>
              <p className="text-xs text-muted-foreground">Transactions update daily</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3">
            <BarChart3 className="h-5 w-5 text-brand-teal shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium mb-0.5">Smart insights</p>
              <p className="text-xs text-muted-foreground">Track utilization & due dates</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Your Credit Cards</h2>
          <p className="text-sm text-muted-foreground">
            {cardCount} of {maxCards} cards connected
          </p>
        </div>
        <AddCardButton />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <CreditCardTile key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}
