using Moq;
using TrueSpend.Domain.Business.Devices;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.Models.Permissions;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.ServiceInterfaces.Devices;
using TrueSpend.Domain.Validators;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Onboarding;

public sealed class DevicesInsertBusinessTests
{
    [Fact]
    public async Task RegisterDevice_returns_device_id_on_success()
    {
        var devices = new Mock<IDevicesInsertService>();
        devices.Setup(d => d.RegisterDeviceAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<RegisterDeviceRequest>(), It.IsAny<CancellationToken>())).ReturnsAsync(101);
        var business = new DevicesInsertBusiness(devices.Object, new DevicesValidator());

        var response = await business.RegisterDeviceAsync(TestUserFactory.AnyUser(),
            new RegisterDeviceRequest("ios", null, null, null, null, null, null), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Equal(101, response.Data!.DeviceId);
        Assert.True(response.Data.Registered);
    }

    [Fact]
    public async Task RegisterDevice_rejects_missing_platform()
    {
        var devices = new Mock<IDevicesInsertService>();
        var business = new DevicesInsertBusiness(devices.Object, new DevicesValidator());

        var response = await business.RegisterDeviceAsync(TestUserFactory.AnyUser(),
            new RegisterDeviceRequest(" ", null, null, null, null, null, null), CancellationToken.None);

        Assert.False(response.Success);
        devices.Verify(d => d.RegisterDeviceAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<RegisterDeviceRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
