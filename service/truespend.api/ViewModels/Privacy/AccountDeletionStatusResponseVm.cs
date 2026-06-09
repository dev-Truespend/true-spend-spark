namespace TrueSpend.Api.ViewModels.Privacy;

public sealed record AccountDeletionStatusResponseVm(
    string Status,
    DateTimeOffset? RequestedAt,
    DateTimeOffset? PurgeAfter);
