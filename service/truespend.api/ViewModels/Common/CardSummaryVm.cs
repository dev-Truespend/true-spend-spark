namespace TrueSpend.Api.ViewModels.Common;

public sealed record CardSummaryVm(
    int Id,
    string DisplayName,
    string IssuerName,
    string? LastFour,
    string Source,
    bool IsPrimary,
    string SyncStatus,
    string? CardArtUrl);
