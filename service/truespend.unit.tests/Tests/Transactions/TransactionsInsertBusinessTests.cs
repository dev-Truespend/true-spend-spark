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

public sealed class TransactionsInsertBusinessTests
{
    private static CreateTransactionRequest ValidRequest() =>
        new("Amazon", 100m, 1, "shopping", new DateOnly(2026, 1, 10), null, null, null, null);

    private static TransactionDetail SampleDetail() =>
        new(1, "Amazon", 100m, "USD", 1, "My Card", "shopping", "Shopping",
            new DateOnly(2026, 1, 10), null, null, null, null, "manual", false);

    [Fact]
    public async Task CreateTransaction_persists_transaction_and_triggers_inline_recompute()
    {
        var insert = NewInsert();
        var read = NewRead();
        var rewards = NewRewards(cardId: 1, baseRate: 0.01m);
        var catalog = NewCatalog();
        var messaging = new Mock<IMessagingInsertService>(); // archived: kept for future async migration
        var analytics = new Mock<IAnalyticsComputeBusiness>();
        var missedRewardNotif = new Mock<IMissedRewardNotificationBusiness>();

        var business = NewBusiness(insert, read, rewards, catalog, messaging, analytics, missedRewardNotif);
        var response = await business.CreateTransactionAsync(TestUserFactory.AnyUser(), ValidRequest(), CancellationToken.None);

        Assert.True(response.Success);
        insert.Verify(s => s.InsertTransactionAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CreateTransactionRequest>(), It.IsAny<int?>(), It.IsAny<short?>(), It.IsAny<CancellationToken>()), Times.Once);
        analytics.Verify(a => a.RecomputeSnapshotsAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Once);
        // No missed-reward in this scenario (single card profile, no better card available).
        missedRewardNotif.Verify(n => n.ProduceForMissedRewardEventAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateTransaction_returns_validation_error_for_invalid_request()
    {
        var insert = new Mock<ITransactionsInsertService>();
        var read = new Mock<ITransactionsReadService>();
        var rewards = new Mock<IRewardRulesReadService>();
        var catalog = NewCatalog();
        var messaging = new Mock<IMessagingInsertService>();
        var analytics = new Mock<IAnalyticsComputeBusiness>();
        var missedRewardNotif = new Mock<IMissedRewardNotificationBusiness>();

        var business = NewBusiness(insert, read, rewards, catalog, messaging, analytics, missedRewardNotif);
        var response = await business.CreateTransactionAsync(
            TestUserFactory.AnyUser(),
            new CreateTransactionRequest(string.Empty, 0m, 0, string.Empty, new DateOnly(2026, 1, 10), null, null, null, null),
            CancellationToken.None);

        Assert.False(response.Success);
        Assert.Equal(400, response.StatusCode);
        insert.Verify(s => s.InsertTransactionAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CreateTransactionRequest>(), It.IsAny<int?>(), It.IsAny<short?>(), It.IsAny<CancellationToken>()), Times.Never);
        analytics.Verify(a => a.RecomputeSnapshotsAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateTransaction_fails_when_card_not_in_reward_profile()
    {
        var insert = new Mock<ITransactionsInsertService>();
        var read = new Mock<ITransactionsReadService>();
        var rewards = NewRewards(cardId: 99, baseRate: 0.01m);
        var catalog = NewCatalog();
        var messaging = new Mock<IMessagingInsertService>();
        var analytics = new Mock<IAnalyticsComputeBusiness>();
        var missedRewardNotif = new Mock<IMissedRewardNotificationBusiness>();

        var business = NewBusiness(insert, read, rewards, catalog, messaging, analytics, missedRewardNotif);
        var response = await business.CreateTransactionAsync(TestUserFactory.AnyUser(), ValidRequest(), CancellationToken.None);

        Assert.False(response.Success);
        Assert.Equal(400, response.StatusCode);
        insert.Verify(s => s.InsertTransactionAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CreateTransactionRequest>(), It.IsAny<int?>(), It.IsAny<short?>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateTransaction_creates_missed_reward_and_notifies_inline()
    {
        var insert = NewInsert();
        var read = NewRead();
        var rewards = NewRewardsWithTwoCards(actingCardId: 1, actingRate: 0.01m, betterCardId: 2, betterRate: 0.05m);
        var catalog = NewCatalog();
        var messaging = new Mock<IMessagingInsertService>();
        var analytics = new Mock<IAnalyticsComputeBusiness>();
        var missedRewardNotif = new Mock<IMissedRewardNotificationBusiness>();

        var business = NewBusiness(insert, read, rewards, catalog, messaging, analytics, missedRewardNotif);
        var response = await business.CreateTransactionAsync(TestUserFactory.AnyUser(), ValidRequest(), CancellationToken.None);

        Assert.True(response.Success);
        insert.Verify(s => s.InsertMissedRewardAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<CancellationToken>()), Times.Once);
        analytics.Verify(a => a.RecomputeSnapshotsAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Once);
        missedRewardNotif.Verify(n => n.ProduceForMissedRewardEventAsync(1, It.IsAny<CancellationToken>()), Times.Once);
    }

    private static TransactionsInsertBusiness NewBusiness(
        Mock<ITransactionsInsertService> insert,
        Mock<ITransactionsReadService> read,
        Mock<IRewardRulesReadService> rewards,
        Mock<ICatalogReadService> catalog,
        Mock<IMessagingInsertService> messaging,
        Mock<IAnalyticsComputeBusiness> analytics,
        Mock<IMissedRewardNotificationBusiness> missedRewardNotif) =>
        new(insert.Object, read.Object, rewards.Object, catalog.Object, messaging.Object,
            new FakeUnitOfWork(), analytics.Object, missedRewardNotif.Object,
            NullLogger<TransactionsInsertBusiness>.Instance, new TransactionsValidator());

    private static Mock<ITransactionsInsertService> NewInsert()
    {
        var mock = new Mock<ITransactionsInsertService>();
        mock.Setup(s => s.InsertTransactionAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CreateTransactionRequest>(), It.IsAny<int?>(), It.IsAny<short?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(1);
        mock.Setup(s => s.InsertMissedRewardAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(1);
        return mock;
    }

    private static Mock<ITransactionsReadService> NewRead()
    {
        var mock = new Mock<ITransactionsReadService>();
        mock.Setup(s => s.GetTransactionDetailAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(SampleDetail());
        mock.Setup(s => s.GetMissedRewardAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((MissedReward?)null);
        return mock;
    }

    private static Mock<ICatalogReadService> NewCatalog()
    {
        var mock = new Mock<ICatalogReadService>();
        mock.Setup(c => c.GetCategoriesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Category> { new(1, "shopping", "Shopping", null) });
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

    private static Mock<IRewardRulesReadService> NewRewardsWithTwoCards(int actingCardId, decimal actingRate, int betterCardId, decimal betterRate)
    {
        var acting = new CardSummary(actingCardId, "Card A", "Bank", null, "manual", true, "active", null);
        var better = new CardSummary(betterCardId, "Card B", "Bank", null, "manual", false, "active", null);
        var profile = new List<UserCardReward>
        {
            new(acting, 1, actingRate, new Dictionary<string, decimal>(), "cash_back", []),
            new(better, 2, betterRate, new Dictionary<string, decimal>(), "cash_back", [])
        };
        var mock = new Mock<IRewardRulesReadService>();
        mock.Setup(r => r.GetUserRewardProfileAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(profile);
        return mock;
    }

    #region archive — async event-publish (disabled in MVP)
    // CreateTransaction_persists_transaction_and_enqueues_event previously asserted:
    //     messaging.Verify(m => m.EnqueueOutboxEventAsync(
    //         "finance.transaction.created", "finance.transaction",
    //         It.IsAny<int?>(), It.IsAny<string>(), It.IsAny<string>(),
    //         It.IsAny<CancellationToken>()), Times.Once);
    // Replaced with analytics.Verify(RecomputeSnapshotsAsync, Times.Once) above.
    //
    // The test for the missed-reward path previously did not separately assert the
    // MissedRewardEventCreated enqueue. The live test now asserts the inline
    // IMissedRewardNotificationBusiness.ProduceForMissedRewardEventAsync call.
    #endregion
}
