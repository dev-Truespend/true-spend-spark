using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using TrueSpend.Domain.Business.Notifications;
using TrueSpend.Domain.BusinessInterfaces.Notifications;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Models.Notifications;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Notifications;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Notifications;

public sealed class SubscriptionExpiryNotificationBusinessTests
{
    private static readonly DateTimeOffset Now = new(2026, 6, 1, 9, 0, 0, TimeSpan.Zero);

    private sealed class Harness
    {
        public Mock<INotificationProductionService> Production { get; } = new();
        public Mock<INotificationGateService> Gate { get; } = new();
        public Mock<INotificationsDispatchBusiness> Dispatch { get; } = new();
        public Mock<INotificationInboxCacheInvalidatorBusiness> Inbox { get; } = new();

        public Harness()
        {
            Production.Setup(p => p.GetNotificationTypeIdAsync(NotificationsConstants.SubscriptionExpiryTypeCode, It.IsAny<CancellationToken>()))
                .ReturnsAsync((short)9);
            Gate.Setup(g => g.GetGatesAsync(It.IsAny<IReadOnlyCollection<Guid>>(), It.IsAny<short>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((IReadOnlyCollection<Guid> ids, short _, DateTimeOffset _, CancellationToken _) =>
                {
                    var map = new Dictionary<Guid, NotificationGate>();
                    foreach (var id in ids) map[id] = new NotificationGate(true, true, true, false, false);
                    return map;
                });
            Production.Setup(p => p.HasNotificationOfTypeSinceAsync(It.IsAny<Guid>(), It.IsAny<short>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(false);
            Production.Setup(p => p.InsertNotificationAsync(It.IsAny<NotificationToProduce>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(1);
        }

        public SubscriptionExpiryNotificationBusiness Build() => new(
            Production.Object, Gate.Object, Mock.Of<IMessagingInsertService>(), new FakeUnitOfWork(),
            Dispatch.Object, Inbox.Object, NullLogger<SubscriptionExpiryNotificationBusiness>.Instance);
    }

    [Fact]
    public async Task Produces_and_dispatches_for_trial_expiring_tomorrow()
    {
        var h = new Harness();
        h.Production.Setup(p => p.GetExpiringSubscriptionsAsync(Now, It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { new ExpiringSubscription(Guid.NewGuid(), NotificationsConstants.SubscriptionExpiryTrialKind, Now.AddHours(20)) });

        var produced = await h.Build().ProduceExpiringAsync(Now, 2, CancellationToken.None);

        Assert.Equal(1, produced);
        h.Dispatch.Verify(d => d.DispatchPushAsync(1, It.IsAny<CancellationToken>()), Times.Once);
        h.Inbox.Verify(i => i.InvalidateAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Skips_when_already_notified_today()
    {
        var h = new Harness();
        h.Production.Setup(p => p.GetExpiringSubscriptionsAsync(Now, It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { new ExpiringSubscription(Guid.NewGuid(), NotificationsConstants.SubscriptionExpiryPlanKind, Now.AddDays(2)) });
        h.Production.Setup(p => p.HasNotificationOfTypeSinceAsync(It.IsAny<Guid>(), It.IsAny<short>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var produced = await h.Build().ProduceExpiringAsync(Now, 2, CancellationToken.None);

        Assert.Equal(0, produced);
        h.Production.Verify(p => p.InsertNotificationAsync(It.IsAny<NotificationToProduce>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Skips_when_notification_type_not_seeded()
    {
        var h = new Harness();
        h.Production.Setup(p => p.GetNotificationTypeIdAsync(NotificationsConstants.SubscriptionExpiryTypeCode, It.IsAny<CancellationToken>()))
            .ReturnsAsync((short)0);

        var produced = await h.Build().ProduceExpiringAsync(Now, 2, CancellationToken.None);

        Assert.Equal(0, produced);
        h.Production.Verify(p => p.GetExpiringSubscriptionsAsync(It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
