using Moq;
using TrueSpend.Domain.Business.Catalog;
using TrueSpend.Domain.ServiceInterfaces.Catalog;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Catalog;

public sealed class CardCatalogMappingReviewBusinessTests
{
    [Fact]
    public async Task Run_returns_empty_when_no_missing_mappings_found()
    {
        var service = new Mock<ICardCatalogReviewService>();
        service.Setup(s => s.GetIssuersMissingMappingAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<(string, string)>());
        service.Setup(s => s.GetCardProductsMissingMappingAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<(string, string, string)>());
        service.Setup(s => s.UpsertReviewItemsAsync(It.IsAny<IReadOnlyList<(string, string, string, decimal?, string?)>>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);
        var business = new CardCatalogMappingReviewBusiness(service.Object);

        var result = await business.RunAsync(DateTimeOffset.UtcNow, CancellationToken.None);

        Assert.Equal(0, result.ReviewItemsCreated);
        Assert.Equal(0, result.AutoResolved);
        service.Verify(s => s.AutoResolvePendingItemsAsync(It.IsAny<IReadOnlyCollection<(string, string)>>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Run_upserts_review_items_and_auto_resolves_resolved_keys()
    {
        var service = new Mock<ICardCatalogReviewService>();
        service.Setup(s => s.GetIssuersMissingMappingAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { ("rcc-issuer-unknown", "Unknown Bank") });
        service.Setup(s => s.GetCardProductsMissingMappingAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { ("rcc-card-unknown", "rcc-issuer-unknown", "Unknown Card") });
        service.Setup(s => s.UpsertReviewItemsAsync(It.IsAny<IReadOnlyList<(string, string, string, decimal?, string?)>>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(2);
        service.Setup(s => s.AutoResolvePendingItemsAsync(It.IsAny<IReadOnlyCollection<(string, string)>>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(1);
        var business = new CardCatalogMappingReviewBusiness(service.Object);

        var result = await business.RunAsync(DateTimeOffset.UtcNow, CancellationToken.None);

        Assert.Equal(2, result.ReviewItemsCreated);
        Assert.Equal(1, result.AutoResolved);
    }
}
