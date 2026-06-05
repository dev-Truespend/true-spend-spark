using Moq;
using TrueSpend.Domain.Business.Cards;
using TrueSpend.Domain.Models.Cards;
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

    private static CardsDeleteBusiness Build(Mock<ICardsReadService> readService, Mock<ICardsDeleteService> deleteService)
    {
        var tx = new Mock<IUnitOfWorkTransaction>();
        tx.Setup(t => t.CommitAsync(It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        tx.Setup(t => t.DisposeAsync()).Returns(ValueTask.CompletedTask);

        var uow = new Mock<IUnitOfWork>();
        uow.Setup(u => u.BeginTransactionAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(tx.Object);

        var messaging = new Mock<IMessagingInsertService>();
        messaging.Setup(m => m.EnqueueOutboxEventAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int?>(),
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        return new CardsDeleteBusiness(readService.Object, deleteService.Object, messaging.Object, uow.Object);
    }

    [Fact]
    public async Task DeleteCard_returns_updated_list_on_success()
    {
        var user = TestUserFactory.AnyUser();
        var readSvc = new Mock<ICardsReadService>();
        var deleteSvc = new Mock<ICardsDeleteService>();

        readSvc.Setup(s => s.GetCardsAsync(user, It.IsAny<CancellationToken>()))
            .ReturnsAsync([AnyCard]);
        readSvc.Setup(s => s.CurrentPlanCodeAsync(user, It.IsAny<CancellationToken>()))
            .ReturnsAsync("basic");
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
}
