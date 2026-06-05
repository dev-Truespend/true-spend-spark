using Moq;
using TrueSpend.Domain.Business.Onboarding;
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
using TrueSpend.Domain.Validators;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Onboarding;

public sealed class OnboardingUpdateBusinessTests
{
    private static OnboardingWorkflowUser User => TestUserFactory.AnyUser();

    [Fact]
    public async Task SkipCardLinking_marks_skipped_and_advances_step()
    {
        var read = new Mock<IOnboardingReadService>();
        var update = new Mock<IOnboardingUpdateService>();
        read.Setup(r => r.GetOnboardingAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new OnboardingResponse("card_connection", false, false, false, false));
        update.Setup(u => u.SaveOnboardingAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<OnboardingResponse>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OnboardingWorkflowUser _, OnboardingResponse value, CancellationToken _) => value);

        var business = new OnboardingUpdateBusiness(read.Object, update.Object, new OnboardingValidator());

        var response = await business.SkipCardLinkingAsync(User, CancellationToken.None);

        Assert.True(response.Success);
        Assert.Equal("location_permission", response.Data!.CurrentStepCode);
        Assert.True(response.Data.CardConnectionSkipped);
    }

    [Fact]
    public async Task CompleteOnboarding_sets_completed_true()
    {
        var read = new Mock<IOnboardingReadService>();
        var update = new Mock<IOnboardingUpdateService>();
        read.Setup(r => r.GetOnboardingAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new OnboardingResponse("notifications", true, false, false, false));
        update.Setup(u => u.SaveOnboardingAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<OnboardingResponse>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OnboardingWorkflowUser _, OnboardingResponse value, CancellationToken _) => value);

        var business = new OnboardingUpdateBusiness(read.Object, update.Object, new OnboardingValidator());

        var response = await business.CompleteOnboardingAsync(User, CancellationToken.None);

        Assert.True(response.Data!.Completed);
        Assert.Equal("complete", response.Data.CurrentStepCode);
    }

    [Fact]
    public async Task UpdateOnboarding_rejects_blank_step_code()
    {
        var read = new Mock<IOnboardingReadService>();
        var update = new Mock<IOnboardingUpdateService>();
        var business = new OnboardingUpdateBusiness(read.Object, update.Object, new OnboardingValidator());

        var response = await business.UpdateOnboardingAsync(User, new UpdateOnboardingRequest(" ", false, false, false), CancellationToken.None);

        Assert.False(response.Success);
        Assert.Equal(400, response.StatusCode);
        update.Verify(u => u.SaveOnboardingAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<OnboardingResponse>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
