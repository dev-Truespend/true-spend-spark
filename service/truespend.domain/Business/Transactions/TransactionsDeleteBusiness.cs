using TrueSpend.Domain.BusinessInterfaces.Transactions;
using TrueSpend.Domain.Events.Transactions;
using TrueSpend.Domain.Models.Transactions;
using TrueSpend.Domain.ServiceInterfaces.Transactions;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Persistence;
using System.Text.Json;
using TrueSpend.Domain.Constants;

namespace TrueSpend.Domain.Business.Transactions;

public sealed class TransactionsDeleteBusiness(
    ITransactionsDeleteService deleteService,
    ITransactionsReadService readService,
    IMessagingInsertService messagingInsertService,
    IUnitOfWork unitOfWork) : ITransactionsDeleteBusiness
{
    public async Task<BusinessResponse<TransactionsResponse>> DeleteTransactionAsync(
        OnboardingWorkflowUser user,
        int transactionId,
        CancellationToken cancellationToken)
    {
        var existing = await readService.GetTransactionDetailAsync(user, transactionId, cancellationToken);
        if (existing is null) return BusinessResponse<TransactionsResponse>.Fail(["Transaction not found."], 404);

        await using (var tx = await unitOfWork.BeginTransactionAsync(cancellationToken))
        {
            await deleteService.DeleteTransactionAsync(user, transactionId, cancellationToken);

            var payload = JsonSerializer.Serialize(new TransactionDeletedEvent(transactionId, user.UserId));
            await messagingInsertService.EnqueueOutboxEventAsync(
                EventTypes.TransactionDeleted,
                "finance.transaction",
                transactionId,
                payload,
                $"transaction.deleted:{transactionId}",
                cancellationToken);

            await tx.CommitAsync(cancellationToken);
        }

        var remaining = await readService.GetTransactionsAsync(user, new TransactionListQuery(null, null, null), cancellationToken);
        return BusinessResponse<TransactionsResponse>.Ok(new TransactionsResponse(remaining, remaining.Count == 0));
    }
}
