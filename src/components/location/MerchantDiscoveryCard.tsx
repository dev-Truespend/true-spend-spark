import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Star, DollarSign, Navigation, Tag, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';
import { useFavoriteMerchants } from '@/hooks/useFavoriteMerchants';

interface MerchantDiscoveryCardProps {
  merchantId: string;
  recommendationId?: string;
  name: string;
  category?: string;
  rating?: number;
  priceTier?: number;
  distance?: number;
  dealType?: string;
  dealDescription?: string;
  potentialSavings?: number;
  address?: string;
  lat?: number;
  lng?: number;
}

export function MerchantDiscoveryCard({
  merchantId,
  recommendationId,
  name,
  category,
  rating,
  priceTier,
  distance,
  dealType,
  dealDescription,
  potentialSavings,
  address,
  lat,
  lng
}: MerchantDiscoveryCardProps) {
  const [isTracking, setIsTracking] = useState(false);
  const { isFavorite, addFavorite, removeFavorite, isAdding, isRemoving } = useFavoriteMerchants();

  const hasDeal = dealType && dealDescription;
  const isSaved = isFavorite(merchantId);

  const handleGetDirections = async () => {
    if (!lat || !lng) {
      toast.error('Location not available');
      return;
    }

    // Track click in merchant_recommendations
    if (recommendationId && !isTracking) {
      setIsTracking(true);
      try {
        await supabase
          .from('merchant_recommendations')
          .update({
            clicked: true,
            clicked_at: new Date().toISOString()
          })
          .eq('id', recommendationId);
      } catch (error) {
        console.error('Failed to track click:', error);
      } finally {
        setIsTracking(false);
      }
    }

    // Open Google Maps with directions
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(mapsUrl, '_blank');
    toast.success('Opening directions in Google Maps');
  };

  const handleViewDetails = async () => {
    // Track view in merchant_recommendations
    if (recommendationId && !isTracking) {
      setIsTracking(true);
      try {
        await supabase
          .from('merchant_recommendations')
          .update({
            viewed: true,
            viewed_at: new Date().toISOString()
          })
          .eq('id', recommendationId);
      } catch (error) {
        console.error('Failed to track view:', error);
      } finally {
        setIsTracking(false);
      }
    }

    toast.info('Full merchant details coming soon');
  };

  const handleToggleFavorite = () => {
    if (isSaved) {
      removeFavorite(merchantId);
    } else {
      addFavorite({
        merchantId,
        name,
        category,
        address,
        lat,
        lng
      });
    }
  };

  const getPriceTierDisplay = (tier?: number) => {
    if (!tier) return null;
    return '$'.repeat(tier);
  };

  const getDealBadgeVariant = (type?: string) => {
    switch (type) {
      case 'discount':
        return 'default';
      case 'loyalty':
        return 'secondary';
      case 'seasonal':
        return 'outline';
      case 'first_time':
        return 'default';
      case 'time_limited':
        return 'destructive';
      default:
        return 'default';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg">{name}</h3>
                {hasDeal && (
                  <Badge variant={getDealBadgeVariant(dealType)} className="animate-pulse">
                    <Tag className="h-3 w-3 mr-1" />
                    Deal
                  </Badge>
                )}
              </div>
              
              {category && (
                <p className="text-sm text-muted-foreground capitalize">
                  {category.replace(/_/g, ' ')}
                </p>
              )}
            </div>

            {rating && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-yellow-500/10">
                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                <span className="font-medium text-sm">{rating.toFixed(1)}</span>
              </div>
            )}
          </div>

          {/* Deal Information */}
          {hasDeal && dealDescription && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-start gap-2">
                <Tag className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-primary mb-1">
                    {dealType?.replace(/_/g, ' ').toUpperCase()}
                  </p>
                  <p className="text-sm">{dealDescription}</p>
                  {potentialSavings && potentialSavings > 0 && (
                    <div className="flex items-center gap-1 mt-2 text-green-600">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-sm font-semibold">
                        Save ${potentialSavings.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Details Row */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {priceTier && (
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                <span className="font-medium">{getPriceTierDisplay(priceTier)}</span>
              </div>
            )}
            
            {distance !== undefined && (
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{distance < 1 ? `${(distance * 1000).toFixed(0)}m` : `${distance.toFixed(1)}km`}</span>
              </div>
            )}
          </div>

          {/* Address */}
          {address && (
            <p className="text-sm text-muted-foreground line-clamp-1">
              {address}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleToggleFavorite}
              variant={isSaved ? "default" : "outline"}
              size="icon"
              disabled={isAdding || isRemoving}
              title={isSaved ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
            </Button>
            <Button
              onClick={handleGetDirections}
              disabled={!lat || !lng || isTracking}
              className="flex-1"
            >
              <Navigation className="h-4 w-4 mr-2" />
              Directions
            </Button>
            <Button
              onClick={handleViewDetails}
              variant="outline"
              disabled={isTracking}
            >
              Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
