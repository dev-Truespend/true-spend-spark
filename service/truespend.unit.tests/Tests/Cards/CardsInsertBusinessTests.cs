using Moq;
using TrueSpend.Domain.Business.Cards;
using TrueSpend.Domain.BusinessInterfaces.Billing;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.Models.Permissions;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.ServiceInterfaces.Cards;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Onboarding;
using TrueSpend.Domain.Validators;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Cards;

public sealed class CardsInsertBusinessTests
{
    private static CreateManualCardRequest ValidRequest() => new(1, 1, "My card", "4242", true);

    [Fact]
    public async Task CreateManualCard_persists_card_and_advances_onboarding()
    {
        var cards = NewCardsInsert();
        var onboardingRead = new Mock<IOnboardingReadService>();
        onboardingRead.Setup(r => r.GetOnboardingAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new OnboardingResponse("card_connection", false, false, false, false));
        var onboardingUpdate = new Mock<IOnboardingUpdateService>();
        onboardingUpdate.Setup(u => u.SaveOnboardingAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<OnboardingResponse>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OnboardingWorkflowUser _, OnboardingResponse value, CancellationToken _) => value);
        var messaging = new Mock<IMessagingInsertService>();
        var business = new CardsInsertBusiness(cards.Object, NewCardsRead().Object, onboardingRead.Object, onboardingUpdate.Object, messaging.Object, new FakeUnitOfWork(), NewPassThroughGuard().Object, new CardsValidator());

        var response = await business.CreateManualCardAsync(TestUserFactory.AnyUser(), ValidRequest(), CancellationToken.None);

        Assert.True(response.Success);
        cards.Verify(c => c.InsertCardAsync(It.IsAny<OnboardingWorkflowUser>(), 1, It.IsAny<CardSummary>(), It.IsAny<CancellationToken>()), Times.Once);
        messaging.Verify(m => m.EnqueueOutboxEventAsync(
            "finance.user_card.created",
            "finance.user_card",
            It.IsAny<int?>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<CancellationToken>()), Times.Once);
        onboardingUpdate.Verify(u => u.SaveOnboardingAsync(
            It.IsAny<OnboardingWorkflowUser>(),
            It.Is<OnboardingResponse>(o => o.CurrentStepCode == "location_permission" && o.CardConnectionManual),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateManualCard_returns_validation_error_when_request_invalid()
    {
        var cards = NewCardsInsert();
        var onboardingUpdate = new Mock<IOnboardingUpdateService>();
        var messaging = new Mock<IMessagingInsertService>();
        var business = new CardsInsertBusiness(cards.Object, NewCardsRead().Object, new Mock<IOnboardingReadService>().Object, onboardingUpdate.Object, messaging.Object, new FakeUnitOfWork(), NewPassThroughGuard().Object, new CardsValidator());

        var response = await business.CreateManualCardAsync(TestUserFactory.AnyUser(), new CreateManualCardRequest(0, 0, null, null, false), CancellationToken.None);

        Assert.False(response.Success);
        cards.Verify(c => c.InsertCardAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<int?>(), It.IsAny<CardSummary>(), It.IsAny<CancellationToken>()), Times.Never);
        onboardingUpdate.Verify(u => u.SaveOnboardingAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<OnboardingResponse>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateManualCard_fails_when_product_or_issuer_not_in_catalog()
    {
        var cards = new Mock<ICardsInsertService>();
        cards.Setup(c => c.FindProductAsync(It.IsAny<int>(), It.IsAny<CancellationToken>())).ReturnsAsync((CardProduct?)null);
        cards.Setup(c => c.FindIssuerAsync(It.IsAny<int>(), It.IsAny<CancellationToken>())).ReturnsAsync((Issuer?)null);
        var onboardingUpdate = new Mock<IOnboardingUpdateService>();
        var messaging = new Mock<IMessagingInsertService>();
        var business = new CardsInsertBusiness(cards.Object, NewCardsRead().Object, new Mock<IOnboardingReadService>().Object, onboardingUpdate.Object, messaging.Object, new FakeUnitOfWork(), NewPassThroughGuard().Object, new CardsValidator());

        var response = await business.CreateManualCardAsync(TestUserFactory.AnyUser(), ValidRequest(), CancellationToken.None);

        Assert.False(response.Success);
        Assert.Equal(400, response.StatusCode);
        cards.Verify(c => c.InsertCardAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<int?>(), It.IsAny<CardSummary>(), It.IsAny<CancellationToken>()), Times.Never);
        onboardingUpdate.Verify(u => u.SaveOnboardingAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<OnboardingResponse>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    private static Mock<ICardsReadService> NewCardsRead()
    {
        var cards = new Mock<ICardsReadService>();
        cards.Setup(c => c.CountActiveUserCardsAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);
        return cards;
    }

    private static Mock<IEntitlementGuard> NewPassThroughGuard()
    {
        var guard = new Mock<IEntitlementGuard>();
        guard.Setup(g => g.RequireFeatureAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        guard.Setup(g => g.RequireCardLinkCapacityAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        return guard;
    }

    private static Mock<ICardsInsertService> NewCardsInsert()
    {
        var cards = new Mock<ICardsInsertService>();
        cards.Setup(c => c.FindProductAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CardProduct(1, "Bank", "Sample Card", null, null, null));
        cards.Setup(c => c.FindIssuerAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Issuer(1, "Bank", null));
        cards.Setup(c => c.InsertCardAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<int?>(), It.IsAny<CardSummary>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OnboardingWorkflowUser _, int? _, CardSummary value, CancellationToken _) => value with { Id = 123 });
        return cards;
    }
}
