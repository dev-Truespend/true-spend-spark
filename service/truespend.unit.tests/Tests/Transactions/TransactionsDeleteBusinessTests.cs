using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using TrueSpend.Domain.Business.Transactions;
using TrueSpend.Domain.BusinessInterfaces.Analytics;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Transactions;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Transactions;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Transactions;

public sealed class TransactionsDeleteBusinessTests
{
    private static TransactionDetail SampleDetail() =>
        new(42, "Amazon", 100m, "USD", 1, "My Card", "shopping", "Shopping",
            new DateOnly(2026, 1, 10), null, null, null, null, "manual", false);

    [Fact]
    public async Task DeleteTransaction_removes_and_triggers_inline_recompute()
    {
        var delete = new Mock<ITransactionsDeleteService>();
        var read = NewRead(SampleDetail());
        var messaging = new Mock<IMessagingInsertService>(); // archived: kept for future async migration
        var analytics = new Mock<IAnalyticsComputeBusiness>();

        var business = new TransactionsDeleteBusiness(
            delete.Object, read.Object, messaging.Object, new FakeUnitOfWork(),
            analytics.Object, NullLogger<TransactionsDeleteBusiness>.Instance);
        var response = await business.DeleteTransactionAsync(TestUserFactory.AnyUser(), 42, CancellationToken.None);

        Assert.True(response.Success);
        delete.Verify(s => s.DeleteTransactionAsync(It.IsAny<OnboardingWorkflowUser>(), 42, It.IsAny<CancellationToken>()), Times.Once);
        analytics.Verify(a => a.RecomputeSnapshotsAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DeleteTransaction_returns_404_when_not_found()
    {
        var delete = new Mock<ITransactionsDeleteService>();
        var read = new Mock<ITransactionsReadService>();
        read.Setup(r => r.GetTransactionDetailAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((TransactionDetail?)null);
        var messaging = new Mock<IMessagingInsertService>();
        var analytics = new Mock<IAnalyticsComputeBusiness>();

        var business = new TransactionsDeleteBusiness(
            delete.Object, read.Object, messaging.Object, new FakeUnitOfWork(),
            analytics.Object, NullLogger<TransactionsDeleteBusiness>.Instance);
        var response = await business.DeleteTransactionAsync(TestUserFactory.AnyUser(), 99, CancellationToken.None);

        Assert.False(response.Success);
        Assert.Equal(404, response.StatusCode);
        delete.Verify(s => s.DeleteTransactionAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
        analytics.Verify(a => a.RecomputeSnapshotsAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    private static Mock<ITransactionsReadService> NewRead(TransactionDetail detail)
    {
        var mock = new Mock<ITransactionsReadService>();
        mock.Setup(r => r.GetTransactionDetailAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(detail);
        mock.Setup(r => r.GetTransactionsAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<TransactionListQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Transaction>());
        return mock;
    }

    #region archive — async event-publish (disabled in MVP)
    // DeleteTransaction_removes_and_enqueues_event previously asserted:
    //     messaging.Verify(m => m.EnqueueOutboxEventAsync(
    //         "finance.transaction.deleted", "finance.transaction", ...), Times.Once);
    // Replaced with the inline analytics.RecomputeSnapshotsAsync assertion.
    #endregion
}
