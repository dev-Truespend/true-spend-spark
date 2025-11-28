import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  CreditCard as CreditCardIcon,
  Calendar,
  Percent,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Trash2,
  Star,
} from 'lucide-react';
import type { CreditCard } from '@/hooks/useCreditCards';
import { useCreditCards } from '@/hooks/useCreditCards';
import { cn } from '@/lib/utils';

interface CreditCardDetailsProps {
  card: CreditCard;
  isOpen: boolean;
  onClose: () => void;
}

export function CreditCardDetails({ card, isOpen, onClose }: CreditCardDetailsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { deleteCard, setPrimaryCard, isDeleting } = useCreditCards();

  const balance = card.current_balance || 0;
  const creditLimit = card.credit_limit || 0;
  const utilizationPercent = creditLimit > 0 ? (balance / creditLimit) * 100 : 0;

  const handleDelete = () => {
    deleteCard(card.id);
    setShowDeleteDialog(false);
    onClose();
  };

  const handleSetPrimary = () => {
    setPrimaryCard(card.id);
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <CreditCardIcon className="h-5 w-5 text-primary" />
              {card.account_name || 'Credit Card'}
            </SheetTitle>
            <SheetDescription>
              •••• •••• •••• {card.account_mask || '••••'}
              {card.card_brand && (
                <Badge variant="outline" className="ml-2 uppercase">
                  {card.card_brand}
                </Badge>
              )}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 mt-6">
            {/* Balance Overview */}
            <div className="rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 p-6 space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Current Balance</p>
                <p className="text-4xl font-bold">
                  ${Math.abs(balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>

              {/* Credit Utilization */}
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Credit Utilization</span>
                  <span className="font-semibold">{utilizationPercent.toFixed(1)}%</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all duration-500',
                      utilizationPercent > 80 ? 'bg-destructive' :
                      utilizationPercent > 50 ? 'bg-yellow-500' :
                      'bg-primary'
                    )}
                    style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Card Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm">Available Credit</span>
                </div>
                <p className="text-xl font-semibold">
                  ${(card.available_credit || 0).toLocaleString('en-US')}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm">Credit Limit</span>
                </div>
                <p className="text-xl font-semibold">
                  ${creditLimit.toLocaleString('en-US')}
                </p>
              </div>

              {card.apr_percentage && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Percent className="h-4 w-4" />
                    <span className="text-sm">APR</span>
                  </div>
                  <p className="text-xl font-semibold">{card.apr_percentage}%</p>
                </div>
              )}

              {card.due_date && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">Due Date</span>
                  </div>
                  <p className="text-xl font-semibold">
                    {new Date(card.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* Recent Transactions */}
            <div>
              <h3 className="font-semibold mb-3">Recent Transactions</h3>
              <div className="rounded-lg border-2 border-dashed p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Transaction history will appear here once Plaid integration is complete.
                </p>
                <Badge variant="outline" className="mt-2">Phase 2 Feature</Badge>
              </div>
            </div>

            <Separator />

            {/* Actions */}
            <div className="space-y-2">
              {!card.is_primary && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleSetPrimary}
                >
                  <Star className="h-4 w-4 mr-2" />
                  Set as Primary Card
                </Button>
              )}
              
              <Button
                variant="outline"
                className="w-full justify-start"
                disabled
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Now
                <Badge variant="secondary" className="ml-auto">Coming Soon</Badge>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Disconnect Card
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Credit Card?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove this card from your account. You can always add it back later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
