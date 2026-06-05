using TrueSpend.Domain.Models.Onboarding;

namespace TrueSpend.Domain.ServiceInterfaces.Transactions;

public interface ITransactionsDeleteService
{
    Task<bool> DeleteTransactionAsync(OnboardingWorkflowUser user, int transactionId, CancellationToken cancellationToken);
}
