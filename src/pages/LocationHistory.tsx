import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { MapPin, DollarSign } from "lucide-react";
import { LocationInsightsPanel } from "@/components/insights/LocationInsightsPanel";
import { SpendingHeatmap } from "@/components/location/SpendingHeatmap";
import { MerchantDiscoveryCard } from "@/components/location/MerchantDiscoveryCard";

export default function LocationHistory() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['location-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('location-analytics-bff', {
        body: { period_days: 30 },
      });

      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Location History</h1>
        <p className="text-muted-foreground">
          Track your spending patterns across different locations
        </p>
      </div>

      <LocationInsightsPanel />

      {/* Spending Heatmap Visualization */}
      <SpendingHeatmap />

      {/* Nearby Merchant Recommendations */}
      {analytics?.merchant_recommendations && analytics.merchant_recommendations.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Nearby Deals & Recommendations</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {analytics.merchant_recommendations.map((merchant: any) => (
              <MerchantDiscoveryCard
                key={merchant.id}
                merchantId={merchant.merchant_id}
                recommendationId={merchant.id}
                name={merchant.merchant_name}
                category={merchant.category}
                rating={merchant.rating}
                priceTier={merchant.price_tier}
                distance={merchant.distance}
                dealType={merchant.deal_type}
                dealDescription={merchant.deal_description}
                potentialSavings={merchant.potential_savings}
                address={merchant.address}
                lat={merchant.lat}
                lng={merchant.lng}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold mb-4">Spending by Location</h2>
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {analytics?.analytics?.map((location: any) => (
              <Card key={location.geofence_id} className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="font-semibold">{location.geofence_name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      <span className="font-medium text-foreground">
                        ${location.total_spent.toFixed(2)}
                      </span>
                      <span>• {location.transaction_count} transactions</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {Object.entries(location.categories || {}).map(([cat, count]: any) => (
                        <span
                          key={cat}
                          className="text-xs px-2 py-1 rounded-full bg-muted"
                        >
                          {cat} ({count})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {analytics?.recommendations && analytics.recommendations.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Recommendations</h2>
          <div className="grid gap-4">
            {analytics.recommendations.map((rec: any) => (
              <Card key={rec.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium mb-1">{rec.recommendation_type.replace('_', ' ')}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{rec.reasoning}</p>
                    {rec.suggested_amount && (
                      <p className="text-sm font-medium">
                        Suggested: ${rec.suggested_amount}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
