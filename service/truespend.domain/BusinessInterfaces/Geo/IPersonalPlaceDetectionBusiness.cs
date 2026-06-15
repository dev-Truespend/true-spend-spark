namespace TrueSpend.Domain.BusinessInterfaces.Geo;

// Offline detection of recurring dwell zones (home/work) from clustered location history. Run on a
// schedule by the worker; populates finance.personal_places, which the arrival handler reads to suppress
// pushes while the user is at a personal place. Returns the number of zones upserted.
public interface IPersonalPlaceDetectionBusiness
{
    Task<int> DetectForUserAsync(Guid userId, DateTimeOffset now, CancellationToken cancellationToken);

    Task<int> DetectAllAsync(DateTimeOffset now, CancellationToken cancellationToken);
}
