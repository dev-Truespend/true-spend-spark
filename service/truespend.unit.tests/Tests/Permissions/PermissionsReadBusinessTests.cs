using Moq;
using TrueSpend.Domain.Business.Permissions;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Permissions;
using TrueSpend.Domain.ServiceInterfaces.Permissions;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Permissions;

public sealed class PermissionsReadBusinessTests
{
    [Fact]
    public async Task GetPermissions_returns_response_from_service()
    {
        var permissions = new PermissionsResponse("granted", "not_determined", "denied", 5, TestUserFactory.FixedNow);
        var service = new Mock<IPermissionsReadService>();
        service.Setup(s => s.GetPermissionsAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(permissions);

        var business = new PermissionsReadBusiness(service.Object);
        var response = await business.GetPermissionsAsync(TestUserFactory.AnyUser(), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Equal(permissions, response.Data);
    }
}
