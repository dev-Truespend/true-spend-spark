using Microsoft.Extensions.Caching.Memory;
using Moq;
using TrueSpend.Domain.Business.Notifications;
using TrueSpend.Domain.Models.Notifications;
using TrueSpend.Domain.ServiceInterfaces.Notifications;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Notifications;

public sealed class NotificationsReadBusinessTests
{
    private static Notification MakeNotification(int id = 1) =>
        new() { Id = id, TypeCode = "missed_reward", Title = "Title", Body = "Body", IsRead = false, CreatedAt = DateTimeOffset.UtcNow };

    [Fact]
    public async Task GetNotifications_returns_notifications_from_service()
    {
        var notifications = new[] { MakeNotification() };
        var service = new Mock<INotificationsReadService>();
        service.Setup(s => s.GetNotificationsAsync(It.IsAny<TrueSpend.Domain.Models.Onboarding.OnboardingWorkflowUser>(), "all", It.IsAny<CancellationToken>()))
            .ReturnsAsync(notifications);
        var business = new NotificationsReadBusiness(service.Object, new MemoryCache(new MemoryCacheOptions()));

        var result = await business.GetNotificationsAsync(TestUserFactory.AnyUser(), "all", CancellationToken.None);

        Assert.True(result.Success);
        Assert.Single(result.Data!.Notifications);
    }

    [Fact]
    public async Task GetNotificationDetail_returns_404_when_not_found()
    {
        var service = new Mock<INotificationsReadService>();
        service.Setup(s => s.GetNotificationDetailAsync(It.IsAny<TrueSpend.Domain.Models.Onboarding.OnboardingWorkflowUser>(), 99, It.IsAny<CancellationToken>()))
            .ReturnsAsync((NotificationDetail?)null);
        var business = new NotificationsReadBusiness(service.Object, new MemoryCache(new MemoryCacheOptions()));

        var result = await business.GetNotificationDetailAsync(TestUserFactory.AnyUser(), 99, CancellationToken.None);

        Assert.False(result.Success);
        Assert.Equal(404, result.StatusCode);
    }

    [Fact]
    public async Task GetNotificationDetail_returns_detail_when_found()
    {
        var detail = new NotificationDetail { Notification = MakeNotification() };
        var service = new Mock<INotificationsReadService>();
        service.Setup(s => s.GetNotificationDetailAsync(It.IsAny<TrueSpend.Domain.Models.Onboarding.OnboardingWorkflowUser>(), 1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(detail);
        var business = new NotificationsReadBusiness(service.Object, new MemoryCache(new MemoryCacheOptions()));

        var result = await business.GetNotificationDetailAsync(TestUserFactory.AnyUser(), 1, CancellationToken.None);

        Assert.True(result.Success);
        Assert.Equal(1, result.Data!.Notification.Id);
    }

    [Fact]
    public async Task GetReminders_returns_reminders_from_service()
    {
        var reminders = new[] { new NotificationReminder { Id = 1, RemindAt = DateTimeOffset.UtcNow.AddHours(1), Title = "Reminder", Body = "Check this", CreatedAt = DateTimeOffset.UtcNow } };
        var service = new Mock<INotificationsReadService>();
        service.Setup(s => s.GetRemindersAsync(It.IsAny<TrueSpend.Domain.Models.Onboarding.OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(reminders);
        var business = new NotificationsReadBusiness(service.Object, new MemoryCache(new MemoryCacheOptions()));

        var result = await business.GetRemindersAsync(TestUserFactory.AnyUser(), CancellationToken.None);

        Assert.True(result.Success);
        Assert.Single(result.Data!.Reminders);
    }
}
