export type Issuer = {
  id: number;
  displayName: string;
  logoUrl?: string | null;
};

export type CardProduct = {
  id: number;
  issuerName: string;
  displayName: string;
  cardArtUrl?: string | null;
  annualFee?: number | null;
  rewardCurrencyName?: string | null;
};

export type CardProductRequest = {
  id: number;
  issuerName: string;
  cardName: string;
  status: string;
};

export type CreateCardProductRequestInput = {
  issuerName: string;
  cardName: string;
  createUserCard: boolean;
  nickname?: string;
  lastFour?: string;
  isPrimary: boolean;
};

export type Category = {
  id: number;
  code: string;
  displayName: string;
  icon?: string | null;
};
