import { CardsListResponse } from "@/features/cards/types/cards.types";

export function toDomainCards(response: CardsListResponse): CardsListResponse {
  return {
    cards: response.cards.map((card) => ({ ...card })),
    limits: { ...response.limits }
  };
}
