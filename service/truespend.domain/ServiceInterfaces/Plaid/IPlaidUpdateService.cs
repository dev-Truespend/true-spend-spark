using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Cards;

namespace TrueSpend.Domain.ServiceInterfaces.Plaid;

public interface IPlaidUpdateService
{
    Task SyncConnectionAsync(int connectionId, CancellationToken cancellationToken);
    Task<IReadOnlyList<int>> DisconnectConnectionAsync(int connectionId, CancellationToken cancellationToken);
    Task<PlaidConnectionResponse> GetConnectionStateAsync(OnboardingWorkflowUser user, int connectionId, CancellationToken cancellationToken);
    Task UpdateTransactionSyncCursorAsync(int connectionId, string? cursor, DateTimeOffset syncAt, CancellationToken cancellationToken);
}
