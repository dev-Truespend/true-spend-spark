using Moq;
using TrueSpend.Domain.Business.Cards;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.ServiceInterfaces.Cards;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Persistence;
using TrueSpend.Domain.Validators;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Cards;

public sealed class CardsUpdateBusinessTests
{
    private static readonly CardSummary AnyCard =
        new(1, "Sample", "Bank", "1234", "manual", false, "active", null);

    private static readonly CardDetailResponse AnyDetail =
        new(AnyCard, [], null, null);

    private static readonly RewardOverridesResponse AnyOverrides =
        new([new RewardOverride("dining", "Dining", 3m, null)]);

    private static CardsUpdateBusiness Build(
        Mock<ICardsReadService> readService,
        Mock<ICardsUpdateService> updateService)
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

        return new CardsUpdateBusiness(
            readService.Object, updateService.Object, messaging.Object, uow.Object, new CardsValidator());
    }

    [Fact]
    public async Task UpdateCard_returns_detail_on_success()
    {
        var user = TestUserFactory.AnyUser();
        var readSvc = new Mock<ICardsReadService>();
        var updateSvc = new Mock<ICardsUpdateService>();

        updateSvc.Setup(s => s.FindCardAsync(user, 1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(AnyCard);
        updateSvc.Setup(s => s.UpdateCardAsync(user, 1, It.IsAny<UpdateCardRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(AnyCard);
        readSvc.Setup(s => s.GetCardDetailAsync(user, 1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(AnyDetail);

        var business = Build(readSvc, updateSvc);
        var response = await business.UpdateCardAsync(user, 1, new UpdateCardRequest(null, "1234", false), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Equal(AnyCard, response.Data!.Card);
    }

    [Fact]
    public async Task UpdateCard_fails_with_400_when_lastFour_invalid()
    {
        var business = Build(new Mock<ICardsReadService>(), new Mock<ICardsUpdateService>());
        var response = await business.UpdateCardAsync(
            TestUserFactory.AnyUser(), 1, new UpdateCardRequest(null, "12", false), CancellationToken.None);

        Assert.False(response.Success);
        Assert.Equal(400, response.StatusCode);
    }

    [Fact]
    public async Task UpdateCard_fails_with_404_when_card_not_found()
    {
        var updateSvc = new Mock<ICardsUpdateService>();
        updateSvc.Setup(s => s.FindCardAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((CardSummary?)null);

        var business = Build(new Mock<ICardsReadService>(), updateSvc);
        var response = await business.UpdateCardAsync(
            TestUserFactory.AnyUser(), 99, new UpdateCardRequest(null, null, false), CancellationToken.None);

        Assert.False(response.Success);
        Assert.Equal(404, response.StatusCode);
    }

    [Fact]
    public async Task UpsertRewardOverride_returns_updated_overrides()
    {
        var user = TestUserFactory.AnyUser();
        var readSvc = new Mock<ICardsReadService>();
        var updateSvc = new Mock<ICardsUpdateService>();

        updateSvc.Setup(s => s.FindCardAsync(user, 1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(AnyCard);
        updateSvc.Setup(s => s.UpsertRewardOverrideAsync(user, 1, It.IsAny<UpsertRewardOverrideRequest>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        readSvc.Setup(s => s.GetRewardOverridesAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(AnyOverrides);

        var business = Build(readSvc, updateSvc);
        var response = await business.UpsertRewardOverrideAsync(
            user, 1, new UpsertRewardOverrideRequest("dining", 3m, null), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Single(response.Data!.RewardRules);
    }

    [Fact]
    public async Task UpsertRewardOverride_fails_with_400_when_multiplier_zero()
    {
        var business = Build(new Mock<ICardsReadService>(), new Mock<ICardsUpdateService>());
        var response = await business.UpsertRewardOverrideAsync(
            TestUserFactory.AnyUser(), 1, new UpsertRewardOverrideRequest("dining", 0m, null), CancellationToken.None);

        Assert.False(response.Success);
        Assert.Equal(400, response.StatusCode);
    }
}
