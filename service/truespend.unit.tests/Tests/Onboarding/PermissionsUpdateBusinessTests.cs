using Moq;
using TrueSpend.Domain.Business.Permissions;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.Models.Permissions;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.ServiceInterfaces.Onboarding;
using TrueSpend.Domain.ServiceInterfaces.Permissions;
using TrueSpend.Domain.ServiceInterfaces.Persistence;
using TrueSpend.Domain.Validators;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Onboarding;

public sealed class PermissionsUpdateBusinessTests
{
    private static OnboardingWorkflowUser User => TestUserFactory.AnyUser();

    [Fact]
    public async Task UpdatePermissions_persists_and_advances_to_plan_selection()
    {
        var permissionsRead = new Mock<IPermissionsReadService>();
        permissionsRead.Setup(r => r.GetPermissionsAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PermissionsResponse("unknown", "unknown", "unknown", null, TestUserFactory.FixedNow));
        var permissionsUpdate = new Mock<IPermissionsUpdateService>();
        permissionsUpdate.Setup(u => u.EnsureDeviceIdAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<int?>(), It.IsAny<CancellationToken>())).ReturnsAsync(42);
        permissionsUpdate.Setup(u => u.SavePermissionsAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<PermissionsResponse>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OnboardingWorkflowUser _, PermissionsResponse value, CancellationToken _) => value);
        var onboardingRead = new Mock<IOnboardingReadService>();
        onboardingRead.Setup(r => r.GetOnboardingAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new OnboardingResponse("location_permission", true, false, false, false));
        var onboardingUpdate = new Mock<IOnboardingUpdateService>();
        onboardingUpdate.Setup(u => u.SaveOnboardingAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<OnboardingResponse>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OnboardingWorkflowUser _, OnboardingResponse value, CancellationToken _) => value);
        var tx = new Mock<IUnitOfWorkTransaction>();
        tx.Setup(t => t.CommitAsync(It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        tx.Setup(t => t.DisposeAsync()).Returns(ValueTask.CompletedTask);
        var uow = new Mock<IUnitOfWork>();
        uow.Setup(u => u.BeginTransactionAsync(It.IsAny<CancellationToken>())).ReturnsAsync(tx.Object);
        var business = new PermissionsUpdateBusiness(permissionsRead.Object, permissionsUpdate.Object, onboardingRead.Object, onboardingUpdate.Object, uow.Object, new PermissionsValidator());

        var response = await business.UpdatePermissionsAsync(User, new UpdatePermissionsRequest(null, "ios", new PermissionInput("granted", null), null, null, null), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Equal("granted", response.Data!.Location);
        Assert.Equal(42, response.Data.DeviceId);
        onboardingUpdate.Verify(u => u.SaveOnboardingAsync(
            It.IsAny<OnboardingWorkflowUser>(),
            It.Is<OnboardingResponse>(o => o.CurrentStepCode == "plan_selection"),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task UpdatePermissions_rejects_missing_platform()
    {
        var permissionsRead = new Mock<IPermissionsReadService>();
        var permissionsUpdate = new Mock<IPermissionsUpdateService>();
        var onboardingRead = new Mock<IOnboardingReadService>();
        var onboardingUpdate = new Mock<IOnboardingUpdateService>();
        var uow = new Mock<IUnitOfWork>();
        var business = new PermissionsUpdateBusiness(permissionsRead.Object, permissionsUpdate.Object, onboardingRead.Object, onboardingUpdate.Object, uow.Object, new PermissionsValidator());

        var response = await business.UpdatePermissionsAsync(User, new UpdatePermissionsRequest(null, " ", null, null, null, null), CancellationToken.None);

        Assert.False(response.Success);
        permissionsUpdate.Verify(u => u.SavePermissionsAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<PermissionsResponse>(), It.IsAny<CancellationToken>()), Times.Never);
        onboardingUpdate.Verify(u => u.SaveOnboardingAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<OnboardingResponse>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
