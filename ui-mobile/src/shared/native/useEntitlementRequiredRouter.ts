import { useEffect } from "react";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { QueryKeys } from "@/shared/constants/QueryKeys";
import { setEntitlementRequiredHandler } from "@/shared/errors/entitlementHandler";

export function useEntitlementRequiredRouter(): void {
  const queryClient = useQueryClient();
  useEffect(() => {
    setEntitlementRequiredHandler((error) => {
      void queryClient.invalidateQueries({ queryKey: QueryKeys.Entitlements });
      router.push({
        pathname: "/(app)/billing",
        params: { requiredPlanCode: error.requiredPlanCode, featureCode: error.featureCode }
      });
    });
    return () => setEntitlementRequiredHandler(null);
  }, [queryClient]);
}
