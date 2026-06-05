namespace TrueSpend.Domain.Models.Cards;

public sealed record CardsResponse(IReadOnlyList<CardSummary> Cards, CardLimitsResponse Limits);
