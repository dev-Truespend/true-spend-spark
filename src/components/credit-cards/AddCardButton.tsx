import { Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useCreditCards } from '@/hooks/useCreditCards';

export function AddCardButton() {
  const { cardCount, freeSlots, paidSlots, canAddMoreCards, needsPayment, additionalCardPrice } = useCreditCards();

  if (!canAddMoreCards) {
    return (
      <Button disabled variant="outline">
        <Plus className="h-4 w-4 mr-2" />
        Max Cards Reached
      </Button>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Card
          {needsPayment && (
            <Badge variant="secondary" className="ml-1">
              ${additionalCardPrice}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Connect Credit Card
          </DialogTitle>
          <DialogDescription>
            Securely connect your credit card to track balances and transactions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Card Slots Info */}
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Cards Added</span>
              <span className="font-semibold">{cardCount} / 10</span>
            </div>
            {freeSlots > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Free Slots Remaining</span>
                <Badge variant="secondary">{freeSlots} free</Badge>
              </div>
            )}
            {needsPayment && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Additional Cards</span>
                <span className="font-semibold">${additionalCardPrice} each</span>
              </div>
            )}
          </div>

          {/* Coming Soon Notice */}
          <div className="rounded-lg border-2 border-dashed border-primary/20 p-6 text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h4 className="font-semibold">Plaid Integration Coming Soon</h4>
            <p className="text-sm text-muted-foreground">
              Securely connect your credit cards using Plaid's industry-leading authentication.
            </p>
            <Badge variant="outline" className="mt-2">Phase 2 Feature</Badge>
          </div>

          {/* What You'll Get */}
          <div className="space-y-2">
            <p className="text-sm font-medium">What you'll get:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Real-time balance updates
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Automatic transaction syncing
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Credit utilization tracking
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Due date reminders
              </li>
            </ul>
          </div>
        </div>

        <div className="flex gap-2">
          <Button className="flex-1" disabled>
            Connect with Plaid
            <Badge variant="secondary" className="ml-2">Soon</Badge>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
