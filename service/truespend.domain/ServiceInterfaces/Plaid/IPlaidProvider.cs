using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.Models.Permissions;
using TrueSpend.Domain.Models.Common;

namespace TrueSpend.Domain.ServiceInterfaces.Plaid;

public interface IPlaidProvider
{
    Task<PlaidLinkTokenResponse> CreateLinkTokenAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken);
    Task<PlaidExchangeResult> ExchangePublicTokenAsync(string publicToken, CancellationToken cancellationToken);
    Task<PlaidTransactionsSyncResult> SyncTransactionsAsync(string accessToken, string? cursor, bool force, CancellationToken cancellationToken);
    Task<IReadOnlyList<PlaidInstitutionData>> GetInstitutionsAsync(IReadOnlyCollection<string> countryCodes, IReadOnlyCollection<string> products, int pageSize, CancellationToken cancellationToken);
}

public sealed record PlaidExchangeResult(
    string ItemId,
    string AccessToken,
    string InstitutionId,
    string InstitutionName,
    string? InstitutionLogoUrl,
    IReadOnlyList<PlaidAccountInfo> Accounts);

public sealed record PlaidAccountInfo(
    string AccountId,
    string Name,
    string Subtype,
    string? Mask);
