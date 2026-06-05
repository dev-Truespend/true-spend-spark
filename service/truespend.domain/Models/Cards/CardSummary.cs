namespace TrueSpend.Domain.Models.Cards;

public sealed record CardSummary(int Id, string DisplayName, string IssuerName, string? LastFour, string Source, bool IsPrimary, string SyncStatus, string? CardArtUrl);
