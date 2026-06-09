using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using TrueSpend.Domain.Business.Geo;
using TrueSpend.Domain.BusinessInterfaces.Billing;
using TrueSpend.Domain.BusinessInterfaces.Notifications;
using TrueSpend.Domain.BusinessInterfaces.Recommendations;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Entities.Finance;
using TrueSpend.Domain.Entities.Messaging;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Geo;
using TrueSpend.Domain.Models.Notifications;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Recommendations;
using TrueSpend.Domain.ServiceInterfaces.Geo;
using TrueSpend.Domain.ServiceInterfaces.Merchants;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Notifications;
using TrueSpend.Domain.Validators;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Geo;

public sealed class FoursquareWebhookBusinessTests
{
    private static readonly Guid UserId = TestUserFactory.FixedUserId;

    [Theory]
    [InlineData("pre_check")]
    [InlineData("unique_violation")]
    public async Task Returns_deduplicated_for_repeat_event(string dedupSource)
    {
        var ctx = TestContext.Default();
        if (dedupSource == "pre_check")
        {
            ctx.ReadService.Setup(r => r.WebhookEventExistsAsync("fsq-1", It.IsAny<CancellationToken>())).ReturnsAsync(true);
        }
        else
        {
            ctx.InsertService.Setup(i => i.RecordWebhookEventAsync(It.IsAny<FoursquareWebhookInput>(), It.IsAny<Guid?>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()))
                .ThrowsAsync(new DbUpdateException("unique violation", new FakePgUniqueException()));
        }
        var business = ctx.Build();

        var response = await business.HandleEventAsync(SampleInput(), CancellationToken.None);

        Assert.True(response.Success);
        Assert.True(response.Data!.Received);
        Assert.True(response.Data.Deduplicated);
        ctx.MessagingInsert.Verify(m => m.EnqueueOutboxEventAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int?>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        ctx.DispatchBusiness.Verify(d => d.DispatchPushAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
        ctx.InboxCacheInvalidator.Verify(i => i.InvalidateAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Inserts_notification_and_invokes_inline_dispatch_when_gate_allows()
    {
        var ctx = TestContext.Default();
        var merchant = new Merchant(7, "Starbucks", "coffee", false, "1 Pike St");
        ctx.MerchantsRead.Setup(m => m.FindByNameAsync("Starbucks", It.IsAny<CancellationToken>())).ReturnsAsync(merchant);
        ctx.Builder.Setup(b => b.BuildAsync(It.IsAny<OnboardingWorkflowUser>(), merchant, "coffee", It.IsAny<decimal>(), RecommendationsConstants.GeofenceArrivalContextCode, It.IsAny<CancellationToken>()))
            .ReturnsAsync(SampleRecommendation(merchant));
        ctx.InsertService.Setup(i => i.InsertNotificationAsync(It.IsAny<NotificationEntity>(), It.IsAny<CancellationToken>())).ReturnsAsync(42);
        var business = ctx.Build();

        var response = await business.HandleEventAsync(SampleInput(), CancellationToken.None);

        Assert.True(response.Success);
        Assert.False(response.Data!.Deduplicated);
        Assert.Equal(42, response.Data.NotificationId);
        Assert.Equal(99, response.Data.RecommendationId);
        Assert.Equal(7, response.Data.MerchantId);
        ctx.DispatchBusiness.Verify(d => d.DispatchPushAsync(42, It.IsAny<CancellationToken>()), Times.Once);
        ctx.InboxCacheInvalidator.Verify(i => i.InvalidateAsync(UserId, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Skips_notification_when_user_has_no_active_cards()
    {
        var ctx = TestContext.Default();
        var merchant = new Merchant(7, "Starbucks", "coffee", false, null);
        ctx.MerchantsRead.Setup(m => m.FindByNameAsync("Starbucks", It.IsAny<CancellationToken>())).ReturnsAsync(merchant);
        ctx.ReadService.Setup(r => r.HasActiveCardsAsync(UserId, It.IsAny<CancellationToken>())).ReturnsAsync(false);
        var business = ctx.Build();

        var response = await business.HandleEventAsync(SampleInput(), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Null(response.Data!.NotificationId);
        ctx.Builder.Verify(b => b.BuildAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<Merchant>(), It.IsAny<string>(), It.IsAny<decimal>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        ctx.DispatchBusiness.Verify(d => d.DispatchPushAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Skips_notification_when_geofencing_disabled_by_entitlement()
    {
        var ctx = TestContext.Default();
        var merchant = new Merchant(7, "Starbucks", "coffee", false, null);
        ctx.MerchantsRead.Setup(m => m.FindByNameAsync("Starbucks", It.IsAny<CancellationToken>())).ReturnsAsync(merchant);
        ctx.BillingRead.Setup(b => b.GetEntitlementsAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(BusinessResponse<EntitlementsResponse>.Ok(new EntitlementsResponse(
                PlanCode: "basic", Trialing: false, TrialEndsAt: null, ManualCardLimit: 3, PlaidCardLimit: 3, GeoRecommendationsPerDay: null, UnlimitedCards: false,
                AiInsightsEnabled: false, PlaidLinkingEnabled: false, PlaidTransactionsViewEnabled: false, GeofencingEnabled: false,
                Features: new Dictionary<string, string>())));
        var business = ctx.Build();

        var response = await business.HandleEventAsync(SampleInput(), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Null(response.Data!.NotificationId);
        ctx.InsertService.Verify(i => i.InsertNotificationAsync(It.IsAny<NotificationEntity>(), It.IsAny<CancellationToken>()), Times.Never);
        ctx.MessagingInsert.Verify(m => m.EnqueueOutboxEventAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int?>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        ctx.DispatchBusiness.Verify(d => d.DispatchPushAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Skips_notification_when_geo_daily_limit_reached()
    {
        var ctx = TestContext.Default();
        var merchant = new Merchant(7, "Starbucks", "coffee", false, null);
        ctx.MerchantsRead.Setup(m => m.FindByNameAsync("Starbucks", It.IsAny<CancellationToken>())).ReturnsAsync(merchant);
        ctx.BillingRead.Setup(b => b.GetEntitlementsAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(BusinessResponse<EntitlementsResponse>.Ok(new EntitlementsResponse(
                PlanCode: "free", Trialing: false, TrialEndsAt: null, ManualCardLimit: 1, PlaidCardLimit: 0, GeoRecommendationsPerDay: 1, UnlimitedCards: false,
                AiInsightsEnabled: false, PlaidLinkingEnabled: false, PlaidTransactionsViewEnabled: false, GeofencingEnabled: true,
                Features: new Dictionary<string, string>())));
        ctx.ReadService.Setup(r => r.CountGeoRecommendationsSinceAsync(It.IsAny<Guid>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(1);
        var business = ctx.Build();

        var response = await business.HandleEventAsync(SampleInput(), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Null(response.Data!.NotificationId);
        ctx.InsertService.Verify(i => i.InsertNotificationAsync(It.IsAny<NotificationEntity>(), It.IsAny<CancellationToken>()), Times.Never);
        ctx.DispatchBusiness.Verify(d => d.DispatchPushAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Returns_400_when_input_is_invalid()
    {
        var ctx = TestContext.Default();
        var business = ctx.Build();

        var response = await business.HandleEventAsync(new FoursquareWebhookInput(
            FoursquareEventId: "",
            EventType: "",
            ExternalUserId: null,
            PlaceChain: null,
            PlaceName: null,
            GeofenceTag: null,
            Lat: null,
            Lng: null,
            AccuracyMeters: null,
            OccurredAt: default,
            RawPayload: "{}"), CancellationToken.None);

        Assert.False(response.Success);
        Assert.Equal(400, response.StatusCode);
    }

    private static FoursquareWebhookInput SampleInput() =>
        new(
            FoursquareEventId: "fsq-1",
            EventType: "user.entered_place",
            ExternalUserId: UserId.ToString(),
            PlaceChain: "Starbucks",
            PlaceName: "Starbucks Pike Place",
            GeofenceTag: null,
            Lat: 47.61m,
            Lng: -122.34m,
            AccuracyMeters: 12m,
            OccurredAt: new DateTimeOffset(2026, 6, 3, 10, 30, 0, TimeSpan.Zero),
            RawPayload: "{}");

    private static Recommendation SampleRecommendation(Merchant merchant) =>
        new(
            99,
            merchant,
            "coffee",
            new RecommendationCard(
                new CardSummary(11, "Gold", "Amex", "1234", "plaid", true, "active", null),
                4m,
                new Money(1m, "USD", "$1.00"),
                "Best coffee rate",
                1),
            "Best card for coffee",
            Array.Empty<RecommendationCard>(),
            null);

    private sealed class TestContext
    {
        public Mock<IGeoWebhookReadService> ReadService { get; } = new();
        public Mock<IGeoWebhookInsertService> InsertService { get; } = new();
        public Mock<IMerchantsReadService> MerchantsRead { get; } = new();
        public Mock<IMerchantsInsertService> MerchantsInsert { get; } = new();
        public Mock<IRecommendationBuilderBusiness> Builder { get; } = new();
        public Mock<IMessagingInsertService> MessagingInsert { get; } = new(); // archived: kept for future async migration
        public Mock<IBillingReadBusiness> BillingRead { get; } = new();
        public Mock<INotificationGateService> GateService { get; } = new();
        public Mock<INotificationsDispatchBusiness> DispatchBusiness { get; } = new();
        public Mock<INotificationInboxCacheInvalidatorBusiness> InboxCacheInvalidator { get; } = new();

        public static TestContext Default()
        {
            var ctx = new TestContext();
            ctx.ReadService.Setup(r => r.WebhookEventExistsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(false);
            ctx.ReadService.Setup(r => r.ResolveUserIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(UserId);
            ctx.ReadService.Setup(r => r.HasActiveCardsAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync(true);
            ctx.ReadService.Setup(r => r.GetNotificationTypeIdAsync(NotificationsConstants.BestCardAlertTypeCode, It.IsAny<CancellationToken>())).ReturnsAsync((short)5);
            ctx.GateService.Setup(g => g.GetGateAsync(It.IsAny<Guid>(), It.IsAny<short>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new NotificationGate(true, true, true, false, true));
            ctx.ReadService.Setup(r => r.GetLocationEventTypeIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync((short)4);
            ctx.InsertService.Setup(i => i.RecordWebhookEventAsync(It.IsAny<FoursquareWebhookInput>(), It.IsAny<Guid?>(), It.IsAny<int?>(), It.IsAny<CancellationToken>())).ReturnsAsync(1);
            ctx.InsertService.Setup(i => i.InsertLocationEventAsync(It.IsAny<LocationEventEntity>(), It.IsAny<CancellationToken>())).ReturnsAsync(1);
            ctx.InsertService.Setup(i => i.InsertNotificationAsync(It.IsAny<NotificationEntity>(), It.IsAny<CancellationToken>())).ReturnsAsync(1);
            ctx.BillingRead.Setup(b => b.GetEntitlementsAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(BusinessResponse<EntitlementsResponse>.Ok(new EntitlementsResponse(
                    PlanCode: "basic", Trialing: false, TrialEndsAt: null, ManualCardLimit: 3, PlaidCardLimit: 3, GeoRecommendationsPerDay: null, UnlimitedCards: false,
                    AiInsightsEnabled: false, PlaidLinkingEnabled: false, PlaidTransactionsViewEnabled: false, GeofencingEnabled: true,
                    Features: new Dictionary<string, string>())));
            return ctx;
        }

        public FoursquareWebhookBusiness Build() => new(
            ReadService.Object,
            InsertService.Object,
            MerchantsRead.Object,
            MerchantsInsert.Object,
            Builder.Object,
            MessagingInsert.Object,
            BillingRead.Object,
            GateService.Object,
            DispatchBusiness.Object,
            InboxCacheInvalidator.Object,
            new GeoValidator(),
            new FakeUnitOfWork(),
            NullLogger<FoursquareWebhookBusiness>.Instance);
    }

    private sealed class FakePgUniqueException : Exception
    {
        public string SqlState => "23505";
    }

    #region archive — async event-publish (disabled in MVP)
    // Inserts_notification_and_publishes_outbox_when_gate_allows previously asserted:
    //     ctx.MessagingInsert.Verify(m => m.EnqueueOutboxEventAsync(
    //         EventTypes.NotificationCreated, "notification", 42,
    //         It.Is<string>(s => s.Contains("\"NotificationId\":42") && s.Contains(UserId.ToString())),
    //         "foursquare.fsq-1",
    //         It.IsAny<CancellationToken>()), Times.Once);
    // Replaced with the inline DispatchPushAsync + InvalidateAsync assertions above.
    #endregion
}
