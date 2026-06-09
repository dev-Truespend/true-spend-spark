import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { plaidApi } from "@/features/plaid/api/plaid.api";
import {
  disconnectConnectionSchema,
  exchangePlaidTokenSchema,
  reconnectConnectionSchema,
  syncConnectionSchema
} from "@/features/plaid/schemas/plaid.schema";
import { DisconnectConnectionInput, ReconnectConnectionInput, SyncConnectionInput } from "@/features/plaid/types/plaid.types";
import { launchPlaidLink, PlaidLinkCancelledError } from "@/shared/native/plaidLinkLauncher";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export { PlaidLinkCancelledError };

export function usePlaidConnections() {
  const query = useQuery({
    queryKey: QueryKeys.PlaidConnections,
    queryFn: async () => {
      const response = await plaidApi.getConnections();
      return response.data;
    }
  });

  return {
    connections: query.data?.connections ?? [],
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null
  };
}

export function useAddPlaidConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const tokenResponse = await plaidApi.createLinkToken();
      const linkToken = tokenResponse.data?.linkToken;
      if (!linkToken) throw new Error("Could not start Plaid Link. Please try again.");
      const linkResult = await launchPlaidLink(linkToken);
      const payload = exchangePlaidTokenSchema.parse({ publicToken: linkResult.publicToken });
      return plaidApi.exchangeToken(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.PlaidConnections });
      queryClient.invalidateQueries({ queryKey: QueryKeys.Cards });
      queryClient.invalidateQueries({ queryKey: QueryKeys.CardLimits });
      queryClient.invalidateQueries({ queryKey: QueryKeys.HomeRecommendation });
    }
  });
}

export function useSyncConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SyncConnectionInput) => {
      const parsed = syncConnectionSchema.parse(input);
      return plaidApi.syncConnection(parsed);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.PlaidConnections });
      queryClient.invalidateQueries({ queryKey: QueryKeys.Cards });
      queryClient.invalidateQueries({ queryKey: QueryKeys.PlaidResyncQuota });
    }
  });
}

export function useReconnectConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ReconnectConnectionInput) => {
      const parsed = reconnectConnectionSchema.parse(input);
      const reconnect = await plaidApi.reconnectConnection(parsed);
      const linkToken = reconnect.data?.linkToken;
      if (!linkToken) {
        return reconnect;
      }
      const linkResult = await launchPlaidLink(linkToken);
      const exchangePayload = exchangePlaidTokenSchema.parse({ publicToken: linkResult.publicToken });
      await plaidApi.exchangeToken(exchangePayload);
      return reconnect;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.PlaidConnections });
      queryClient.invalidateQueries({ queryKey: QueryKeys.Cards });
    }
  });
}

export function useDisconnectConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DisconnectConnectionInput) => {
      const parsed = disconnectConnectionSchema.parse(input);
      return plaidApi.disconnectConnection(parsed);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.PlaidConnections });
      queryClient.invalidateQueries({ queryKey: QueryKeys.Cards });
    }
  });
}
