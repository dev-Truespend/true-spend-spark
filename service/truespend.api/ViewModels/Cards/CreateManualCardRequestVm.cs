namespace TrueSpend.Api.ViewModels.Cards;

public sealed record CreateManualCardRequestVm(
    int CardProductId,
    int IssuerId,
    string? Nickname,
    string? LastFour,
    bool IsPrimary);
