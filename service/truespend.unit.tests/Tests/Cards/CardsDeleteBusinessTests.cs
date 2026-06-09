using Moq;
using TrueSpend.Domain.Business.Cards;
using TrueSpend.Domain.BusinessInterfaces.Billing;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.ServiceInterfaces.Cards;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Persistence;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Cards;

public sealed class CardsDeleteBusinessTests
{
    private static readonly CardSummary AnyCard =
        new(1, "Sample", "Bank", "1234", "manual", false, "active", null);

    private static EntitlementsResponse BasicEntitlements => new(
        "basic", false, null, ManualCardLimit: 3, PlaidCardLimit: 3, GeoRecommendationsPerDay: 3,
        UnlimitedCards: false, AiInsightsEnabled: false, PlaidLinkingEnabled: true,
        PlaidTransactionsViewEnabled: true, GeofencingEnabled: true, Features: new Dictionary<string, string>());

    private static CardsDeleteBusiness Build(Mock<ICardsReadService> readService, Mock<ICardsDeleteService> deleteService)
    {
        var tx = new Mock<IUnitOfWorkTransaction>();
        tx.Setup(t => t.CommitAsync(It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        tx.Setup(t => t.DisposeAsync()).Returns(ValueTask.CompletedTask);

        var uow = new Mock<IUnitOfWork>();
        uow.Setup(u => u.BeginTransactionAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(tx.Object);

        var messaging = new Mock<IMessagingInsertService>(); // archived: kept for future async migration

        var billing = new Mock<IBillingReadBusiness>();
        billing.Setup(b => b.GetEntitlementsAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(BusinessResponse<EntitlementsResponse>.Ok(BasicEntitlements));

        return new CardsDeleteBusiness(readService.Object, deleteService.Object, billing.Object, messaging.Object, uow.Object);
    }

    [Fact]
    public async Task DeleteCard_returns_updated_list_on_success()
    {
        var user = TestUserFactory.AnyUser();
        var readSvc = new Mock<ICardsReadService>();
        var deleteSvc = new Mock<ICardsDeleteService>();

        readSvc.Setup(s => s.GetCardsAsync(user, It.IsAny<CancellationToken>()))
            .ReturnsAsync([AnyCard]);
        deleteSvc.Setup(s => s.SoftDeleteCardAsync(user, 1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var business = Build(readSvc, deleteSvc);
        var response = await business.DeleteCardAsync(user, 1, CancellationToken.None);

        Assert.True(response.Success);
    }

    [Fact]
    public async Task DeleteCard_fails_with_404_when_card_not_found()
    {
        var readSvc = new Mock<ICardsReadService>();
        readSvc.Setup(s => s.GetCardsAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        var business = Build(readSvc, new Mock<ICardsDeleteService>());
        var response = await business.DeleteCardAsync(TestUserFactory.AnyUser(), 99, CancellationToken.None);

        Assert.False(response.Success);
        Assert.Equal(404, response.StatusCode);
    }

    #region archive — async event-publish (disabled in MVP)
    // UserCardDeleted had no live subscriber even pre-conversion, so the original tests did not
    // assert an EnqueueOutboxEventAsync call. The Mock<IMessagingInsertService> field is kept
    // in Build() because the CardsDeleteBusiness constructor still expects it for future
    // async-migration re-enable.
    #endregion
}
