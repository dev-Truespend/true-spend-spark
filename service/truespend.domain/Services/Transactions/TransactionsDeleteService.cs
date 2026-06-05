using TrueSpend.Domain.ServiceInterfaces.Transactions;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Models.Onboarding;
using Microsoft.EntityFrameworkCore;

namespace TrueSpend.Domain.Services.Transactions;

public sealed class TransactionsDeleteService(TrueSpendDbContext db) : ITransactionsDeleteService
{
    public async Task<bool> DeleteTransactionAsync(
        OnboardingWorkflowUser user,
        int transactionId,
        CancellationToken cancellationToken)
    {
        var entity = await db.Transactions
            .FirstOrDefaultAsync(x => x.Id == transactionId && x.UserId == user.UserId, cancellationToken);
        if (entity is null) return false;

        db.Transactions.Remove(entity);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }
}
