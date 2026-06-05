namespace TrueSpend.Api.ViewModels.Catalog;

public sealed record CreateCardProductRequestVm(
    string IssuerName,
    string CardName,
    bool CreateUserCard,
    string? Nickname,
    string? LastFour,
    bool IsPrimary);
