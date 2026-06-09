import { apiGet, apiPost } from "@/shared/api/client";
import {
  CardDetail,
  CardLimits,
  CardsListResponse,
  CreateManualCardInput,
  DeleteRewardOverrideInput,
  RewardOverridesResponse,
  UpdateCardInput,
  UpsertRewardOverrideInput
} from "@/features/cards/types/cards.types";

export const cardsApi = {
  getCards: () => apiGet<CardsListResponse>("/api/v1/cards"),
  getLimits: () => apiGet<CardLimits>("/api/v1/cards/limits"),
  getCardDetail: (cardId: number) => apiGet<CardDetail>(`/api/v1/cards/${cardId}`),
  createManualCard: (body: CreateManualCardInput) => apiPost<CardDetail>("/api/v1/cards/manual", body),
  updateCard: (cardId: number, body: UpdateCardInput) => apiPost<CardDetail>(`/api/v1/cards/${cardId}`, body),
  setPrimary: (cardId: number) => apiPost<CardsListResponse>(`/api/v1/cards/${cardId}/primary`),
  deleteCard: (cardId: number) => apiPost<CardsListResponse>(`/api/v1/cards/${cardId}/delete`),
  getRewardOverrides: (cardId: number) =>
    apiGet<RewardOverridesResponse>(`/api/v1/cards/${cardId}/reward-overrides`),
  upsertRewardOverride: (cardId: number, body: UpsertRewardOverrideInput) =>
    apiPost<RewardOverridesResponse>(`/api/v1/cards/${cardId}/reward-overrides`, body),
  deleteRewardOverride: (cardId: number, body: DeleteRewardOverrideInput) =>
    apiPost<RewardOverridesResponse>(`/api/v1/cards/${cardId}/reward-overrides/delete`, body)
};
