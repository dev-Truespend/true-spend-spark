namespace TrueSpend.Domain.Models.Cards;

public sealed record CreateManualCardRequest(int CardProductId, int IssuerId, string? Nickname, string? LastFour, bool IsPrimary);
