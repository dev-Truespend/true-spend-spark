import { useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { Merchant, RecommendationResponse } from "@/features/cards/types/home.types";
import {
  useChangeRecommendationCategoryMutation,
  useHomeRecommendationQuery,
  useRecordMerchantVisitMutation,
  useRefreshRecommendationMutation
} from "@/features/cards/hooks/useHomeQueries";
import { useDebounce } from "@/shared/hooks/useDebounce";

const VISIT_DEBOUNCE_MS = 800;

type ActiveOverride = {
  response: RecommendationResponse;
  merchant: Merchant | null;
} | null;

export function useHomeRecommendations() {
  const homeQuery = useHomeRecommendationQuery();
  const changeCategoryMutation = useChangeRecommendationCategoryMutation();
  const refreshMutation = useRefreshRecommendationMutation();
  const recordVisitMutation = useRecordMerchantVisitMutation();
  const [override, setOverride] = useState<ActiveOverride>(null);

  // Debounced visit recorder: when the user lands on a (merchant, category)
  // pair and stops tapping chips for VISIT_DEBOUNCE_MS, write the visit.
  // Prevents one chip-change-storm from emitting many outbox events.
  // Only mark a key as recorded after success — a transient failure should
  // retry on the next chip change or refetch.
  const [pendingVisit, setPendingVisit] = useState<{ merchantId: number; categoryCode: string } | null>(null);
  const debouncedVisit = useDebounce(pendingVisit, VISIT_DEBOUNCE_MS);
  const lastRecordedRef = useRef<string | null>(null);
  const inFlightRef = useRef<string | null>(null);
  useEffect(() => {
    if (!debouncedVisit) return;
    const key = `${debouncedVisit.merchantId}:${debouncedVisit.categoryCode}`;
    if (lastRecordedRef.current === key) return;
    if (inFlightRef.current === key) return;
    inFlightRef.current = key;
    recordVisitMutation.mutate(debouncedVisit, {
      onSuccess: () => {
        lastRecordedRef.current = key;
        inFlightRef.current = null;
      },
      onError: () => {
        // Silent: visit recording is a background side-effect. Clearing the
        // in-flight marker lets the next chip change (or refresh) retry.
        inFlightRef.current = null;
      }
    });
  }, [debouncedVisit, recordVisitMutation]);

  const response = override?.response ?? homeQuery.data?.home ?? null;
  const merchant = override?.merchant ?? response?.recommendation?.merchant ?? null;
  const categories = homeQuery.data?.categories ?? [];
  const isLoading =
    homeQuery.isLoading ||
    changeCategoryMutation.isPending ||
    refreshMutation.isPending;
  const firstError =
    homeQuery.error ??
    changeCategoryMutation.error ??
    refreshMutation.error;
  const error = firstError instanceof Error ? firstError.message : firstError ? String(firstError) : null;

  async function changeCategory(categoryCode: string) {
    const currentRecommendation = response?.recommendation;
    if (!currentRecommendation) return;
    const next = await changeCategoryMutation.mutateAsync({
      recommendationId: currentRecommendation.id,
      categoryCode
    });
    setOverride({ response: next, merchant: merchant ?? currentRecommendation.merchant });
    setPendingVisit({
      merchantId: next.recommendation?.merchant.id ?? currentRecommendation.merchant.id,
      categoryCode
    });
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
    error,
    isLoading,
    openAddCard,
    openCardDetails,
    openCards,
    openUpgrade,
    refresh,
    response
  };
}
