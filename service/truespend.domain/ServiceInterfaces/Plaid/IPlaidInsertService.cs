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

public interface IPlaidInsertService
{
    // Creates the plaid_items row + one plaid_accounts row per discovered account. Does NOT create
    // user_cards — the business decides per account whether to adopt an existing manual card or
    // insert a new one (see PlaidInsertBusiness).
    Task<PlaidPersistResult> PersistPlaidConnectionAsync(
        OnboardingWorkflowUser user,
        PlaidExchangeResult exchange,
        CancellationToken cancellationToken);

    // Inserts a new plaid-sourced user_card for a persisted Plaid account.
    Task InsertPlaidUserCardAsync(
        OnboardingWorkflowUser user,
        int plaidAccountRowId,
        string accountName,
        string? mask,
        int? cardProductId,
        CancellationToken cancellationToken);

    Task<PlaidConnectionResponse> GetCurrentStateAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken);
}

public sealed record PlaidPersistResult(int PlaidItemId, string InstitutionName, IReadOnlyList<PlaidPersistedAccount> Accounts);

public sealed record PlaidPersistedAccount(int PlaidAccountRowId, string AccountName, string? Mask);
