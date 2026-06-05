using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Transactions;

namespace TrueSpend.Domain.BusinessInterfaces.Transactions;

public interface ITransactionsDeleteBusiness
{
    Task<BusinessResponse<TransactionsResponse>> DeleteTransactionAsync(OnboardingWorkflowUser user, int transactionId, CancellationToken cancellationToken);
}
