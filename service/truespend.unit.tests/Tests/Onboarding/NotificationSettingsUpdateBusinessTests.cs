using Moq;
using TrueSpend.Domain.Business.NotificationSettings;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.Models.Permissions;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.NotificationSettings;
using TrueSpend.Domain.Validators;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Onboarding;

public sealed class NotificationSettingsUpdateBusinessTests
{
    private static NotificationSettingsResponse Existing() => new(
        true,
        true,
        true,
        false,
        null,
        null,
        Array.Empty<NotificationType>());

    [Fact]
    public async Task UpdateNotificationSettings_persists_merged_state()
    {
        var read = new Mock<INotificationSettingsReadService>();
        read.Setup(r => r.GetSettingsAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>())).ReturnsAsync(Existing());
        var update = new Mock<INotificationSettingsUpdateService>();
        update.Setup(u => u.SaveSettingsAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<NotificationSettingsResponse>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OnboardingWorkflowUser _, NotificationSettingsResponse value, CancellationToken _) => value);
        var messaging = new Mock<IMessagingInsertService>();
        var business = new NotificationSettingsUpdateBusiness(read.Object, update.Object, messaging.Object, new FakeUnitOfWork(), new NotificationsValidator());

        var response = await business.UpdateNotificationSettingsAsync(TestUserFactory.AnyUser(),
            new UpdateNotificationSettingsRequest(true, false, true, true, "22:00", "07:00"), CancellationToken.None);

        Assert.True(response.Success);
        Assert.False(response.Data!.PushEnabled);
        Assert.True(response.Data.QuietHoursEnabled);
        Assert.Equal("22:00", response.Data.QuietHoursStart);
    }

    [Fact]
    public async Task UpdateNotificationSettings_requires_quiet_hours_window_when_enabled()
    {
        var read = new Mock<INotificationSettingsReadService>();
        var update = new Mock<INotificationSettingsUpdateService>();
        var messaging = new Mock<IMessagingInsertService>();
        var business = new NotificationSettingsUpdateBusiness(read.Object, update.Object, messaging.Object, new FakeUnitOfWork(), new NotificationsValidator());

        var response = await business.UpdateNotificationSettingsAsync(TestUserFactory.AnyUser(),
            new UpdateNotificationSettingsRequest(true, true, true, true, null, null), CancellationToken.None);

        Assert.False(response.Success);
        update.Verify(u => u.SaveSettingsAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<NotificationSettingsResponse>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
