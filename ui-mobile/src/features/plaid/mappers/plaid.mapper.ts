import { PlaidConnection, PlaidConnectionResponse, PlaidLinkToken } from "@/features/plaid/types/plaid.types";

export const plaidMapper = {
  linkToken: (raw: PlaidLinkToken): PlaidLinkToken => ({ ...raw }),
  connection: (raw: PlaidConnection): PlaidConnection => ({
    ...raw,
    institutionLogoUrl: raw.institutionLogoUrl ?? null
  }),
  fromConnectionResponse: (raw: PlaidConnectionResponse): PlaidConnectionResponse => ({
    connections: raw.connections.map(plaidMapper.connection),
    cards: raw.cards,
    cardSyncStatus: raw.cardSyncStatus
  })
};
