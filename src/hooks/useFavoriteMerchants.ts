import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FavoriteMerchant {
  id: string;
  merchant_id: string;
  foursquare_id?: string;
  merchant_name: string;
  merchant_category?: string;
  merchant_address?: string;
  lat?: number;
  lng?: number;
  created_at: string;
}

interface AddFavoriteParams {
  merchantId: string;
  foursquareId?: string;
  name: string;
  category?: string;
  address?: string;
  lat?: number;
  lng?: number;
}

export function useFavoriteMerchants() {
  const queryClient = useQueryClient();

  const { data: favorites, isLoading } = useQuery({
    queryKey: ['favorite-merchants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_favorite_merchants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FavoriteMerchant[];
    }
  });

  const addFavorite = useMutation({
    mutationFn: async (params: AddFavoriteParams) => {
      const { data, error } = await supabase
        .from('user_favorite_merchants' as any)
        .insert({
          merchant_id: params.merchantId,
          foursquare_id: params.foursquareId,
          merchant_name: params.name,
          merchant_category: params.category,
          merchant_address: params.address,
          lat: params.lat,
          lng: params.lng
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorite-merchants'] });
      toast.success('Added to favorites');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.info('Already in favorites');
      } else {
        toast.error('Failed to add favorite');
      }
    }
  });

  const removeFavorite = useMutation({
    mutationFn: async (merchantId: string) => {
      const { error } = await supabase
        .from('user_favorite_merchants' as any)
        .delete()
        .eq('merchant_id', merchantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorite-merchants'] });
      toast.success('Removed from favorites');
    },
    onError: () => {
      toast.error('Failed to remove favorite');
    }
  });

  const isFavorite = (merchantId: string) => {
    return favorites?.some(fav => fav.merchant_id === merchantId) || false;
  };

  return {
    favorites,
    isLoading,
    addFavorite: addFavorite.mutate,
    removeFavorite: removeFavorite.mutate,
    isFavorite,
    isAdding: addFavorite.isPending,
    isRemoving: removeFavorite.isPending
  };
}
