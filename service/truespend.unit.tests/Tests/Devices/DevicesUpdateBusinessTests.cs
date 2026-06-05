using Moq;
using TrueSpend.Domain.Business.Devices;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.ServiceInterfaces.Devices;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Devices;

public sealed class DevicesUpdateBusinessTests
{
    [Fact]
    public async Task CleanupInvalidDeviceTokens_passes_lookback_window_to_service()
    {
        var now = new DateTimeOffset(2026, 6, 4, 4, 0, 0, TimeSpan.Zero);
        var expectedSince = now - NotificationsConstants.InvalidDeviceTokenLookback;
        var update = new Mock<IDevicesUpdateService>();
        update.Setup(s => s.DeactivateDevicesWithInvalidTokensAsync(
                expectedSince,
                NotificationsConstants.InvalidPushTokenErrorCodes,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new DeviceCleanupResult(10, 2, 3));
        var business = new DevicesUpdateBusiness(update.Object);

        var result = await business.CleanupInvalidDeviceTokensAsync(now, CancellationToken.None);

        Assert.Equal(10, result.DeliveriesScanned);
        Assert.Equal(5, result.TotalDeactivated);
        update.Verify(s => s.DeactivateDevicesWithInvalidTokensAsync(
            expectedSince,
            NotificationsConstants.InvalidPushTokenErrorCodes,
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CleanupInvalidDeviceTokens_returns_zero_counts_when_no_invalid_deliveries()
    {
        var update = new Mock<IDevicesUpdateService>();
        update.Setup(s => s.DeactivateDevicesWithInvalidTokensAsync(
                It.IsAny<DateTimeOffset>(),
                It.IsAny<IReadOnlyCollection<string>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new DeviceCleanupResult(0, 0, 0));
        var business = new DevicesUpdateBusiness(update.Object);

        var result = await business.CleanupInvalidDeviceTokensAsync(DateTimeOffset.UtcNow, CancellationToken.None);

        Assert.Equal(0, result.DeliveriesScanned);
        Assert.Equal(0, result.TotalDeactivated);
    }
}
