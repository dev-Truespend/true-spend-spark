namespace TrueSpend.Domain.Events.Merchants;

public sealed record MerchantVisitEventContract(
    int VisitId,
    Guid UserId,
    int MerchantId,
    short? SelectedCategoryId,
    DateTimeOffset VisitedAt,
    DateTimeOffset OccurredAt);
