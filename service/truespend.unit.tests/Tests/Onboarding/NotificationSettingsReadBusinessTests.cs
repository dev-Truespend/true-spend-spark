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
using TrueSpend.Domain.ServiceInterfaces.NotificationSettings;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Onboarding;

public sealed class NotificationSettingsReadBusinessTests
{
    private static NotificationSettingsResponse SampleSettings() => new(
        true,
        true,
        true,
        false,
        null,
        null,
        new[] { new NotificationType("best_card_alert", "Best card alerts", true) });

    [Fact]
    public async Task GetNotificationSettings_returns_settings_for_user()
    {
        var expected = SampleSettings();
        var read = new Mock<INotificationSettingsReadService>();
        read.Setup(r => r.GetSettingsAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>())).ReturnsAsync(expected);
        var business = new NotificationSettingsReadBusiness(read.Object);

        var response = await business.GetNotificationSettingsAsync(TestUserFactory.AnyUser(), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Equal(expected, response.Data);
    }

    [Fact]
    public async Task GetNotificationTypes_projects_types_from_settings()
    {
        var expected = SampleSettings();
        var read = new Mock<INotificationSettingsReadService>();
        read.Setup(r => r.GetSettingsAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>())).ReturnsAsync(expected);
        var business = new NotificationSettingsReadBusiness(read.Object);

        var response = await business.GetNotificationTypesAsync(TestUserFactory.AnyUser(), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Equal(expected.Types, response.Data!.Types);
    }
}
