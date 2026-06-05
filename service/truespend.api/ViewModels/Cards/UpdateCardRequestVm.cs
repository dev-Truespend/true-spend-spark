namespace TrueSpend.Api.ViewModels.Cards;

public sealed record UpdateCardRequestVm(string? Nickname, string? LastFour, bool IsPrimary);
