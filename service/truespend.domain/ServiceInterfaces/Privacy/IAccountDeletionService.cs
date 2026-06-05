using TrueSpend.Domain.Models.Privacy;

namespace TrueSpend.Domain.ServiceInterfaces.Privacy;

public interface IAccountDeletionService
{
    Task<IReadOnlyList<AccountPurgeCandidate>> GetDuePurgesAsync(DateTimeOffset now, int batchSize, CancellationToken cancellationToken);
    Task<bool> ReloadIsStillPendingAsync(int requestId, CancellationToken cancellationToken);
    Task PurgeUserDataAsync(Guid userId, CancellationToken cancellationToken);
    Task MarkRequestStatusAsync(int requestId, string status, string? error, DateTimeOffset now, CancellationToken cancellationToken);
    Task WriteAuditEventAsync(Guid? userId, string eventType, string? payloadJson, DateTimeOffset now, CancellationToken cancellationToken);
}
