using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using TrueSpend.Domain.Business.Geo;
using TrueSpend.Domain.BusinessInterfaces.Geo;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Enums;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Geo;
using TrueSpend.Domain.ServiceInterfaces.Geo;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.Validators;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Geo;

// FoursquareWebhookBusiness is now a thin adapter: validate -> resolve user -> map to GeoArrivalInput
// -> delegate to the shared GeoArrivalBusiness. The pipeline itself is covered by GeoArrivalBusinessTests.
public sealed class FoursquareWebhookBusinessTests
{
    private static readonly Guid UserId = TestUserFactory.FixedUserId;

    [Fact]
    public async Task Maps_to_custom_neutral_input_and_delegates_to_shared_handler()
    {
        var ctx = TestContext.Default();
        GeoArrivalInput? captured = null;
        ctx.Arrival.Setup(a => a.HandleArrivalAsync(It.IsAny<GeoArrivalInput>(), It.IsAny<CancellationToken>()))
            .Callback<GeoArrivalInput, CancellationToken>((i, _) => captured = i)
            .ReturnsAsync(BusinessResponse<FoursquareWebhookResult>.Ok(new FoursquareWebhookResult(true, false, 42, 99, 7)));
        var business = ctx.Build();

        var response = await business.HandleEventAsync(SampleInput(), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Equal(42, response.Data!.NotificationId);
        Assert.NotNull(captured);
        Assert.Equal(GeoConstants.ProviderFoursquare, captured!.Provider);
        Assert.Equal("fsq-1", captured.EventId);
        Assert.Equal(UserId, captured.UserId);
        Assert.Equal(GeoArrivalEventKindEnum.Arrival, captured.EventKind);
    }

    [Fact]
    public async Task Classifies_exit_event_kind()
    {
        var ctx = TestContext.Default();
        GeoArrivalInput? captured = null;
        ctx.Arrival.Setup(a => a.HandleArrivalAsync(It.IsAny<GeoArrivalInput>(), It.IsAny<CancellationToken>()))
            .Callback<GeoArrivalInput, CancellationToken>((i, _) => captured = i)
            .ReturnsAsync(BusinessResponse<FoursquareWebhookResult>.Ok(new FoursquareWebhookResult(true, false, null, null, null)));
        var business = ctx.Build();

        await business.HandleEventAsync(SampleInput() with { EventType = GeoConstants.FoursquareEventExitedGeofence }, CancellationToken.None);

        Assert.Equal(GeoArrivalEventKindEnum.Exit, captured!.EventKind);
    }

    [Fact]
    public async Task Returns_400_and_does_not_delegate_when_input_invalid()
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
        ctx.Arrival.Verify(a => a.HandleArrivalAsync(It.IsAny<GeoArrivalInput>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    private static FoursquareWebhookInput SampleInput() =>
        new(
            FoursquareEventId: "fsq-1",
            EventType: GeoConstants.FoursquareEventEnteredPlace,
            ExternalUserId: UserId.ToString(),
            PlaceChain: "Starbucks",
            PlaceName: "Starbucks Pike Place",
            GeofenceTag: null,
            Lat: 47.61m,
            Lng: -122.34m,
            AccuracyMeters: 12m,
            OccurredAt: new DateTimeOffset(2026, 6, 3, 10, 30, 0, TimeSpan.Zero),
            RawPayload: "{}");

    private sealed class TestContext
    {
        public Mock<IGeoWebhookReadService> ReadService { get; } = new();
        public Mock<IGeoArrivalBusiness> Arrival { get; } = new();
        public Mock<IMessagingInsertService> MessagingInsert { get; } = new(); // archived: kept for future async migration

        public static TestContext Default()
        {
            var ctx = new TestContext();
            ctx.ReadService.Setup(r => r.ResolveUserIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(UserId);
            return ctx;
        }

        public FoursquareWebhookBusiness Build() => new(
            ReadService.Object,
            Arrival.Object,
            MessagingInsert.Object,
            new GeoValidator());
    }
}
