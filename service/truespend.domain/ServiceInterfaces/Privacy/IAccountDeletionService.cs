using TrueSpend.Domain.Entities.Privacy;
using TrueSpend.Domain.Models.Privacy;

namespace TrueSpend.Domain.ServiceInterfaces.Privacy;

public interface IAccountDeletionService
{
    // User-facing request lifecycle (API).
    Task<AccountDeletionRequestEntity?> GetActiveRequestAsync(Guid userId, CancellationToken cancellationToken);
    Task<AccountDeletionRequestEntity> InsertRequestAsync(Guid userId, DateTimeOffset requestedAt, DateTimeOffset purgeAfter, CancellationToken cancellationToken);

    // Purge lifecycle (worker).
    Task<IReadOnlyList<AccountPurgeCandidate>> GetDuePurgesAsync(DateTimeOffset now, int batchSize, CancellationToken cancellationToken);
    Task<bool> ReloadIsStillPendingAsync(int requestId, CancellationToken cancellationToken);
    Task PurgeUserDataAsync(Guid userId, CancellationToken cancellationToken);
    Task MarkRequestStatusAsync(int requestId, string status, string? error, DateTimeOffset now, CancellationToken cancellationToken);
    Task WriteAuditEventAsync(Guid? userId, string eventType, string? payloadJson, DateTimeOffset now, CancellationToken cancellationToken);
}
