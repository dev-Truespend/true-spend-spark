using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using TrueSpend.Domain.Business.Transactions;
using TrueSpend.Domain.BusinessInterfaces.Analytics;
using TrueSpend.Domain.BusinessInterfaces.Notifications;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Recommendations;
using TrueSpend.Domain.Models.Transactions;
using TrueSpend.Domain.ServiceInterfaces.Catalog;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Recommendations;
using TrueSpend.Domain.ServiceInterfaces.Transactions;
using TrueSpend.Domain.Validators;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Transactions;

public sealed class TransactionsUpdateBusinessTests
{
    private static TransactionDetail SampleDetail(int cardId = 1) =>
        new(42, "Amazon", 100m, "USD", cardId, "My Card", "shopping", "Shopping",
            new DateOnly(2026, 1, 10), null, null, null, null, "manual", false);

    [Fact]
    public async Task UpdateTransaction_persists_changes_and_triggers_inline_recompute()
    {
        var update = new Mock<ITransactionsUpdateService>();
        var read = NewRead(SampleDetail());
        var rewards = NewRewards(cardId: 1, baseRate: 0.01m);
        var messaging = new Mock<IMessagingInsertService>(); // archived: kept for future async migration
        var analytics = new Mock<IAnalyticsComputeBusiness>();
        var missedRewardNotif = new Mock<IMissedRewardNotificationBusiness>();

        var business = NewBusiness(update, read, rewards, NewCatalog(), messaging, analytics, missedRewardNotif);
        var response = await business.UpdateTransactionAsync(TestUserFactory.AnyUser(), 42, new UpdateTransactionRequest("New Name", null, null, null, null, null, null, null, null), CancellationToken.None);

        Assert.True(response.Success);
        update.Verify(s => s.UpdateTransactionAsync(It.IsAny<OnboardingWorkflowUser>(), 42, It.IsAny<UpdateTransactionRequest>(), It.IsAny<short?>(), It.IsAny<CancellationToken>()), Times.Once);
        analytics.Verify(a => a.RecomputeSnapshotsAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task UpdateTransaction_returns_404_when_transaction_not_found()
    {
        var update = new Mock<ITransactionsUpdateService>();
        var read = new Mock<ITransactionsReadService>();
        read.Setup(r => r.GetTransactionDetailAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((TransactionDetail?)null);
        var rewards = NewRewards(cardId: 1, baseRate: 0.01m);
        var messaging = new Mock<IMessagingInsertService>();
        var analytics = new Mock<IAnalyticsComputeBusiness>();
        var missedRewardNotif = new Mock<IMissedRewardNotificationBusiness>();

        var business = NewBusiness(update, read, rewards, NewCatalog(), messaging, analytics, missedRewardNotif);
        var response = await business.UpdateTransactionAsync(TestUserFactory.AnyUser(), 99, new UpdateTransactionRequest(null, null, null, null, null, null, null, null, null), CancellationToken.None);

        Assert.False(response.Success);
        Assert.Equal(404, response.StatusCode);
        update.Verify(s => s.UpdateTransactionAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<int>(), It.IsAny<UpdateTransactionRequest>(), It.IsAny<short?>(), It.IsAny<CancellationToken>()), Times.Never);
        analytics.Verify(a => a.RecomputeSnapshotsAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task MarkNotAMiss_dismisses_and_triggers_inline_recompute()
    {
        var update = new Mock<ITransactionsUpdateService>();
        update.Setup(s => s.GetMissedRewardTransactionIdAsync(7, It.IsAny<CancellationToken>()))
            .ReturnsAsync(42);
        var missedReward = new MissedReward(7, 42, "Amazon",
            new CardSummary(1, "Card A", "Bank", null, "manual", true, "active", null),
            new CardSummary(2, "Card B", "Bank", null, "manual", false, "active", null),
            1m, 5m, 4m, true);
        var read = NewRead(SampleDetail());
        read.Setup(r => r.GetMissedRewardsAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<MissedReward> { missedReward });
        read.Setup(r => r.GetRewardResultAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TransactionRewardResult(0.01m, 1m, null, null));
        var rewards = NewRewards(cardId: 1, baseRate: 0.01m);
        var messaging = new Mock<IMessagingInsertService>();
        var analytics = new Mock<IAnalyticsComputeBusiness>();
        var missedRewardNotif = new Mock<IMissedRewardNotificationBusiness>();

        var business = NewBusiness(update, read, rewards, NewCatalog(), messaging, analytics, missedRewardNotif);
        var response = await business.MarkNotAMissAsync(TestUserFactory.AnyUser(), 7, CancellationToken.None);

        Assert.True(response.Success);
        update.Verify(s => s.DismissMissedRewardAsync(7, It.IsAny<CancellationToken>()), Times.Once);
        analytics.Verify(a => a.RecomputeSnapshotsAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    private static TransactionsUpdateBusiness NewBusiness(
        Mock<ITransactionsUpdateService> update,
        Mock<ITransactionsReadService> read,
        Mock<IRewardRulesReadService> rewards,
        Mock<ICatalogReadService> catalog,
        Mock<IMessagingInsertService> messaging,
        Mock<IAnalyticsComputeBusiness> analytics,
        Mock<IMissedRewardNotificationBusiness> missedRewardNotif) =>
        new(update.Object, read.Object, rewards.Object, catalog.Object, messaging.Object,
            new FakeUnitOfWork(), analytics.Object, missedRewardNotif.Object,
            NullLogger<TransactionsUpdateBusiness>.Instance, new TransactionsValidator());

    private static Mock<ICatalogReadService> NewCatalog()
    {
        var mock = new Mock<ICatalogReadService>();
        mock.Setup(c => c.GetCategoriesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Category> { new(1, "shopping", "Shopping", null) });
        return mock;
    }

    private static Mock<ITransactionsReadService> NewRead(TransactionDetail detail)
    {
        var mock = new Mock<ITransactionsReadService>();
        mock.Setup(r => r.GetTransactionDetailAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(detail);
        mock.Setup(r => r.GetMissedRewardAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((MissedReward?)null);
        mock.Setup(r => r.GetMissedRewardsAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<MissedReward>());
        return mock;
    }

    private static Mock<IRewardRulesReadService> NewRewards(int cardId, decimal baseRate)
    {
        var card = new CardSummary(cardId, "My Card", "Bank", null, "manual", true, "active", null);
        var profile = new List<UserCardReward>
        {
            new(card, 1, baseRate, new Dictionary<string, decimal>(), "cash_back", [])
        };
        var mock = new Mock<IRewardRulesReadService>();
        mock.Setup(r => r.GetUserRewardProfileAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(profile);
        return mock;
    }

    #region archive — async event-publish (disabled in MVP)
    // UpdateTransaction_persists_changes_and_enqueues_event previously asserted:
    //     messaging.Verify(m => m.EnqueueOutboxEventAsync(
    //         "finance.transaction.updated", "finance.transaction", ...), Times.Once);
    // Replaced with the inline analytics.RecomputeSnapshotsAsync assertion.
    //
    // MarkNotAMiss_dismisses_and_enqueues_event previously asserted:
    //     messaging.Verify(m => m.EnqueueOutboxEventAsync(
    //         "finance.missed_reward.not_a_miss", It.IsAny<string>(), ...), Times.Once);
    // Replaced with the inline analytics.RecomputeSnapshotsAsync assertion.
    #endregion
}
