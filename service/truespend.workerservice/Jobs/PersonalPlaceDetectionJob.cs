using TrueSpend.Domain.BusinessInterfaces.Geo;

namespace TrueSpend.WorkerService.Jobs;

// Periodically re-derives each user's recurring dwell zones (home/work) from clustered location history.
// The arrival handler reads finance.personal_places to suppress best-card pushes while the user is at a
// personal place near stores. Idempotent — safe to re-run; it upserts and caps zones per user.
public sealed class PersonalPlaceDetectionJob(IPersonalPlaceDetectionBusiness business)
{
    public Task RunAsync(CancellationToken cancellationToken) =>
        business.DetectAllAsync(DateTimeOffset.UtcNow, cancellationToken);
}
