using Moq;
using TrueSpend.Domain.Business.Notifications;
using TrueSpend.Domain.BusinessInterfaces.Notifications;
using TrueSpend.Domain.Models.Notifications;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Notifications;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Notifications;

public sealed class NotificationsUpdateBusinessTests
{
    private static Notification MakeNotification(int id = 1) =>
        new() { Id = id, TypeCode = "missed_reward", Title = "Title", Body = "Body", IsRead = true, CreatedAt = DateTimeOffset.UtcNow };

    [Fact]
    public async Task MarkRead_commits_transaction_and_invalidates_inbox_cache()
    {
        var notifications = new[] { MakeNotification() };
        var update = new Mock<INotificationsUpdateService>();
        update.Setup(s => s.MarkReadAsync(It.IsAny<TrueSpend.Domain.Models.Onboarding.OnboardingWorkflowUser>(), 1, It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        var read = new Mock<INotificationsReadService>();
        read.Setup(s => s.GetNotificationsAsync(It.IsAny<TrueSpend.Domain.Models.Onboarding.OnboardingWorkflowUser>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(notifications);
        var messaging = new Mock<IMessagingInsertService>(); // archived: kept for future async migration
        var invalidator = new Mock<INotificationInboxCacheInvalidatorBusiness>();
        var business = new NotificationsUpdateBusiness(update.Object, read.Object, messaging.Object, invalidator.Object, new FakeUnitOfWork());

        var result = await business.MarkReadAsync(TestUserFactory.AnyUser(), 1, CancellationToken.None);

        Assert.True(result.Success);
        invalidator.Verify(i => i.InvalidateAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Once);
        // Post-conversion: NotificationRead handler was log-only, no enqueue is expected.
        messaging.Verify(m => m.EnqueueOutboxEventAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int?>(),
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task MarkAllRead_commits_transaction_and_invalidates_inbox_cache()
    {
        var notifications = new[] { MakeNotification() };
        var update = new Mock<INotificationsUpdateService>();
        update.Setup(s => s.MarkAllReadAsync(It.IsAny<TrueSpend.Domain.Models.Onboarding.OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        var read = new Mock<INotificationsReadService>();
        read.Setup(s => s.GetNotificationsAsync(It.IsAny<TrueSpend.Domain.Models.Onboarding.OnboardingWorkflowUser>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(notifications);
        var messaging = new Mock<IMessagingInsertService>();
        var invalidator = new Mock<INotificationInboxCacheInvalidatorBusiness>();
        var business = new NotificationsUpdateBusiness(update.Object, read.Object, messaging.Object, invalidator.Object, new FakeUnitOfWork());

        var result = await business.MarkAllReadAsync(TestUserFactory.AnyUser(), CancellationToken.None);

        Assert.True(result.Success);
        invalidator.Verify(i => i.InvalidateAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Once);
        // Post-conversion: NotificationsReadAll handler was log-only, no enqueue is expected.
        messaging.Verify(m => m.EnqueueOutboxEventAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int?>(),
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    #region archive — async event-publish (disabled in MVP)
    // MarkRead_commits_transaction_and_enqueues_outbox_event previously asserted:
    //     messaging.Verify(m => m.EnqueueOutboxEventAsync(
    //         It.IsAny<string>(), It.IsAny<string>(), 1, It.IsAny<string>(),
    //         It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
    //
    // MarkAllRead_commits_transaction_and_enqueues_outbox_event previously asserted:
    //     messaging.Verify(m => m.EnqueueOutboxEventAsync(
    //         It.IsAny<string>(), It.IsAny<string>(), null, It.IsAny<string>(),
    //         It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
    //
    // Both NotificationRead and NotificationsReadAll were log-only on the consumer side, so the
    // live tests now assert the enqueue does NOT fire.
    #endregion
}
