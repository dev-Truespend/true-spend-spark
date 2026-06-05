export type CardSummary = {
  id: number;
  displayName: string;
  issuerName: string;
  lastFour?: string | null;
  source: string;
  isPrimary: boolean;
  syncStatus: string;
  cardArtUrl?: string | null;
};
