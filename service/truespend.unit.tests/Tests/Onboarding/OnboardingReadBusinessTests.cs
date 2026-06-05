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
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Onboarding;

public sealed class OnboardingReadBusinessTests
{
    [Fact]
    public async Task GetOnboarding_returns_current_state_for_user()
    {
        var expected = new OnboardingResponse("plan_selection", true, false, false, false);
        var read = new Mock<IOnboardingReadService>();
        read.Setup(r => r.GetOnboardingAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>())).ReturnsAsync(expected);

        var business = new OnboardingReadBusiness(read.Object);
        var response = await business.GetOnboardingAsync(TestUserFactory.AnyUser(), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Equal(expected, response.Data);
    }
}
