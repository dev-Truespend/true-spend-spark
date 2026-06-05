using Moq;
using TrueSpend.Domain.Business.Profile;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Profile;
using TrueSpend.Domain.ServiceInterfaces.Profile;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Profile;

public sealed class ProfileReadBusinessTests
{
    private static readonly ProfileResponse AnyProfile =
        new("Taylor", "taylor@example.com", "+15550100", "https://cdn/avatar.png", "US", "USD", "basic");

    [Fact]
    public async Task GetProfile_returns_profile_from_service()
    {
        var service = new Mock<IProfileReadService>();
        service.Setup(s => s.GetProfileAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(AnyProfile);
        var business = new ProfileReadBusiness(service.Object);

        var response = await business.GetProfileAsync(TestUserFactory.AnyUser(), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Equal(AnyProfile, response.Data);
    }
}
