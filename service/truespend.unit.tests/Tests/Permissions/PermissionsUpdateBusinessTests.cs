using Moq;
using TrueSpend.Domain.Business.Permissions;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Permissions;
using TrueSpend.Domain.ServiceInterfaces.Onboarding;
using TrueSpend.Domain.ServiceInterfaces.Permissions;
using TrueSpend.Domain.Validators;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Permissions;

public sealed class PermissionsUpdateBusinessTests
{
    private static (
        PermissionsUpdateBusiness Business,
        Mock<IPermissionsReadService> Read,
        Mock<IPermissionsUpdateService> Update,
        Mock<IOnboardingReadService> OnboardingRead,
        Mock<IOnboardingUpdateService> OnboardingUpdate) Sut(OnboardingResponse onboarding)
    {
        var read = new Mock<IPermissionsReadService>();
        var update = new Mock<IPermissionsUpdateService>();
        var onbRead = new Mock<IOnboardingReadService>();
        var onbUpdate = new Mock<IOnboardingUpdateService>();

        read.Setup(s => s.GetPermissionsAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PermissionsResponse("unknown", "unknown", "unknown", 0, TestUserFactory.FixedNow));
        update.Setup(s => s.EnsureDeviceIdAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(7);
        update.Setup(s => s.SavePermissionsAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<PermissionsResponse>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OnboardingWorkflowUser _, PermissionsResponse p, CancellationToken _) => p);
        onbRead.Setup(s => s.GetOnboardingAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(onboarding);

        var business = new PermissionsUpdateBusiness(read.Object, update.Object, onbRead.Object, onbUpdate.Object, new FakeUnitOfWork(), new PermissionsValidator());
        return (business, read, update, onbRead, onbUpdate);
    }

    private static UpdatePermissionsRequest Request() =>
        new(1, "ios", new PermissionInput("granted", null), null, null, null);

    [Fact]
    public async Task Advances_onboarding_when_current_step_is_location_permission()
    {
        var (business, _, _, _, onbUpdate) = Sut(new OnboardingResponse("location_permission", false, false, false, false));

        var response = await business.UpdatePermissionsAsync(TestUserFactory.AnyUser(), Request(), CancellationToken.None);

        Assert.True(response.Success);
        onbUpdate.Verify(s => s.SaveOnboardingAsync(
            It.IsAny<OnboardingWorkflowUser>(),
            It.Is<OnboardingResponse>(o => o.CurrentStepCode == "plan_selection"),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Does_not_advance_onboarding_outside_location_permission_step()
    {
        var (business, _, _, _, onbUpdate) = Sut(new OnboardingResponse("plan_selection", true, false, false, false));

        var response = await business.UpdatePermissionsAsync(TestUserFactory.AnyUser(), Request(), CancellationToken.None);

        Assert.True(response.Success);
        onbUpdate.Verify(s => s.SaveOnboardingAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<OnboardingResponse>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Does_not_advance_onboarding_when_already_completed()
    {
        var (business, _, _, _, onbUpdate) = Sut(new OnboardingResponse("complete", true, false, false, true));

        var response = await business.UpdatePermissionsAsync(TestUserFactory.AnyUser(), Request(), CancellationToken.None);

        Assert.True(response.Success);
        onbUpdate.Verify(s => s.SaveOnboardingAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<OnboardingResponse>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Returns_validation_error_when_platform_missing()
    {
        var (business, _, _, _, onbUpdate) = Sut(new OnboardingResponse("location_permission", false, false, false, false));
        var invalid = new UpdatePermissionsRequest(1, null!, new PermissionInput("granted", null), null, null, null);

        var response = await business.UpdatePermissionsAsync(TestUserFactory.AnyUser(), invalid, CancellationToken.None);

        Assert.False(response.Success);
        Assert.Equal(400, response.StatusCode);
        onbUpdate.Verify(s => s.SaveOnboardingAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<OnboardingResponse>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
