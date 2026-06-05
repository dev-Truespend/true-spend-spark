using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.Models.Permissions;
using TrueSpend.Domain.Models.Common;

namespace TrueSpend.Domain.Validators;

public sealed class PlaidValidator
{
    public IReadOnlyList<string> ValidateExchangePlaidToken(ExchangePlaidTokenRequest request) =>
        string.IsNullOrWhiteSpace(request.PublicToken) ? ["Plaid public token is required."] : [];

    public IReadOnlyList<string> ValidateSyncTransactions(Models.Transactions.SyncPlaidTransactionsRequest request) =>
        request.ConnectionId is int id && id <= 0 ? ["A valid Plaid connection is required."] : [];
}
