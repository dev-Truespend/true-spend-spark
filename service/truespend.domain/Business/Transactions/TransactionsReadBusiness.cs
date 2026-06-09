using TrueSpend.Domain.BusinessInterfaces.Billing;
using TrueSpend.Domain.BusinessInterfaces.Transactions;
using TrueSpend.Domain.Models.Transactions;
using TrueSpend.Domain.ServiceInterfaces.Transactions;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;

namespace TrueSpend.Domain.Business.Transactions;

public sealed class TransactionsReadBusiness(
    ITransactionsReadService readService,
    IBillingReadBusiness billingReadBusiness) : ITransactionsReadBusiness
{
    private const string PlaidSourceCode = "plaid";

    public async Task<BusinessResponse<TransactionsResponse>> GetTransactionsAsync(
        OnboardingWorkflowUser user,
        TransactionListQuery query,
        CancellationToken cancellationToken)
    {
        var transactions = await readService.GetTransactionsAsync(user, query, cancellationToken);
        if (!await PlaidViewEnabledAsync(user, cancellationToken))
        {
            transactions = transactions.Where(t => !string.Equals(t.Source, PlaidSourceCode, StringComparison.OrdinalIgnoreCase)).ToList();
        }
        return BusinessResponse<TransactionsResponse>.Ok(new TransactionsResponse(transactions, transactions.Count == 0));
    }

    public async Task<BusinessResponse<TransactionDetailResponse>> GetTransactionDetailAsync(
        OnboardingWorkflowUser user,
        int transactionId,
        CancellationToken cancellationToken)
    {
        var detail = await readService.GetTransactionDetailAsync(user, transactionId, cancellationToken);
        if (detail is null) return BusinessResponse<TransactionDetailResponse>.Fail(["Transaction not found."], 404);

        if (string.Equals(detail.Source, PlaidSourceCode, StringComparison.OrdinalIgnoreCase)
            && !await PlaidViewEnabledAsync(user, cancellationToken))
        {
            return BusinessResponse<TransactionDetailResponse>.Fail(["Transaction not found."], 404);
        }

        var reward = await readService.GetRewardResultAsync(transactionId, cancellationToken);
        var missed = await readService.GetMissedRewardAsync(user, transactionId, cancellationToken);
        return BusinessResponse<TransactionDetailResponse>.Ok(new TransactionDetailResponse(detail, reward, missed));
    }

    private async Task<bool> PlaidViewEnabledAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken)
    {
        var entitlements = await billingReadBusiness.GetEntitlementsAsync(user, cancellationToken);
        return entitlements.Data?.PlaidTransactionsViewEnabled ?? false;
    }

    public async Task<BusinessResponse<TransactionRewardResultResponse>> GetRewardResultAsync(
        OnboardingWorkflowUser user,
        int transactionId,
        CancellationToken cancellationToken)
    {
        var detail = await readService.GetTransactionDetailAsync(user, transactionId, cancellationToken);
        if (detail is null) return BusinessResponse<TransactionRewardResultResponse>.Fail(["Transaction not found."], 404);

        var reward = await readService.GetRewardResultAsync(transactionId, cancellationToken);
        var missed = await readService.GetMissedRewardAsync(user, transactionId, cancellationToken);
        return BusinessResponse<TransactionRewardResultResponse>.Ok(new TransactionRewardResultResponse(reward, missed));
    }

    public async Task<BusinessResponse<MissedRewardEventsResponse>> GetMissedRewardsAsync(
        OnboardingWorkflowUser user,
        CancellationToken cancellationToken)
    {
        var missed = await readService.GetMissedRewardsAsync(user, cancellationToken);
        return BusinessResponse<MissedRewardEventsResponse>.Ok(new MissedRewardEventsResponse(missed));
    }

    public async Task<BusinessResponse<TransactionCategoriesResponse>> GetCategoriesAsync(CancellationToken cancellationToken)
    {
        var categories = await readService.GetTransactionCategoriesAsync(cancellationToken);
        return BusinessResponse<TransactionCategoriesResponse>.Ok(new TransactionCategoriesResponse(categories));
    }
}
