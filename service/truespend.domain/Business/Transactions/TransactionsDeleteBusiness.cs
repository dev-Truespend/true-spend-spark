using Microsoft.Extensions.Logging;
using TrueSpend.Domain.BusinessInterfaces.Analytics;
using TrueSpend.Domain.BusinessInterfaces.Transactions;
using TrueSpend.Domain.Models.Transactions;
using TrueSpend.Domain.ServiceInterfaces.Transactions;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Persistence;

namespace TrueSpend.Domain.Business.Transactions;

public sealed class TransactionsDeleteBusiness(
    ITransactionsDeleteService deleteService,
    ITransactionsReadService readService,
    IMessagingInsertService messagingInsertService, // archived: kept for future async migration
    IUnitOfWork unitOfWork,
    IAnalyticsComputeBusiness analyticsCompute,
    ILogger<TransactionsDeleteBusiness> logger) : ITransactionsDeleteBusiness
{
    public async Task<BusinessResponse<TransactionsResponse>> DeleteTransactionAsync(
        OnboardingWorkflowUser user,
        int transactionId,
        CancellationToken cancellationToken)
    {
        _ = messagingInsertService;

        var existing = await readService.GetTransactionDetailAsync(user, transactionId, cancellationToken);
        if (existing is null) return BusinessResponse<TransactionsResponse>.Fail(["Transaction not found."], 404);

        await using (var tx = await unitOfWork.BeginTransactionAsync(cancellationToken))
        {
            await deleteService.DeleteTransactionAsync(user, transactionId, cancellationToken);
            await tx.CommitAsync(cancellationToken);
        }

        try
        {
            await analyticsCompute.RecomputeSnapshotsAsync(user.UserId, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Analytics recompute failed after transaction delete for user {UserId} txn {TransactionId}", user.UserId, transactionId);
        }

        var remaining = await readService.GetTransactionsAsync(user, new TransactionListQuery(null, null, null), cancellationToken);
        return BusinessResponse<TransactionsResponse>.Ok(new TransactionsResponse(remaining, remaining.Count == 0));
    }

    #region archive — async event-publish (disabled in MVP)
    // DeleteTransactionAsync previously published TransactionDeleted to the messaging outbox.
    // Consumer: AnalyticsRecomputeHandler → IAnalyticsComputeBusiness.RecomputeSnapshotsAsync(userId).
    // Now called inline post-commit.
    //
    // using System.Text.Json;
    // using TrueSpend.Domain.Constants;
    // using TrueSpend.Domain.Events.Transactions;
    //
    // // Inside the committing tx, after DeleteTransactionAsync:
    // var payload = JsonSerializer.Serialize(new TransactionDeletedEvent(transactionId, user.UserId));
    // await messagingInsertService.EnqueueOutboxEventAsync(
    //     EventTypes.TransactionDeleted, "finance.transaction", transactionId,
    //     payload, $"transaction.deleted:{transactionId}", cancellationToken);
    #endregion
}
