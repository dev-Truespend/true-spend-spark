import { GlobalNav } from "@/shared/components/navigation/GlobalNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Heart, MapPin, Navigation, Trash2 } from "lucide-react";
import { useFavoriteMerchants } from "@/features/merchants/hooks/useFavoriteMerchants";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { toast } from "sonner";

export default function FavoriteMerchants() {
  const { favorites, isLoading, removeFavorite } = useFavoriteMerchants();

  const handleGetDirections = (lat?: number, lng?: number) => {
    if (!lat || !lng) {
      toast.error('Location not available');
      return;
    }

    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(mapsUrl, '_blank');
    toast.success('Opening directions in Google Maps');
  };

  return (
    <div className="min-h-screen bg-background">
      <GlobalNav />
      
      <main className="container mx-auto px-4 py-8 mt-16">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">Favorite Merchants</h1>
          </div>
          <p className="text-muted-foreground">
            Your saved merchants for quick access
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : favorites && favorites.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((favorite) => (
              <Card key={favorite.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">{favorite.merchant_name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFavorite(favorite.merchant_id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </CardTitle>
                  {favorite.merchant_category && (
                    <CardDescription>{favorite.merchant_category}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {favorite.merchant_address && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{favorite.merchant_address}</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleGetDirections(favorite.lat, favorite.lng)}
                      variant="default"
                      className="flex-1"
                      disabled={!favorite.lat || !favorite.lng}
                    >
                      <Navigation className="h-4 w-4 mr-2" />
                      Directions
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Heart className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No favorites yet</h3>
              <p className="text-muted-foreground text-center">
                Start adding merchants to your favorites from the merchant discovery page
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
