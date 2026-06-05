namespace TrueSpend.Domain.Models.Cards;

public sealed record UpdateCardRequest(string? Nickname, string? LastFour, bool IsPrimary);
