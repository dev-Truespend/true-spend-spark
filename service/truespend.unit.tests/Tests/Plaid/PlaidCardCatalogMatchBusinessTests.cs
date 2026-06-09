using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using TrueSpend.Domain.Business.Plaid;
using TrueSpend.Domain.ServiceInterfaces.Catalog;
using TrueSpend.Domain.ServiceInterfaces.Plaid;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Plaid;

public sealed class PlaidCardCatalogMatchBusinessTests
{
    [Fact]
    public async Task MatchOneAsync_picks_candidate_with_highest_token_overlap()
    {
        var catalogRead = new Mock<ICatalogReadService>();
        catalogRead.Setup(c => c.GetCardMatchCandidatesAsync("Bank of America", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<CatalogCardMatchCandidate>
            {
                new(11, "Bank of America", "Bank of America Customized Cash Rewards"),
                new(12, "Bank of America", "Bank of America Travel Rewards Credit Card"),
                new(13, "Bank of America", "Bank of America Premium Rewards"),
            });
        var business = NewBusiness(catalogRead);

        var result = await business.MatchOneAsync("Bank of America", "Travel Rewards", CancellationToken.None);

        Assert.Equal(12, result);
    }

    [Fact]
    public async Task MatchOneAsync_returns_null_when_no_candidate_shares_tokens()
    {
        var catalogRead = new Mock<ICatalogReadService>();
        catalogRead.Setup(c => c.GetCardMatchCandidatesAsync("First Platypus Bank", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<CatalogCardMatchCandidate>());
        var business = NewBusiness(catalogRead);

        var result = await business.MatchOneAsync("First Platypus Bank", "Plaid Credit Card", CancellationToken.None);

        Assert.Null(result);
    }

    [Fact]
    public async Task MatchAllOrphansAsync_back_fills_matched_cards_only()
    {
        var catalogRead = new Mock<ICatalogReadService>();
        catalogRead.Setup(c => c.GetCardMatchCandidatesAsync("Bank of America", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<CatalogCardMatchCandidate>
            {
                new(12, "Bank of America", "Bank of America Travel Rewards Credit Card"),
            });
        catalogRead.Setup(c => c.GetCardMatchCandidatesAsync("Mystery Bank", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<CatalogCardMatchCandidate>());
        var plaidUpdate = new Mock<IPlaidUpdateService>();
        plaidUpdate.Setup(p => p.GetUnmatchedPlaidUserCardsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<PlaidUserCardMatchContext>
            {
                new(7, "Bank of America", "Travel Rewards"),
                new(8, "Mystery Bank", "Plaid Credit Card"),
            });
        var business = new PlaidCardCatalogMatchBusiness(catalogRead.Object, plaidUpdate.Object, NullLogger<PlaidCardCatalogMatchBusiness>.Instance);

        var result = await business.MatchAllOrphansAsync(DateTimeOffset.UtcNow, CancellationToken.None);

        Assert.Equal(1, result.Matched);
        Assert.Equal(1, result.Skipped);
        plaidUpdate.Verify(p => p.SetUserCardProductIdAsync(7, 12, It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()), Times.Once);
        plaidUpdate.Verify(p => p.SetUserCardProductIdAsync(8, It.IsAny<int>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    private static PlaidCardCatalogMatchBusiness NewBusiness(Mock<ICatalogReadService> catalogRead) =>
        new(catalogRead.Object, Mock.Of<IPlaidUpdateService>(), NullLogger<PlaidCardCatalogMatchBusiness>.Instance);
}
