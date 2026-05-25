import { useState } from 'react';
import { CreditCard as CreditCardIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { CreditCardDetails } from './CreditCardDetails';
import type { CreditCard } from '@/features/credit-cards/hooks/useCreditCards';
import { cn } from '@/shared/lib/utils';

interface CreditCardTileProps {
  card: CreditCard;
}

const brandColors: Record<string, { from: string; to: string }> = {
  visa: { from: 'from-blue-500', to: 'to-blue-700' },
  mastercard: { from: 'from-red-500', to: 'to-orange-600' },
  amex: { from: 'from-blue-600', to: 'to-teal-600' },
  discover: { from: 'from-orange-500', to: 'to-amber-600' },
  default: { from: 'from-primary', to: 'to-accent' },
};

export function CreditCardTile({ card }: CreditCardTileProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const colors = brandColors[card.card_brand?.toLowerCase() || 'default'] || brandColors.default;
  const balance = card.current_balance || 0;
  const creditLimit = card.credit_limit || 0;
  const utilizationPercent = creditLimit > 0 ? (balance / creditLimit) * 100 : 0;

  return (
    <>
      <Card
        className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
        onClick={() => setIsDetailsOpen(true)}
      >
        <CardContent className="p-0">
          {/* Card Header with Gradient */}
          <div className={cn(
            'relative h-48 rounded-t-lg bg-gradient-to-br p-6 text-white overflow-hidden',
            colors.from,
            colors.to
          )}>
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-16 translate-x-16" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-12 -translate-x-12" />
            </div>

            {/* Card Content */}
            <div className="relative h-full flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm opacity-90 mb-1">
                    {card.account_name || 'Credit Card'}
                  </p>
                  {card.is_primary && (
                    <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                      Primary
                    </Badge>
                  )}
                </div>
                <CreditCardIcon className="h-8 w-8 opacity-90" />
              </div>

              <div>
                <p className="text-sm opacity-75 mb-1">•••• •••• •••• {card.account_mask || '••••'}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">
                    ${Math.abs(balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  {balance > 0 ? (
                    <TrendingUp className="h-4 w-4 text-red-200" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-green-200" />
                  )}
                </div>
                <p className="text-xs opacity-75 mt-1">Current Balance</p>
              </div>
            </div>
          </div>

          {/* Card Footer */}
          <div className="p-4 space-y-3">
            {/* Utilization Bar */}
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Credit Used</span>
                <span className="font-medium">{utilizationPercent.toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
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

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Available</p>
                <p className="font-semibold">
                  ${(card.available_credit || 0).toLocaleString('en-US')}
                </p>
              </div>
              {card.due_date && (
                <div>
                  <p className="text-muted-foreground">Due Date</p>
                  <p className="font-semibold">
                    {new Date(card.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <CreditCardDetails
        card={card}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
      />
    </>
  );
}
