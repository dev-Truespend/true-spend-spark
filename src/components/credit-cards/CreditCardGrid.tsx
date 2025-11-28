import { CreditCard, Loader2 } from 'lucide-react';
import { useCreditCards } from '@/hooks/useCreditCards';
import { CreditCardTile } from './CreditCardTile';
import { AddCardButton } from './AddCardButton';

export function CreditCardGrid() {
  const { cards, isLoading, cardCount, maxCards } = useCreditCards();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="rounded-full bg-muted p-6 mb-6">
          <CreditCard className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-2xl font-semibold mb-2">No credit cards yet</h3>
        <p className="text-muted-foreground mb-8 text-center max-w-md">
          Connect your credit cards to track balances, due dates, and transactions all in one place.
        </p>
        <AddCardButton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Your Credit Cards</h2>
          <p className="text-muted-foreground">
            {cardCount} of {maxCards} cards
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
