import { useState } from "react";
import { router } from "expo-router";
import { Merchant, NearbyMerchant, RecommendationResponse } from "@/features/cards/types/home.types";
import {
  useChangeRecommendationCategoryMutation,
  useHomeRecommendationQuery,
  usePlaceRecommendationMutation,
  useRefreshRecommendationMutation
} from "@/features/cards/hooks/useHomeQueries";

type ActiveOverride = {
  response: RecommendationResponse;
  merchant: Merchant | null;
} | null;

export function useHomeRecommendations() {
  const homeQuery = useHomeRecommendationQuery();
  const changeCategoryMutation = useChangeRecommendationCategoryMutation();
  const refreshMutation = useRefreshRecommendationMutation();
  const placeMutation = usePlaceRecommendationMutation();
  const [override, setOverride] = useState<ActiveOverride>(null);

  const response = override?.response ?? homeQuery.data?.home ?? null;
  const merchant = override?.merchant ?? response?.recommendation?.merchant ?? null;
  const categories = homeQuery.data?.categories ?? [];
  const isLoading =
    homeQuery.isLoading ||
    changeCategoryMutation.isPending ||
    refreshMutation.isPending ||
    placeMutation.isPending;
  const firstError =
    homeQuery.error ??
    changeCategoryMutation.error ??
    refreshMutation.error ??
    placeMutation.error;
  const error = firstError instanceof Error ? firstError.message : firstError ? String(firstError) : null;

  // Picking a category only re-computes and shows the best card for the current merchant.
  // It deliberately records NO merchant_visit — visits originate from real arrivals, not browsing.
  async function changeCategory(categoryCode: string) {
    const currentRecommendation = response?.recommendation;
    if (!currentRecommendation) return;
    const next = await changeCategoryMutation.mutateAsync({
      recommendationId: currentRecommendation.id,
      categoryCode
    });
    setOverride({ response: next, merchant: merchant ?? currentRecommendation.merchant });
  }

  async function refresh() {
    const activeMerchant = merchant ?? response?.recommendation?.merchant;
    if (!activeMerchant) {
      setOverride(null);
      await homeQuery.refetch();
      return;
    }
    const next = await refreshMutation.mutateAsync({
      merchantId: activeMerchant.id,
      categoryCode: response?.recommendation?.categoryCode ?? activeMerchant.categoryCode
    });
    setOverride({ response: next, merchant: activeMerchant });
  }

  // Tapped a map pin → resolve its merchant + best card and show it (no visit recorded).
  async function selectPlace(pin: NearbyMerchant) {
    const next = await placeMutation.mutateAsync({
      providerPlaceId: pin.providerPlaceId,
      name: pin.name,
      lat: pin.lat,
      lng: pin.lng,
      categoryCode: pin.categoryCode ?? undefined
    });
    setOverride({ response: next, merchant: next.recommendation?.merchant ?? null });
  }

  // Tapped a recent visit → re-compute the best card for that known merchant.
  async function selectVisit(merchantId: number, categoryCode: string) {
    const next = await refreshMutation.mutateAsync({ merchantId, categoryCode });
    setOverride({ response: next, merchant: next.recommendation?.merchant ?? null });
  }

  // Drop any pin/visit selection and fall back to the auto (nearby/last-visited) recommendation.
  function clearSelection() {
    setOverride(null);
  }

  function openAddCard() {
    router.push("/(app)/cards/new");
  }

  function openUpgrade() {
    router.push({ pathname: "/(app)/billing", params: { requiredPlanCode: "pro" } });
  }

  function openCardDetails(cardId?: number) {
    const id = cardId ?? response?.recommendation?.recommendedCard.card.id;
    if (id && id > 0) {
      router.push(`/(app)/cards/${id}`);
      return;
    }
    router.push("/(app)/(tabs)");
  }

  function openCards() {
    router.push("/(app)/(tabs)");
  }

  return {
    categories,
    changeCategory,
    clearSelection,
    error,
    isLoading,
    openAddCard,
    openCardDetails,
    openCards,
    openUpgrade,
    refresh,
    response,
    selectPlace,
    selectVisit
  };
}
