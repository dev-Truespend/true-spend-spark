import { CardProduct, CardProductRequest, Category, Issuer } from "@/features/catalog/types/catalog.types";

export const catalogMapper = {
  issuer: (raw: Issuer): Issuer => ({ ...raw, logoUrl: raw.logoUrl ?? null }),
  product: (raw: CardProduct): CardProduct => ({
    ...raw,
    cardArtUrl: raw.cardArtUrl ?? null,
    annualFee: raw.annualFee ?? null,
    rewardCurrencyName: raw.rewardCurrencyName ?? null
  }),
  request: (raw: CardProductRequest): CardProductRequest => ({ ...raw }),
  category: (raw: Category): Category => ({ ...raw, icon: raw.icon ?? null })
};
