namespace TrueSpend.Domain.Constants;

public static class CardsConstants
{
    public const int BasicPlanCardLimit = 3;
    public const string DefaultSyncStatus = "active";
    public const string DisconnectedSyncStatus = "disconnected";

    public static string CardsListCacheKey(Guid userId) => $"cards:list:{userId:N}";
    public static string PlaidConnectionsCacheKey(Guid userId) => $"plaid:connections:{userId:N}";
}
