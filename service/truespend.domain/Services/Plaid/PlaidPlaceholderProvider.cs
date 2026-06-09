using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.ServiceInterfaces.Plaid;
using TrueSpend.Domain.Models.Onboarding;

namespace TrueSpend.Domain.Services.Plaid;

public sealed class PlaidPlaceholderProvider : IPlaidProvider
{
    private const string StubInstitutionId = "ins_placeholder_chase";
    private const string StubInstitutionName = "Chase (Placeholder)";

    public Task<PlaidLinkTokenResponse> CreateLinkTokenAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken) =>
        Task.FromResult(new PlaidLinkTokenResponse(
            $"link-sandbox-placeholder-{user.UserId:N}",
            DateTimeOffset.UtcNow.AddHours(4)));

    public Task<PlaidExchangeResult> ExchangePublicTokenAsync(string publicToken, CancellationToken cancellationToken) =>
        Task.FromResult(new PlaidExchangeResult(
            ItemId: $"item-placeholder-{Guid.NewGuid():N}",
            AccessToken: $"access-sandbox-placeholder-{Guid.NewGuid():N}",
            InstitutionId: StubInstitutionId,
            InstitutionName: StubInstitutionName,
            InstitutionLogoUrl: null,
            Accounts: new[]
            {
                new PlaidAccountInfo("acct-placeholder-1", "Sapphire Preferred", "credit card", "1234"),
                new PlaidAccountInfo("acct-placeholder-2", "Freedom Unlimited", "credit card", "5678")
            }));

    public Task<PlaidTransactionsSyncResult> SyncTransactionsAsync(string accessToken, string? cursor, bool force, CancellationToken cancellationToken) =>
        Task.FromResult(new PlaidTransactionsSyncResult(
            Added:
            [
                new("txn-placeholder-1", "acct-placeholder-1", "Amazon", 42.99m, DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1)), false, "Amazon",
                    "GENERAL_MERCHANDISE", "GENERAL_MERCHANDISE_ONLINE_MARKETPLACES", "HIGH"),
                new("txn-placeholder-2", "acct-placeholder-1", "Whole Foods", 87.50m, DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-2)), false, "Whole Foods Market",
                    "FOOD_AND_DRINK", "FOOD_AND_DRINK_GROCERIES", "HIGH")
            ],
            Modified: [],
            RemovedPlaidTransactionIds: [],
            NewCursor: $"cursor-placeholder-{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}",
            SyncAt: DateTimeOffset.UtcNow));

    public Task<IReadOnlyList<PlaidInstitutionData>> GetInstitutionsAsync(
        IReadOnlyCollection<string> countryCodes,
        IReadOnlyCollection<string> products,
        int pageSize,
        CancellationToken cancellationToken)
    {
        IReadOnlyList<PlaidInstitutionData> stubs = new[]
        {
            new PlaidInstitutionData("ins_3", "Chase", "US", null, "#117ACA", "https://chase.com", true,
                new[] { "transactions", "auth" }, Array.Empty<string>()),
            new PlaidInstitutionData("ins_4", "Wells Fargo", "US", null, "#D71E28", "https://wellsfargo.com", true,
                new[] { "transactions", "auth" }, Array.Empty<string>()),
            new PlaidInstitutionData("ins_5", "Bank of America", "US", null, "#012169", "https://bankofamerica.com", true,
                new[] { "transactions", "auth" }, Array.Empty<string>()),
            new PlaidInstitutionData("ins_6", "Citi", "US", null, "#003B70", "https://citi.com", true,
                new[] { "transactions", "auth" }, Array.Empty<string>()),
            new PlaidInstitutionData("ins_7", "Capital One", "US", null, "#003A6F", "https://capitalone.com", true,
                new[] { "transactions", "auth" }, Array.Empty<string>()),
            new PlaidInstitutionData("ins_8", "American Express", "US", null, "#006FCF", "https://americanexpress.com", false,
                new[] { "transactions" }, Array.Empty<string>()),
        };
        return Task.FromResult(stubs);
    }
}
