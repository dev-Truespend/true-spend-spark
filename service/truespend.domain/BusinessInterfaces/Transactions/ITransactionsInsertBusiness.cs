using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Transactions;

namespace TrueSpend.Domain.BusinessInterfaces.Transactions;

public interface ITransactionsInsertBusiness
{
    Task<BusinessResponse<TransactionDetailResponse>> CreateTransactionAsync(OnboardingWorkflowUser user, CreateTransactionRequest request, CancellationToken cancellationToken);
}
