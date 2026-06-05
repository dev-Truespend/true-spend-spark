using Moq;
using TrueSpend.Domain.Business.Plaid;
using TrueSpend.Domain.BusinessInterfaces.Billing;
using TrueSpend.Domain.Exceptions;
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
using TrueSpend.Domain.ServiceInterfaces.Plaid;
using TrueSpend.Domain.Validators;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Onboarding;

public sealed class PlaidInsertBusinessTests
{
    private static OnboardingWorkflowUser User => TestUserFactory.AnyUser();

    [Fact]
    public async Task CreatePlaidLinkToken_returns_token_from_provider()
    {
        var expected = new PlaidLinkTokenResponse("link-token", TestUserFactory.FixedNow);
        var provider = new Mock<IPlaidProvider>();
        provider.Setup(p => p.CreateLinkTokenAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>())).ReturnsAsync(expected);
        var business = NewBusiness(provider, new Mock<IPlaidInsertService>(), new Mock<IOnboardingReadService>(), new Mock<IOnboardingUpdateService>(), new Mock<IMessagingInsertService>());

        var response = await business.CreatePlaidLinkTokenAsync(User, CancellationToken.None);

        Assert.True(response.Success);
        Assert.Equal(expected, response.Data);
    }

    [Fact]
    public async Task ExchangePlaidToken_advances_onboarding_and_emits_event_per_card()
    {
        var provider = new Mock<IPlaidProvider>();
        provider.Setup(p => p.ExchangePublicTokenAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PlaidExchangeResult("item-id", "token", "ins_1", "Sandbox Bank", null,
                new[] { new PlaidAccountInfo("acc-1", "Credit", "credit card", "0000") }));
        var plaid = new Mock<IPlaidInsertService>();
        var createdCard = new CardSummary(99, "Credit", "Sandbox Bank", "0000", "plaid", false, "active", null);
        plaid.Setup(s => s.PersistPlaidConnectionAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<PlaidExchangeResult>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PlaidPersistResult(7, new[] { createdCard }));
        plaid.Setup(s => s.GetCurrentStateAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PlaidConnectionResponse(Array.Empty<PlaidConnection>(), new[] { createdCard }, "complete"));
        var read = new Mock<IOnboardingReadService>();
        read.Setup(r => r.GetOnboardingAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new OnboardingResponse("card_connection", false, false, false, false));
        var update = new Mock<IOnboardingUpdateService>();
        update.Setup(u => u.SaveOnboardingAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<OnboardingResponse>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OnboardingWorkflowUser _, OnboardingResponse value, CancellationToken _) => value);
        var messaging = new Mock<IMessagingInsertService>();
        var business = NewBusiness(provider, plaid, read, update, messaging);

        var response = await business.ExchangePlaidTokenAsync(User, new ExchangePlaidTokenRequest("public-token"), CancellationToken.None);

        Assert.True(response.Success);
        messaging.Verify(m => m.EnqueueOutboxEventAsync(
            "finance.user_card.created",
            "finance.user_card",
            99,
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<CancellationToken>()), Times.Once);
        update.Verify(u => u.SaveOnboardingAsync(
            It.IsAny<OnboardingWorkflowUser>(),
            It.Is<OnboardingResponse>(o => o.CurrentStepCode == "location_permission" && o.CardConnectionPlaid),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ExchangePlaidToken_rejects_blank_token_without_calling_provider()
    {
        var provider = new Mock<IPlaidProvider>();
        var plaid = new Mock<IPlaidInsertService>();
        var update = new Mock<IOnboardingUpdateService>();
        var business = NewBusiness(provider, plaid, new Mock<IOnboardingReadService>(), update, new Mock<IMessagingInsertService>());

        var response = await business.ExchangePlaidTokenAsync(User, new ExchangePlaidTokenRequest(" "), CancellationToken.None);

        Assert.False(response.Success);
        Assert.Equal(400, response.StatusCode);
        provider.Verify(p => p.ExchangePublicTokenAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        update.Verify(u => u.SaveOnboardingAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<OnboardingResponse>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreatePlaidLinkToken_returns_503_when_provider_not_configured()
    {
        var provider = new Mock<IPlaidProvider>();
        provider.Setup(p => p.CreateLinkTokenAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ExternalProviderAppException("plaid", "Plaid is not configured."));
        var business = NewBusiness(provider, new Mock<IPlaidInsertService>(), new Mock<IOnboardingReadService>(), new Mock<IOnboardingUpdateService>(), new Mock<IMessagingInsertService>());

        var response = await business.CreatePlaidLinkTokenAsync(User, CancellationToken.None);

        Assert.False(response.Success);
        Assert.Equal(503, response.StatusCode);
    }

    private static PlaidInsertBusiness NewBusiness(
        Mock<IPlaidProvider> provider,
        Mock<IPlaidInsertService> plaid,
        Mock<IOnboardingReadService> read,
        Mock<IOnboardingUpdateService> update,
        Mock<IMessagingInsertService> messaging)
    {
        var guard = new Mock<IEntitlementGuard>();
        guard.Setup(g => g.RequireFeatureAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        guard.Setup(g => g.RequireCardLinkCapacityAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        var cardsRead = new Mock<ICardsReadService>();
        cardsRead.Setup(c => c.CountActiveUserCardsAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);
        return new(provider.Object, plaid.Object, read.Object, update.Object, messaging.Object, new FakeUnitOfWork(), guard.Object, cardsRead.Object, new PlaidValidator());
    }
}
