namespace TrueSpend.Domain.Events.Insights;

public sealed record AIGenerationCompletedEventContract(
    int RunId,
    Guid UserId,
    int InsightsCreated,
    string PayloadVersion = "1");
