import { CardSummary } from "@/shared/types/card.types";

export type PlaidLinkToken = {
  linkToken: string;
  expiration: string;
};

export type PlaidConnection = {
  id: number;
  institutionName: string;
  institutionLogoUrl?: string | null;
  status: string;
  lastSyncAt?: string | null;
  cardCount: number;
};

export type PlaidConnectionsResponse = {
  connections: PlaidConnection[];
};

export type PlaidConnectionResponse = {
  connections: PlaidConnection[];
  cards: CardSummary[];
  cardSyncStatus: string;
};

export type ExchangePlaidTokenInput = {
  publicToken: string;
};

export type SyncConnectionInput = {
  connectionId: number;
};

export type ReconnectConnectionInput = {
  connectionId: number;
};

export type DisconnectConnectionInput = {
  connectionId: number;
};

export type SyncPlaidTransactionsInput = {
  connectionId?: number;
  force?: boolean;
};

export type PlaidTransactionSyncResponse = {
  connectionId?: number | null;
  importedCount: number;
  updatedCount: number;
  removedCount: number;
  lastTransactionSyncAt?: string | null;
};
