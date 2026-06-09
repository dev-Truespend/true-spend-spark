using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using TrueSpend.Domain.Business.Plaid;
using TrueSpend.Domain.BusinessInterfaces.Analytics;
using TrueSpend.Domain.BusinessInterfaces.Billing;
using TrueSpend.Domain.BusinessInterfaces.Notifications;
using TrueSpend.Domain.Exceptions;
using TrueSpend.Domain.Models.Billing;
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
        Mock<IPlaidUpdateService> updateService,
        Mock<IEntitlementGuard>? guard = null)
    {
        var tx = new Mock<IUnitOfWorkTransaction>();
        tx.Setup(t => t.CommitAsync(It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        tx.Setup(t => t.DisposeAsync()).Returns(ValueTask.CompletedTask);

        var uow = new Mock<IUnitOfWork>();
        uow.Setup(u => u.BeginTransactionAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(tx.Object);

        var messaging = new Mock<IMessagingInsertService>(); // archived: kept for future async migration

        if (guard is null)
        {
            guard = new Mock<IEntitlementGuard>();
            guard.Setup(g => g.RequireFeatureAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);
            guard.Setup(g => g.HasFeatureAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(true);
        }

        var analytics = new Mock<IAnalyticsComputeBusiness>();
        var missedRewardNotif = new Mock<IMissedRewardNotificationBusiness>();

        var resyncQuota = new Mock<IManualResyncQuotaBusiness>();
        resyncQuota.Setup(q => q.TryConsumeAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ManualResyncConsumeResult(true, new ManualResyncQuotaStatus(true, 5, 1, 4)));

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
            resyncQuota.Object,
            analytics.Object,
            missedRewardNotif.Object,
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

    [Fact]
    public async Task SyncAllActiveConnections_skips_users_without_plaid_entitlement()
    {
        var readSvc = new Mock<IPlaidReadService>();
        readSvc.Setup(s => s.GetActiveConnectionsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<PlaidActiveConnection>)new List<PlaidActiveConnection>
            {
                new(1, Guid.NewGuid(), "free@example.com")
            });

        var guard = new Mock<IEntitlementGuard>();
        guard.Setup(g => g.HasFeatureAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var business = Build(new Mock<IPlaidProvider>(), readSvc, new Mock<IPlaidUpdateService>(), guard);
        await business.SyncAllActiveConnectionsAsync(CancellationToken.None);

        // Not entitled -> the per-connection sync path is never entered.
        readSvc.Verify(s => s.FindConnectionAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    #region archive — async event-publish (disabled in MVP)
    // The original tests did not directly Setup/Verify EnqueueOutboxEventAsync — they passed a
    // pre-configured Setup on the messaging mock and let the business class emit events into a
    // black hole. With the conversion, the live tests no longer assert outbox events; the
    // analytics and missed-reward inline collaborators are exercised by the broader test suite
    // and by the Build() factory's default mock instances, which silently accept calls.
    #endregion
}
