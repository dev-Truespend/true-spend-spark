using TrueSpend.Domain.Models.Privacy;

namespace TrueSpend.Domain.BusinessInterfaces.Privacy;

public interface IAccountDeletionPurgeBusiness
{
    Task<AccountDeletionPurgeResult> PurgeDueAccountsAsync(
        DateTimeOffset now,
        int batchSize = 50,
        CancellationToken cancellationToken = default);
}
