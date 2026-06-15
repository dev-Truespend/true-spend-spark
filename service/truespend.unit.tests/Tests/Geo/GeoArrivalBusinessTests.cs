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
        ctx.MerchantsInsert.Verify(m => m.RecordVisitAsync(It.IsAny<OnboardingWorkflowUser>(), 7, "dining", It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()), Times.Once);
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
        // No push, but the user was physically there — the visit is still recorded.
        ctx.MerchantsInsert.Verify(m => m.RecordVisitAsync(It.IsAny<OnboardingWorkflowUser>(), 7, "dining", It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Custom_low_confidence_records_no_visit()
    {
        var ctx = TestContext.Default();
        ctx.PlaceMatch.Setup(p => p.ResolveAsync(It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<decimal?>(), It.IsAny<int?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PlaceMatch(true, "Chipotle", GeoConstants.ProviderFoursquare, "fsq-chipotle-1", ArrivalConfidenceTierEnum.Low));
        var business = ctx.Build();

        var response = await business.HandleArrivalAsync(CustomArrival(), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Null(response.Data!.NotificationId);
        ctx.MerchantsInsert.Verify(m => m.RecordVisitAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<int>(), It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()), Times.Never);
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
        // The notification was gated (no cards), but the arrival was real — visit still recorded.
        ctx.MerchantsInsert.Verify(m => m.RecordVisitAsync(It.IsAny<OnboardingWorkflowUser>(), 7, "coffee", It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Records_arrival_decision_telemetry_on_push()
    {
        var ctx = TestContext.Default();
        var merchant = new Merchant(7, "Chipotle", "dining", false, null);
        GeoArrivalDecisionEntity? captured = null;
        ctx.InsertService.Setup(i => i.InsertArrivalDecisionAsync(It.IsAny<GeoArrivalDecisionEntity>(), It.IsAny<CancellationToken>()))
            .Callback<GeoArrivalDecisionEntity, CancellationToken>((e, _) => captured = e)
            .ReturnsAsync(1);
        ctx.PlaceMatch.Setup(p => p.ResolveAsync(It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<decimal?>(), It.IsAny<int?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PlaceMatch(true, "Chipotle", GeoConstants.ProviderFoursquare, "fsq-chipotle-1", ArrivalConfidenceTierEnum.High, CandidateCount: 4, PlausibleCount: 1, Mode: ArrivalDecisionModeEnum.SingleMerchant));
        ctx.MerchantResolve.Setup(m => m.ResolveByNameAsync("Chipotle", It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>())).ReturnsAsync(merchant);
        ctx.Builder.Setup(b => b.BuildAsync(It.IsAny<OnboardingWorkflowUser>(), merchant, "dining", It.IsAny<decimal>(), RecommendationsConstants.GeofenceArrivalContextCode, It.IsAny<CancellationToken>()))
            .ReturnsAsync(SampleRecommendation(merchant));
        var business = ctx.Build();

        await business.HandleArrivalAsync(CustomArrival(), CancellationToken.None);

        Assert.NotNull(captured);
        Assert.Equal("pushed", captured!.DecisionOutcome);
        Assert.True(captured.NotificationProduced);
        Assert.Equal((short)ArrivalConfidenceTierEnum.High, captured.ConfidenceTier);
        Assert.Equal("single_merchant", captured.DecisionMode);
        Assert.Equal(4, captured.CandidateCount);
        Assert.Equal(1, captured.PlausibleCount);
        Assert.Equal(7, captured.ChosenMerchantId);
        Assert.Equal(GeoConstants.ProviderCustom, captured.Provider);
    }

    [Fact]
    public async Task Records_arrival_decision_telemetry_on_medium_suppression()
    {
        var ctx = TestContext.Default();
        var merchant = new Merchant(7, "Chipotle", "dining", false, null);
        GeoArrivalDecisionEntity? captured = null;
        ctx.InsertService.Setup(i => i.InsertArrivalDecisionAsync(It.IsAny<GeoArrivalDecisionEntity>(), It.IsAny<CancellationToken>()))
            .Callback<GeoArrivalDecisionEntity, CancellationToken>((e, _) => captured = e)
            .ReturnsAsync(1);
        ctx.PlaceMatch.Setup(p => p.ResolveAsync(It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<decimal?>(), It.IsAny<int?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PlaceMatch(true, "Chipotle", GeoConstants.ProviderFoursquare, "fsq-chipotle-1", ArrivalConfidenceTierEnum.Medium, CandidateCount: 3, PlausibleCount: 2));
        ctx.MerchantResolve.Setup(m => m.ResolveByNameAsync("Chipotle", It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>())).ReturnsAsync(merchant);
        var business = ctx.Build();

        await business.HandleArrivalAsync(CustomArrival(), CancellationToken.None);

        Assert.NotNull(captured);
        Assert.Equal("medium_confidence_foreground", captured!.DecisionOutcome);
        Assert.False(captured.NotificationProduced);
        Assert.Equal((short)ArrivalConfidenceTierEnum.Medium, captured.ConfidenceTier);
        Assert.Equal(2, captured.PlausibleCount);
    }

    [Fact]
    public async Task Exit_event_closes_covering_area_sessions()
    {
        var ctx = TestContext.Default();
        var business = ctx.Build();

        var exit = CustomArrival() with { EventKind = GeoArrivalEventKindEnum.Exit };
        var response = await business.HandleArrivalAsync(exit, CancellationToken.None);

        Assert.True(response.Success);
        ctx.InsertService.Verify(i => i.ExpireCoveringAreaSessionsAsync(UserId, It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()), Times.Once);
        ctx.DispatchBusiness.Verify(d => d.DispatchPushAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Personal_place_suppresses_push_and_records_no_visit()
    {
        var ctx = TestContext.Default();
        var merchant = new Merchant(7, "Chipotle", "dining", false, null);
        ctx.PlaceMatch.Setup(p => p.ResolveAsync(It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<decimal?>(), It.IsAny<int?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PlaceMatch(true, "Chipotle", GeoConstants.ProviderFoursquare, "fsq-chipotle-1", ArrivalConfidenceTierEnum.High, Mode: ArrivalDecisionModeEnum.SingleMerchant));
        ctx.MerchantResolve.Setup(m => m.ResolveByNameAsync("Chipotle", It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>())).ReturnsAsync(merchant);
        // The user is at a recurring dwell zone (home/work) near this store.
        ctx.ReadService.Setup(r => r.IsWithinPersonalPlaceAsync(UserId, It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<CancellationToken>())).ReturnsAsync(true);
        var business = ctx.Build();

        var response = await business.HandleArrivalAsync(CustomArrival(), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Null(response.Data!.NotificationId);
        ctx.DispatchBusiness.Verify(d => d.DispatchPushAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
        // Not a shopping trip — at home/work, so no visit is recorded.
        ctx.MerchantsInsert.Verify(m => m.RecordVisitAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<int>(), It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Active_area_session_suppresses_individual_push_but_records_visit()
    {
        var ctx = TestContext.Default();
        var merchant = new Merchant(7, "Chipotle", "dining", false, null);
        ctx.PlaceMatch.Setup(p => p.ResolveAsync(It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<decimal?>(), It.IsAny<int?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PlaceMatch(true, "Chipotle", GeoConstants.ProviderFoursquare, "fsq-chipotle-1", ArrivalConfidenceTierEnum.High, Mode: ArrivalDecisionModeEnum.SingleMerchant));
        ctx.MerchantResolve.Setup(m => m.ResolveByNameAsync("Chipotle", It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>())).ReturnsAsync(merchant);
        // The user is already inside a tracked mall/plaza — the area push covered them.
        ctx.ReadService.Setup(r => r.HasCoveringAreaSessionAsync(UserId, It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>())).ReturnsAsync(true);
        var business = ctx.Build();

        var response = await business.HandleArrivalAsync(CustomArrival(), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Null(response.Data!.NotificationId);
        ctx.DispatchBusiness.Verify(d => d.DispatchPushAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
        ctx.Builder.Verify(b => b.BuildAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<Merchant>(), It.IsAny<string>(), It.IsAny<decimal>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        // Suppressed push, but the user was physically there — visit still recorded.
        ctx.MerchantsInsert.Verify(m => m.RecordVisitAsync(It.IsAny<OnboardingWorkflowUser>(), 7, "dining", It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Grouped_arrival_with_no_eligible_cards_does_not_open_area_session()
    {
        // Regression: the area session must open ONLY when a grouped push is actually produced. If no push
        // goes out (here: a resolvable store but no eligible card), opening the session would wrongly
        // suppress every later in-area arrival for the whole visit even though the user never got notified.
        var ctx = TestContext.Default();
        var foodCourt = new Merchant(9, "Food Court Grill", "dining", false, null);
        ctx.PlaceMatch.Setup(p => p.ResolveAsync(It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<decimal?>(), It.IsAny<int?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PlaceMatch(true, "Food Court Grill", GeoConstants.ProviderCustom, "fsq-m1", ArrivalConfidenceTierEnum.Low,
                CandidateCount: 12, PlausibleCount: 12, Mode: ArrivalDecisionModeEnum.MallArea,
                TopCandidates: new[] { new PlaceMatchCandidate("Food Court Grill", GeoConstants.ProviderCustom, "fsq-m1", "dining", 15) }));
        ctx.MerchantResolve.Setup(m => m.ResolveByNameAsync("Food Court Grill", It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>())).ReturnsAsync(foodCourt);
        // No eligible card for the resolved candidate => grouped items empty => no push.
        ctx.Builder.Setup(b => b.BuildAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<Merchant>(), It.IsAny<string>(), It.IsAny<decimal>(), It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync((Recommendation?)null);
        var business = ctx.Build();

        var response = await business.HandleArrivalAsync(CustomArrival(), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Null(response.Data!.NotificationId);
        ctx.InsertService.Verify(i => i.InsertAreaSessionAsync(It.IsAny<GeoAreaSessionEntity>(), It.IsAny<CancellationToken>()), Times.Never);
        ctx.DispatchBusiness.Verify(d => d.DispatchPushAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Area_cluster_sends_one_grouped_push_and_opens_cluster_session()
    {
        var ctx = TestContext.Default();
        var chipotle = new Merchant(7, "Chipotle", "dining", false, null);
        var starbucks = new Merchant(8, "Starbucks", "coffee", false, null);
        NotificationEntity? captured = null;
        ctx.InsertService.Setup(i => i.InsertNotificationAsync(It.IsAny<NotificationEntity>(), It.IsAny<CancellationToken>()))
            .Callback<NotificationEntity, CancellationToken>((n, _) => captured = n)
            .ReturnsAsync(77);
        ctx.PlaceMatch.Setup(p => p.ResolveAsync(It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<decimal?>(), It.IsAny<int?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PlaceMatch(true, "Chipotle", GeoConstants.ProviderCustom, "fsq-1", ArrivalConfidenceTierEnum.Medium,
                CandidateCount: 2, PlausibleCount: 2, Mode: ArrivalDecisionModeEnum.AreaCluster,
                TopCandidates: new[]
                {
                    new PlaceMatchCandidate("Chipotle", GeoConstants.ProviderCustom, "fsq-1", "dining", 20),
                    new PlaceMatchCandidate("Starbucks", GeoConstants.ProviderCustom, "fsq-2", "coffee", 45)
                }));
        ctx.MerchantResolve.Setup(m => m.ResolveByNameAsync("Chipotle", It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>())).ReturnsAsync(chipotle);
        ctx.MerchantResolve.Setup(m => m.ResolveByNameAsync("Starbucks", It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>())).ReturnsAsync(starbucks);
        ctx.Builder.Setup(b => b.BuildAsync(It.IsAny<OnboardingWorkflowUser>(), chipotle, "dining", It.IsAny<decimal>(), RecommendationsConstants.GeofenceArrivalContextCode, It.IsAny<CancellationToken>())).ReturnsAsync(SampleRecommendationWithCard(chipotle, 11, "Amex Gold"));
        ctx.Builder.Setup(b => b.BuildAsync(It.IsAny<OnboardingWorkflowUser>(), starbucks, "coffee", It.IsAny<decimal>(), RecommendationsConstants.GeofenceArrivalContextCode, It.IsAny<CancellationToken>())).ReturnsAsync(SampleRecommendationWithCard(starbucks, 12, "Citi Custom Cash"));
        var business = ctx.Build();

        var response = await business.HandleArrivalAsync(CustomArrival(), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Equal(77, response.Data!.NotificationId);
        ctx.DispatchBusiness.Verify(d => d.DispatchPushAsync(77, It.IsAny<CancellationToken>()), Times.Once);
        ctx.InsertService.Verify(i => i.InsertAreaSessionAsync(It.Is<GeoAreaSessionEntity>(s => s.Mode == GeoConstants.AreaSessionModeCluster), It.IsAny<CancellationToken>()), Times.Once);
        Assert.NotNull(captured);
        Assert.Contains("Chipotle", captured!.Body);
        Assert.Contains("Starbucks", captured.Body);
    }

    [Fact]
    public async Task Mall_area_sends_grouped_push_and_opens_mall_session()
    {
        var ctx = TestContext.Default();
        var foodCourt = new Merchant(9, "Food Court Grill", "dining", false, null);
        ctx.InsertService.Setup(i => i.InsertNotificationAsync(It.IsAny<NotificationEntity>(), It.IsAny<CancellationToken>())).ReturnsAsync(88);
        ctx.PlaceMatch.Setup(p => p.ResolveAsync(It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<decimal?>(), It.IsAny<int?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PlaceMatch(true, "Food Court Grill", GeoConstants.ProviderCustom, "fsq-m1", ArrivalConfidenceTierEnum.Low,
                CandidateCount: 12, PlausibleCount: 12, Mode: ArrivalDecisionModeEnum.MallArea,
                TopCandidates: new[] { new PlaceMatchCandidate("Food Court Grill", GeoConstants.ProviderCustom, "fsq-m1", "dining", 15) }));
        ctx.MerchantResolve.Setup(m => m.ResolveByNameAsync("Food Court Grill", It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>())).ReturnsAsync(foodCourt);
        ctx.Builder.Setup(b => b.BuildAsync(It.IsAny<OnboardingWorkflowUser>(), foodCourt, "dining", It.IsAny<decimal>(), RecommendationsConstants.GeofenceArrivalContextCode, It.IsAny<CancellationToken>())).ReturnsAsync(SampleRecommendationWithCard(foodCourt, 11, "Amex Gold"));
        var business = ctx.Build();

        var response = await business.HandleArrivalAsync(CustomArrival(), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Equal(88, response.Data!.NotificationId);
        ctx.InsertService.Verify(i => i.InsertAreaSessionAsync(It.Is<GeoAreaSessionEntity>(s => s.Mode == GeoConstants.AreaSessionModeMall), It.IsAny<CancellationToken>()), Times.Once);
        ctx.DispatchBusiness.Verify(d => d.DispatchPushAsync(88, It.IsAny<CancellationToken>()), Times.Once);
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

    private static Recommendation SampleRecommendationWithCard(Merchant merchant, int cardId, string cardName) =>
        new(
            99,
            merchant,
            merchant.CategoryCode,
            new RecommendationCard(
                new CardSummary(cardId, cardName, "Amex", "1234", "plaid", true, "active", null),
                4m,
                new Money(1m, "USD", "$1.00"),
                "Best rate",
                1),
            "Best card",
            Array.Empty<RecommendationCard>(),
            null);

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
        public Mock<IMerchantsInsertService> MerchantsInsert { get; } = new();
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
            ctx.InsertService.Setup(i => i.InsertArrivalDecisionAsync(It.IsAny<GeoArrivalDecisionEntity>(), It.IsAny<CancellationToken>())).ReturnsAsync(1);
            ctx.InsertService.Setup(i => i.InsertAreaSessionAsync(It.IsAny<GeoAreaSessionEntity>(), It.IsAny<CancellationToken>())).ReturnsAsync(1);
            ctx.InsertService.Setup(i => i.ExpireCoveringAreaSessionsAsync(It.IsAny<Guid>(), It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>())).ReturnsAsync(0);
            ctx.ReadService.Setup(r => r.HasCoveringAreaSessionAsync(It.IsAny<Guid>(), It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>())).ReturnsAsync(false);
            ctx.ReadService.Setup(r => r.IsWithinPersonalPlaceAsync(It.IsAny<Guid>(), It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<CancellationToken>())).ReturnsAsync(false);
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
            MerchantsInsert.Object,
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
