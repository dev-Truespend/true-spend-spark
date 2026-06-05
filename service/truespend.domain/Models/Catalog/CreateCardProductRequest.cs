namespace TrueSpend.Domain.Models.Catalog;

public sealed record CreateCardProductRequest(string IssuerName, string CardName, bool CreateUserCard, string? Nickname, string? LastFour, bool IsPrimary);
