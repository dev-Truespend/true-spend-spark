using TrueSpend.Domain.BusinessInterfaces.Devices;

namespace TrueSpend.WorkerService.Jobs;

public sealed class InvalidDeviceTokenCleanupJob(IDevicesUpdateBusiness business)
{
    public Task RunAsync(CancellationToken cancellationToken) =>
        business.CleanupInvalidDeviceTokensAsync(DateTimeOffset.UtcNow, cancellationToken);
}
