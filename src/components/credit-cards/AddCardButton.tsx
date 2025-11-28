import { Plus, Sparkles, Loader2 } from 'lucide-react';
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
import { usePlaidLinkFlow } from '@/hooks/usePlaid';

export function AddCardButton() {
  const { cardCount, freeSlots, paidSlots, canAddMoreCards, needsPayment, additionalCardPrice } = useCreditCards();
  const { openPlaidLink, isLoading, ready } = usePlaidLinkFlow();

  if (!canAddMoreCards) {
    return (
      <Button disabled variant="outline">
        <Plus className="h-4 w-4 mr-2" />
        Max Cards Reached
      </Button>
    );
  }

  const handleConnect = () => {
    openPlaidLink();
  };

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
            Securely connect your credit card using Plaid's bank-level encryption
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

          {/* Security Notice */}
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <h4 className="font-semibold text-sm mb-2">🔒 Bank-Level Security</h4>
            <p className="text-xs text-muted-foreground">
              Plaid uses 256-bit encryption and never stores your banking credentials. 
              Your data is protected by the same security banks use.
            </p>
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
          <Button 
            className="flex-1 gap-2" 
            onClick={handleConnect}
            disabled={isLoading || !ready}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Connect with Plaid
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
