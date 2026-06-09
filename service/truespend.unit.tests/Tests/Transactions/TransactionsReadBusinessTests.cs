using Moq;
using TrueSpend.Domain.Business.Transactions;
using TrueSpend.Domain.BusinessInterfaces.Billing;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Transactions;
using TrueSpend.Domain.ServiceInterfaces.Transactions;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Transactions;

public sealed class TransactionsReadBusinessTests
{
    private static TransactionDetail SampleDetail() =>
        new(1, "Amazon", 100m, "USD", 1, "My Card", "shopping", "Shopping",
            new DateOnly(2026, 1, 10), null, null, null, null, "manual", false);

    [Fact]
    public async Task GetTransactions_returns_results()
    {
        var read = new Mock<ITransactionsReadService>();
        read.Setup(r => r.GetTransactionsAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<TransactionListQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Transaction>
            {
                new(1, "Amazon", 100m, "USD", 1, "My Card", "shopping", "Shopping",
                    new DateOnly(2026, 1, 10), null, null, "manual", false, null, 1m, null, null)
            });

        var business = new TransactionsReadBusiness(read.Object, BillingReadStub(plaidViewEnabled: true).Object);
        var response = await business.GetTransactionsAsync(TestUserFactory.AnyUser(), new TransactionListQuery(null, null, null), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Single(response.Data!.Transactions);
        Assert.False(response.Data.EmptyState);
    }

    [Fact]
    public async Task GetTransactionDetail_returns_detail_with_reward()
    {
        var read = new Mock<ITransactionsReadService>();
        read.Setup(r => r.GetTransactionDetailAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(SampleDetail());
        read.Setup(r => r.GetRewardResultAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TransactionRewardResult(0.01m, 1m, null, null));
        read.Setup(r => r.GetMissedRewardAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((MissedReward?)null);

        var business = new TransactionsReadBusiness(read.Object, BillingReadStub(plaidViewEnabled: true).Object);
        var response = await business.GetTransactionDetailAsync(TestUserFactory.AnyUser(), 1, CancellationToken.None);

        Assert.True(response.Success);
        Assert.NotNull(response.Data!.Transaction);
        Assert.NotNull(response.Data.RewardResult);
    }

    [Fact]
    public async Task GetTransactions_filters_plaid_rows_when_view_gate_disabled()
    {
        var read = new Mock<ITransactionsReadService>();
        read.Setup(r => r.GetTransactionsAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<TransactionListQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Transaction>
            {
                new(1, "Amazon", 100m, "USD", 1, "My Card", "shopping", "Shopping",
                    new DateOnly(2026, 1, 10), null, null, "manual", false, null, 1m, null, null),
                new(2, "Sandbox Bank", 50m, "USD", 1, "My Card", "shopping", "Shopping",
                    new DateOnly(2026, 1, 11), null, null, "plaid", false, null, 0.5m, null, null)
            });

        var business = new TransactionsReadBusiness(read.Object, BillingReadStub(plaidViewEnabled: false).Object);
        var response = await business.GetTransactionsAsync(TestUserFactory.AnyUser(), new TransactionListQuery(null, null, null), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Single(response.Data!.Transactions);
        Assert.Equal("manual", response.Data.Transactions[0].Source);
    }

    [Fact]
    public async Task GetTransactionDetail_returns_404_for_plaid_row_when_view_gate_disabled()
    {
        var plaidDetail = new TransactionDetail(2, "Sandbox Bank", 50m, "USD", 1, "My Card", "shopping", "Shopping",
            new DateOnly(2026, 1, 11), null, null, null, null, "plaid", false);
        var read = new Mock<ITransactionsReadService>();
        read.Setup(r => r.GetTransactionDetailAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(plaidDetail);

        var business = new TransactionsReadBusiness(read.Object, BillingReadStub(plaidViewEnabled: false).Object);
        var response = await business.GetTransactionDetailAsync(TestUserFactory.AnyUser(), 2, CancellationToken.None);

        Assert.False(response.Success);
        Assert.Equal(404, response.StatusCode);
    }

    [Fact]
    public async Task GetTransactionDetail_returns_404_when_not_found()
    {
        var read = new Mock<ITransactionsReadService>();
        read.Setup(r => r.GetTransactionDetailAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((TransactionDetail?)null);

        var business = new TransactionsReadBusiness(read.Object, BillingReadStub(plaidViewEnabled: true).Object);
        var response = await business.GetTransactionDetailAsync(TestUserFactory.AnyUser(), 99, CancellationToken.None);

        Assert.False(response.Success);
        Assert.Equal(404, response.StatusCode);
    }

    private static Mock<IBillingReadBusiness> BillingReadStub(bool plaidViewEnabled)
    {
        var billing = new Mock<IBillingReadBusiness>();
        billing.Setup(b => b.GetEntitlementsAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(BusinessResponse<EntitlementsResponse>.Ok(new EntitlementsResponse(
                PlanCode: plaidViewEnabled ? "pro" : "basic",
                Trialing: false,
                TrialEndsAt: null,
                ManualCardLimit: plaidViewEnabled ? null : 3,
                PlaidCardLimit: plaidViewEnabled ? null : 3,
                GeoRecommendationsPerDay: plaidViewEnabled ? null : 3,
                UnlimitedCards: plaidViewEnabled,
                AiInsightsEnabled: plaidViewEnabled,
                PlaidLinkingEnabled: plaidViewEnabled,
                PlaidTransactionsViewEnabled: plaidViewEnabled,
                GeofencingEnabled: true,
                Features: new Dictionary<string, string>())));
        return billing;
    }
}
