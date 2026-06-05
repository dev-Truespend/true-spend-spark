using TrueSpend.Domain.Models.Cards;

namespace TrueSpend.Domain.Models.Catalog;

public sealed record CardProductRequestResponse(CardProductRequest Request, CardSummary? UserCard);
