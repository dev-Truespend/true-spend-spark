using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using TrueSpend.Domain.Business.Notifications;
using TrueSpend.Domain.BusinessInterfaces.Notifications;
using TrueSpend.Domain.Models.Notifications;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Notifications;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Notifications;

public sealed class AdminNotificationDispatchBusinessTests
{
    [Fact]
    public async Task DispatchDueCampaigns_finalizes_campaign_with_empty_audience()
    {
        var campaign = new DueAdminCampaign(1, 5, "T", "B", "{}", "{\"type\":\"explicit_user_ids\",\"userIds\":[]}", null);
        var campaignService = new Mock<IAdminNotificationCampaignService>();
        campaignService.Setup(c => c.GetDueCampaignsAsync(It.IsAny<DateTimeOffset>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { campaign });
        campaignService.Setup(c => c.ResolveAudienceAsync(campaign.AudienceSelectorJson, null, It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Guid>());
        var business = new AdminNotificationDispatchBusiness(
            campaignService.Object,
            Mock.Of<INotificationProductionService>(),
            Mock.Of<INotificationGateService>(),
            Mock.Of<IMessagingInsertService>(),
            new FakeUnitOfWork(),
            Mock.Of<INotificationsDispatchBusiness>(),
            Mock.Of<INotificationInboxCacheInvalidatorBusiness>(),
            NullLogger<AdminNotificationDispatchBusiness>.Instance);

        var result = await business.DispatchDueCampaignsAsync(DateTimeOffset.UtcNow, CancellationToken.None);

        Assert.Equal(1, result.CampaignsProcessed);
        Assert.Equal(0, result.NotificationsCreated);
        campaignService.Verify(c => c.FinalizeCampaignAsync(1, CampaignStatusCodes.Succeeded, It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DispatchDueCampaigns_gates_out_users_blocked_by_preferences()
    {
        var userId = Guid.NewGuid();
        var campaign = new DueAdminCampaign(2, 5, "Title", "Body", "{}", "{\"type\":\"explicit_user_ids\",\"userIds\":[\"" + userId + "\"]}", null);
        var campaignService = new Mock<IAdminNotificationCampaignService>();
        campaignService.Setup(c => c.GetDueCampaignsAsync(It.IsAny<DateTimeOffset>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { campaign });
        campaignService.Setup(c => c.ResolveAudienceAsync(campaign.AudienceSelectorJson, null, It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { userId });
        var gateService = new Mock<INotificationGateService>();
        gateService.Setup(g => g.GetGatesAsync(It.IsAny<IReadOnlyCollection<Guid>>(), (short)5, It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<Guid, NotificationGate>
            {
                [userId] = new NotificationGate(MasterEnabled: false, PushEnabled: false, TypeEnabled: false, InQuietHours: false, HonorsQuietHours: true),
            });
        var business = new AdminNotificationDispatchBusiness(
            campaignService.Object,
            Mock.Of<INotificationProductionService>(),
            gateService.Object,
            Mock.Of<IMessagingInsertService>(),
            new FakeUnitOfWork(),
            Mock.Of<INotificationsDispatchBusiness>(),
            Mock.Of<INotificationInboxCacheInvalidatorBusiness>(),
            NullLogger<AdminNotificationDispatchBusiness>.Instance);

        var result = await business.DispatchDueCampaignsAsync(DateTimeOffset.UtcNow, CancellationToken.None);

        Assert.Equal(1, result.GatedOut);
        Assert.Equal(0, result.NotificationsCreated);
    }
}
