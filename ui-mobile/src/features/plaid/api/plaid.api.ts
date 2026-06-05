import { apiPost, apiGet } from "@/shared/api/client";
import {
  DisconnectConnectionInput,
  PlaidConnectionResponse,
  PlaidConnectionsResponse,
  PlaidLinkToken,
  PlaidTransactionSyncResponse,
  ReconnectConnectionInput,
  SyncConnectionInput,
  SyncPlaidTransactionsInput
} from "@/features/plaid/types/plaid.types";

export type PlaidExchangeRequest = { publicToken: string };

export const plaidApi = {
  createLinkToken: () => apiPost<PlaidLinkToken>("/api/v1/plaid/link-token"),
  exchangeToken: (body: PlaidExchangeRequest) => apiPost<PlaidConnectionResponse>("/api/v1/plaid/exchange-token", body),
  getConnections: () => apiGet<PlaidConnectionsResponse>("/api/v1/plaid/connections"),
  syncConnection: (body: SyncConnectionInput) => apiPost<PlaidConnectionResponse>("/api/v1/plaid/connections/sync", body),
  reconnectConnection: (body: ReconnectConnectionInput) => apiPost<PlaidLinkToken>("/api/v1/plaid/connections/reconnect", body),
  disconnectConnection: (body: DisconnectConnectionInput) => apiPost<PlaidConnectionResponse>("/api/v1/plaid/connections/disconnect", body),
  syncTransactions: (body: SyncPlaidTransactionsInput = {}) =>
    apiPost<PlaidTransactionSyncResponse>("/api/v1/plaid/transactions/sync", body)
};
