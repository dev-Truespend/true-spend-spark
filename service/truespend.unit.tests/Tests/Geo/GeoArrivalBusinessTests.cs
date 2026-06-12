using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using TrueSpend.Domain.Business.Geo;
using TrueSpend.Domain.BusinessInterfaces.Billing;
using TrueSpend.Domain.BusinessInterfaces.Geo;
using TrueSpend.Domain.BusinessInterfaces.Merchants;
using TrueSpend.Domain.BusinessInterfaces.Notifications;
using TrueSpend.Domain.BusinessInterfaces.Recommendations;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Enums;
using TrueSpend.Domain.Entities.Finance;
using TrueSpend.Domain.Entities.Messaging;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Geo;
using TrueSpend.Domain.Models.Notifications;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Recommendations;
using TrueSpend.Domain.ServiceInterfaces.Geo;
using TrueSpend.Domain.ServiceInterfaces.Merchants;
using TrueSpend.Domain.ServiceInterfaces.Notifications;
using TrueSpend.Domain.Validators;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Geo;

// Shared provider-neutral arrival pipeline (foursquare + custom). Merchant resolution branches by
// provider; everything downstream (gate -> best card -> notification -> post-commit) is identical.
public sealed class GeoArrivalBusinessTests
{
    private static readonly Guid UserId = TestUserFactory.FixedUserId;

    [Fact]
    public async Task Foursquare_arrival_inserts_notification_and_dispatches_inline()
    {
        var ctx = TestContext.Default();
        var merchant = new Merchant(7, "Starbucks", "coffee", false, "1 Pike St");
        ctx.MerchantResolve.Setup(m => m.ResolveByNameAsync("Starbucks", It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>())).ReturnsAsync(merchant);
        ctx.Builder.Setup(b => b.BuildAsync(It.IsAny<OnboardingWorkflowUser>(), merchant, "coffee", It.IsAny<decimal>(), RecommendationsConstants.GeofenceArrivalContextCode, It.IsAny<CancellationToken>()))
            .ReturnsAsync(SampleRecommendation(merchant));
        ctx.InsertService.Setup(i => i.InsertNotificationAsync(It.IsAny<NotificationEntity>(), It.IsAny<CancellationToken>())).ReturnsAsync(42);
        var business = ctx.Build();

        var response = await business.HandleArrivalAsync(FoursquareArrival(), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Equal(42, response.Data!.NotificationId);
        Assert.Equal(7, response.Data.MerchantId);
        ctx.DispatchBusiness.Verify(d => d.DispatchPushAsync(42, It.IsAny<CancellationToken>()), Times.Once);
        ctx.InboxCacheInvalidator.Verify(i => i.InvalidateAsync(UserId, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Custom_high_confidence_resolves_matched_place_and_notifies()
    {
        var ctx = TestContext.Default();
        var merchant = new Merchant(7, "Chipotle", "dining", false, null);
        ctx.PlaceMatch.Setup(p => p.ResolveAsync(It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<decimal?>(), It.IsAny<int?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PlaceMatch(true, "Chipotle", GeoConstants.ProviderFoursquare, "fsq-chipotle-1", ArrivalConfidenceTierEnum.High));
        ctx.MerchantResolve.Setup(m => m.ResolveByNameAsync("Chipotle", It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>())).ReturnsAsync(merchant);
        ctx.Builder.Setup(b => b.BuildAsync(It.IsAny<OnboardingWorkflowUser>(), merchant, "dining", It.IsAny<decimal>(), RecommendationsConstants.GeofenceArrivalContextCode, It.IsAny<CancellationToken>()))
            .ReturnsAsync(SampleRecommendation(merchant));
        ctx.InsertService.Setup(i => i.InsertNotificationAsync(It.IsAny<NotificationEntity>(), It.IsAny<CancellationToken>())).ReturnsAsync(55);
        var business = ctx.Build();

        var response = await business.HandleArrivalAsync(CustomArrival(), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Equal(55, response.Data!.NotificationId);
        ctx.DispatchBusiness.Verify(d => d.DispatchPushAsync(55, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Custom_medium_confidence_does_not_push()
    {
        var ctx = TestContext.Default();
        var merchant = new Merchant(7, "Chipotle", "dining", false, null);
        ctx.PlaceMatch.Setup(p => p.ResolveAsync(It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<decimal?>(), It.IsAny<int?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PlaceMatch(true, "Chipotle", GeoConstants.ProviderFoursquare, "fsq-chipotle-1", ArrivalConfidenceTierEnum.Medium));
        ctx.MerchantResolve.Setup(m => m.ResolveByNameAsync("Chipotle", It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>())).ReturnsAsync(merchant);
        var business = ctx.Build();

        var response = await business.HandleArrivalAsync(CustomArrival(), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Null(response.Data!.NotificationId);
        Assert.Equal(7, response.Data.MerchantId);
        ctx.Builder.Verify(b => b.BuildAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<Merchant>(), It.IsAny<string>(), It.IsAny<decimal>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        ctx.DispatchBusiness.Verify(d => d.DispatchPushAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Returns_deduplicated_for_repeat_event()
    {
        var ctx = TestContext.Default();
        ctx.ReadService.Setup(r => r.WebhookEventExistsAsync(GeoConstants.ProviderFoursquare, "fsq-1", It.IsAny<CancellationToken>())).ReturnsAsync(true);
        var business = ctx.Build();

        var response = await business.HandleArrivalAsync(FoursquareArrival(), CancellationToken.None);

        Assert.True(response.Data!.Deduplicated);
        ctx.DispatchBusiness.Verify(d => d.DispatchPushAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Skips_notification_when_user_has_no_active_cards()
    {
        var ctx = TestContext.Default();
        var merchant = new Merchant(7, "Starbucks", "coffee", false, null);
        ctx.MerchantResolve.Setup(m => m.ResolveByNameAsync("Starbucks", It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>())).ReturnsAsync(merchant);
        ctx.ReadService.Setup(r => r.HasActiveCardsAsync(UserId, It.IsAny<CancellationToken>())).ReturnsAsync(false);
        var business = ctx.Build();

        var response = await business.HandleArrivalAsync(FoursquareArrival(), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Null(response.Data!.NotificationId);
        ctx.DispatchBusiness.Verify(d => d.DispatchPushAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    private static GeoArrivalInput FoursquareArrival() =>
        new(
            Provider: GeoConstants.ProviderFoursquare,
            EventId: "fsq-1",
            EventType: GeoConstants.FoursquareEventEnteredPlace,
            EventKind: GeoArrivalEventKindEnum.Arrival,
            UserId: UserId,
            ExternalUserId: UserId.ToString(),
            PlaceName: "Starbucks Pike Place",
            ProviderPlaceId: null,
            GeofenceTag: null,
            PlaceChain: "Starbucks",
            Lat: 47.61m,
            Lng: -122.34m,
            AccuracyMeters: 12m,
            OccurredAt: new DateTimeOffset(2026, 6, 3, 10, 30, 0, TimeSpan.Zero),
            DwellSeconds: null,
            MovementState: null,
            RawPayload: "{}");

    private static GeoArrivalInput CustomArrival() =>
        new(
            Provider: GeoConstants.ProviderCustom,
            EventId: "custom:stop-1",
            EventType: GeoConstants.CustomEventArrival,
            EventKind: GeoArrivalEventKindEnum.Arrival,
            UserId: UserId,
            ExternalUserId: null,
            PlaceName: null,
            ProviderPlaceId: null,
            GeofenceTag: null,
            PlaceChain: null,
            Lat: 37.7929m,
            Lng: -122.3971m,
            AccuracyMeters: 20m,
            OccurredAt: new DateTimeOffset(2026, 6, 3, 10, 30, 0, TimeSpan.Zero),
            DwellSeconds: 120,
            MovementState: GeoConstants.MovementOnFoot,
            RawPayload: "{}");

    private static Recommendation SampleRecommendation(Merchant merchant) =>
        new(
            99,
            merchant,
            merchant.CategoryCode,
            new RecommendationCard(
                new CardSummary(11, "Gold", "Amex", "1234", "plaid", true, "active", null),
                4m,
                new Money(1m, "USD", "$1.00"),
                "Best rate",
                1),
            "Best card",
            Array.Empty<RecommendationCard>(),
            null);

    private sealed class TestContext
    {
        public Mock<IGeoWebhookReadService> ReadService { get; } = new();
        public Mock<IGeoWebhookInsertService> InsertService { get; } = new();
        public Mock<IMerchantsReadService> MerchantsRead { get; } = new();
        public Mock<IMerchantResolveBusiness> MerchantResolve { get; } = new();
        public Mock<IGeoPlaceMatchBusiness> PlaceMatch { get; } = new();
        public Mock<IRecommendationBuilderBusiness> Builder { get; } = new();
        public Mock<IBillingReadBusiness> BillingRead { get; } = new();
        public Mock<INotificationGateService> GateService { get; } = new();
        public Mock<INotificationsDispatchBusiness> DispatchBusiness { get; } = new();
        public Mock<INotificationInboxCacheInvalidatorBusiness> InboxCacheInvalidator { get; } = new();

        public static TestContext Default()
        {
            var ctx = new TestContext();
            ctx.ReadService.Setup(r => r.WebhookEventExistsAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(false);
            ctx.ReadService.Setup(r => r.HasActiveCardsAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync(true);
            ctx.ReadService.Setup(r => r.GetNotificationTypeIdAsync(NotificationsConstants.BestCardAlertTypeCode, It.IsAny<CancellationToken>())).ReturnsAsync((short)5);
            ctx.ReadService.Setup(r => r.GetLocationEventTypeIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync((short)4);
            ctx.GateService.Setup(g => g.GetGateAsync(It.IsAny<Guid>(), It.IsAny<short>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new NotificationGate(true, true, true, false, true));
            ctx.InsertService.Setup(i => i.RecordWebhookEventAsync(It.IsAny<GeoArrivalInput>(), It.IsAny<Guid?>(), It.IsAny<int?>(), It.IsAny<CancellationToken>())).ReturnsAsync(1);
            ctx.InsertService.Setup(i => i.InsertLocationEventAsync(It.IsAny<LocationEventEntity>(), It.IsAny<CancellationToken>())).ReturnsAsync(1);
            ctx.InsertService.Setup(i => i.InsertNotificationAsync(It.IsAny<NotificationEntity>(), It.IsAny<CancellationToken>())).ReturnsAsync(1);
            ctx.BillingRead.Setup(b => b.GetEntitlementsAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(BusinessResponse<EntitlementsResponse>.Ok(new EntitlementsResponse(
                    PlanCode: "basic", Trialing: false, TrialEndsAt: null, ManualCardLimit: 3, PlaidCardLimit: 3, GeoRecommendationsPerDay: null, UnlimitedCards: false,
                    AiInsightsEnabled: false, PlaidLinkingEnabled: false, PlaidTransactionsViewEnabled: false, GeofencingEnabled: true,
                    Features: new Dictionary<string, string>())));
            return ctx;
        }

        public GeoArrivalBusiness Build() => new(
            ReadService.Object,
            InsertService.Object,
            MerchantsRead.Object,
            MerchantResolve.Object,
            PlaceMatch.Object,
            Builder.Object,
            BillingRead.Object,
            GateService.Object,
            DispatchBusiness.Object,
            InboxCacheInvalidator.Object,
            new GeoValidator(),
            new FakeUnitOfWork(),
            NullLogger<GeoArrivalBusiness>.Instance);
    }
}
