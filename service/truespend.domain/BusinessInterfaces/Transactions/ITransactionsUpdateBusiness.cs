using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Transactions;

namespace TrueSpend.Domain.BusinessInterfaces.Transactions;

public interface ITransactionsUpdateBusiness
{
    Task<BusinessResponse<TransactionDetailResponse>> UpdateTransactionAsync(OnboardingWorkflowUser user, int transactionId, UpdateTransactionRequest request, CancellationToken cancellationToken);
    Task<BusinessResponse<TransactionDetailResponse>> MarkNotAMissAsync(OnboardingWorkflowUser user, int missedRewardId, CancellationToken cancellationToken);
}
