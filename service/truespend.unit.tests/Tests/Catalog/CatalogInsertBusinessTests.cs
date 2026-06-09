using Moq;
using TrueSpend.Domain.Business.Catalog;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.ServiceInterfaces.Cards;
using TrueSpend.Domain.ServiceInterfaces.Catalog;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Onboarding;
using TrueSpend.Domain.Validators;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Catalog;

public sealed class CatalogInsertBusinessTests
{
    private static CreateCardProductRequest Request(bool createUserCard) =>
        new("Mystery Bank", "Mystery Card", createUserCard, "Nick", "4242", true);

    [Fact]
    public async Task CreateCardProductRequest_only_records_request_when_create_user_card_is_false()
    {
        var deps = BuildMocks();
        var business = NewBusiness(deps);

        var response = await business.CreateCardProductRequestAsync(TestUserFactory.AnyUser(), Request(createUserCard: false), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Null(response.Data!.UserCard);
        deps.Cards.Verify(c => c.InsertCardAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<int?>(), It.IsAny<CardSummary>(), It.IsAny<CancellationToken>()), Times.Never);
        deps.OnboardingUpdate.Verify(u => u.SaveOnboardingAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<OnboardingResponse>(), It.IsAny<CancellationToken>()), Times.Never);

        // Post-conversion: CardProductRequestCreated handler was log-only, no enqueue is expected.
        deps.Messaging.Verify(m => m.EnqueueOutboxEventAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int?>(),
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateCardProductRequest_also_inserts_card_and_advances_onboarding_when_requested()
    {
        var deps = BuildMocks();
        var business = NewBusiness(deps);

        var response = await business.CreateCardProductRequestAsync(TestUserFactory.AnyUser(), Request(createUserCard: true), CancellationToken.None);

        Assert.True(response.Success);
        Assert.NotNull(response.Data!.UserCard);
        deps.Cards.Verify(c => c.InsertCardAsync(It.IsAny<OnboardingWorkflowUser>(), null, It.IsAny<CardSummary>(), It.IsAny<CancellationToken>()), Times.Once);
        deps.OnboardingUpdate.Verify(u => u.SaveOnboardingAsync(
            It.IsAny<OnboardingWorkflowUser>(),
            It.Is<OnboardingResponse>(o => o.CurrentStepCode == "location_permission" && o.CardConnectionManual),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateCardProductRequest_rejects_blank_issuer_or_card_name()
    {
        var deps = BuildMocks();
        var business = NewBusiness(deps);

        var response = await business.CreateCardProductRequestAsync(TestUserFactory.AnyUser(),
            new CreateCardProductRequest(" ", " ", true, null, null, false), CancellationToken.None);

        Assert.False(response.Success);
        deps.Catalog.Verify(s => s.InsertProductRequestAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        deps.Cards.Verify(c => c.InsertCardAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<int?>(), It.IsAny<CardSummary>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    private sealed record Deps(
        Mock<ICatalogInsertService> Catalog,
        Mock<ICardsInsertService> Cards,
        Mock<IOnboardingReadService> OnboardingRead,
        Mock<IOnboardingUpdateService> OnboardingUpdate,
        Mock<IMessagingInsertService> Messaging);

    private static Deps BuildMocks()
    {
        var catalog = new Mock<ICatalogInsertService>();
        catalog.Setup(s => s.InsertProductRequestAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OnboardingWorkflowUser _, string issuer, string card, CancellationToken _) =>
                new CardProductRequest(7, issuer.Trim(), card.Trim(), "pending"));
        var cards = new Mock<ICardsInsertService>();
        cards.Setup(c => c.InsertCardAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<int?>(), It.IsAny<CardSummary>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OnboardingWorkflowUser _, int? _, CardSummary value, CancellationToken _) => value with { Id = 42 });
        var onboardingRead = new Mock<IOnboardingReadService>();
        onboardingRead.Setup(r => r.GetOnboardingAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new OnboardingResponse("card_connection", false, false, false, false));
        var onboardingUpdate = new Mock<IOnboardingUpdateService>();
        onboardingUpdate.Setup(u => u.SaveOnboardingAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<OnboardingResponse>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OnboardingWorkflowUser _, OnboardingResponse value, CancellationToken _) => value);
        var messaging = new Mock<IMessagingInsertService>(); // archived: kept for future async migration
        return new Deps(catalog, cards, onboardingRead, onboardingUpdate, messaging);
    }

    private static CatalogInsertBusiness NewBusiness(Deps deps) =>
        new(deps.Catalog.Object, deps.Cards.Object, deps.OnboardingRead.Object, deps.OnboardingUpdate.Object, deps.Messaging.Object, new FakeUnitOfWork(), new CatalogValidator());

    #region archive — async event-publish (disabled in MVP)
    // CreateCardProductRequest_only_records_request_when_create_user_card_is_false previously
    // asserted:
    //     deps.Messaging.Verify(m => m.EnqueueOutboxEventAsync(
    //         "catalog.card_product_request.created", It.IsAny<string>(), It.IsAny<int?>(),
    //         It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
    // The handler was log-only, so the live test now asserts the enqueue does NOT fire.
    #endregion
}
