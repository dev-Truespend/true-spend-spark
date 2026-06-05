namespace TrueSpend.Domain.Models.Devices;

public sealed record DeviceCleanupResult(int DeliveriesScanned, int IosDeactivated, int AndroidDeactivated)
{
    public int TotalDeactivated => IosDeactivated + AndroidDeactivated;
}
