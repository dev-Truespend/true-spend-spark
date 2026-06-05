using Moq;
using TrueSpend.Domain.Business.Plaid;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.ServiceInterfaces.Plaid;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Plaid;

public sealed class PlaidReadBusinessTests
{
    private static readonly PlaidConnectionsResponse AnyConnections =
        new([new PlaidConnection(1, "Chase", null, "active", null, 2)]);

    [Fact]
    public async Task GetConnections_returns_all_connections()
    {
        var service = new Mock<IPlaidReadService>();
        service.Setup(s => s.GetConnectionsAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(AnyConnections);

        var business = new PlaidReadBusiness(service.Object);
        var response = await business.GetConnectionsAsync(TestUserFactory.AnyUser(), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Single(response.Data!.Connections);
    }

    [Fact]
    public async Task GetConnections_returns_empty_list_when_no_connections()
    {
        var service = new Mock<IPlaidReadService>();
        service.Setup(s => s.GetConnectionsAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PlaidConnectionsResponse([]));

        var business = new PlaidReadBusiness(service.Object);
        var response = await business.GetConnectionsAsync(TestUserFactory.AnyUser(), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Empty(response.Data!.Connections);
    }
}
