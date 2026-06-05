namespace TrueSpend.Domain.Models.Catalog;

public sealed record CardProductRequest(int Id, string IssuerName, string CardName, string Status);
