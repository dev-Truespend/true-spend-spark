import { useMutation } from "@tanstack/react-query";
import { plaidApi } from "@/features/plaid/api/plaid.api";

export function usePlaidLinkToken() {
  return useMutation({
    mutationFn: () => plaidApi.createLinkToken()
  });
}
