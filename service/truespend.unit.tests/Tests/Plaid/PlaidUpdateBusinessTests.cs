using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using TrueSpend.Domain.Business.Plaid;
using TrueSpend.Domain.BusinessInterfaces.Billing;
using TrueSpend.Domain.Exceptions;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Persistence;
using TrueSpend.Domain.ServiceInterfaces.Plaid;
using TrueSpend.Domain.ServiceInterfaces.Recommendations;
using TrueSpend.Domain.ServiceInterfaces.Transactions;
using TrueSpend.Domain.Validators;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Plaid;

public sealed class PlaidUpdateBusinessTests
{
    private static readonly PlaidConnection AnyConnection =
        new(1, "Chase", null, "active", null, 2);

    private static readonly PlaidConnectionResponse AnyConnectionResponse =
        new([AnyConnection], [], "active");

    private static PlaidUpdateBusiness Build(
        Mock<IPlaidProvider> plaidProvider,
        Mock<IPlaidReadService> readService,
        Mock<IPlaidUpdateService> updateService)
    {
        var tx = new Mock<IUnitOfWorkTransaction>();
        tx.Setup(t => t.CommitAsync(It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        tx.Setup(t => t.DisposeAsync()).Returns(ValueTask.CompletedTask);

        var uow = new Mock<IUnitOfWork>();
        uow.Setup(u => u.BeginTransactionAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(tx.Object);

        var messaging = new Mock<IMessagingInsertService>();
        messaging.Setup(m => m.EnqueueOutboxEventAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int?>(),
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var guard = new Mock<IEntitlementGuard>();
        guard.Setup(g => g.RequireFeatureAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        return new PlaidUpdateBusiness(
            plaidProvider.Object,
            readService.Object,
            updateService.Object,
            new Mock<ITransactionsInsertService>().Object,
            new Mock<ITransactionsUpdateService>().Object,
            new Mock<IRewardRulesReadService>().Object,
            messaging.Object,
            uow.Object,
            guard.Object,
            new PlaidValidator(),
            NullLogger<PlaidUpdateBusiness>.Instance);
    }

    [Fact]
    public async Task SyncConnection_returns_updated_state_on_success()
    {
        var user = TestUserFactory.AnyUser();
        var readSvc = new Mock<IPlaidReadService>();
        var updateSvc = new Mock<IPlaidUpdateService>();

        readSvc.Setup(s => s.FindConnectionAsync(user, 1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(AnyConnection);
        updateSvc.Setup(s => s.SyncConnectionAsync(1, It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        updateSvc.Setup(s => s.GetConnectionStateAsync(user, 1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(AnyConnectionResponse);

        var business = Build(new Mock<IPlaidProvider>(), readSvc, updateSvc);
        var response = await business.SyncConnectionAsync(user, new SyncPlaidConnectionRequest(1), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Single(response.Data!.Connections);
    }

    [Fact]
    public async Task SyncConnection_fails_with_404_when_connection_not_found()
    {
        var readSvc = new Mock<IPlaidReadService>();
        readSvc.Setup(s => s.FindConnectionAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((PlaidConnection?)null);

        var business = Build(new Mock<IPlaidProvider>(), readSvc, new Mock<IPlaidUpdateService>());
        var response = await business.SyncConnectionAsync(
            TestUserFactory.AnyUser(), new SyncPlaidConnectionRequest(99), CancellationToken.None);

        Assert.False(response.Success);
        Assert.Equal(404, response.StatusCode);
    }

    [Fact]
    public async Task ReconnectConnection_returns_link_token_on_success()
    {
        var user = TestUserFactory.AnyUser();
        var readSvc = new Mock<IPlaidReadService>();
        var provider = new Mock<IPlaidProvider>();

        readSvc.Setup(s => s.FindConnectionAsync(user, 1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(AnyConnection);
        provider.Setup(p => p.CreateLinkTokenAsync(user, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PlaidLinkTokenResponse("link-token-abc", DateTimeOffset.UtcNow.AddHours(4)));

        var business = Build(provider, readSvc, new Mock<IPlaidUpdateService>());
        var response = await business.ReconnectConnectionAsync(user, new ReconnectPlaidConnectionRequest(1), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Equal("link-token-abc", response.Data!.LinkToken);
    }

    [Fact]
    public async Task ReconnectConnection_fails_with_503_when_plaid_provider_throws()
    {
        var user = TestUserFactory.AnyUser();
        var readSvc = new Mock<IPlaidReadService>();
        var provider = new Mock<IPlaidProvider>();

        readSvc.Setup(s => s.FindConnectionAsync(user, 1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(AnyConnection);
        provider.Setup(p => p.CreateLinkTokenAsync(user, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ExternalProviderAppException("plaid", "Plaid unavailable."));

        var business = Build(provider, readSvc, new Mock<IPlaidUpdateService>());
        var response = await business.ReconnectConnectionAsync(user, new ReconnectPlaidConnectionRequest(1), CancellationToken.None);

        Assert.False(response.Success);
        Assert.Equal(503, response.StatusCode);
    }

    [Fact]
    public async Task DisconnectConnection_returns_updated_state_on_success()
    {
        var user = TestUserFactory.AnyUser();
        var readSvc = new Mock<IPlaidReadService>();
        var updateSvc = new Mock<IPlaidUpdateService>();

        readSvc.Setup(s => s.FindConnectionAsync(user, 1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(AnyConnection);
        updateSvc.Setup(s => s.DisconnectConnectionAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<int>)new List<int>());
        updateSvc.Setup(s => s.GetConnectionStateAsync(user, 1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(AnyConnectionResponse);

        var business = Build(new Mock<IPlaidProvider>(), readSvc, updateSvc);
        var response = await business.DisconnectConnectionAsync(user, new DisconnectPlaidConnectionRequest(1), CancellationToken.None);

        Assert.True(response.Success);
    }
}
