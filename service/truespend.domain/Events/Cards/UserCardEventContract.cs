namespace TrueSpend.Domain.Events.Cards;

public sealed record UserCardEventContract(
    int UserCardId,
    Guid UserId,
    int? CardProductId,
    int? CatalogRequestId,
    string SourceCode,
    string SyncStatus,
    bool IsPrimary,
    DateTimeOffset OccurredAt);
