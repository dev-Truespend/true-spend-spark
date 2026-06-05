using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using TrueSpend.Domain.Business.Plaid;
using TrueSpend.Domain.Exceptions;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.ServiceInterfaces.Plaid;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Plaid;

public sealed class PlaidInstitutionsCatalogBusinessTests
{
    [Fact]
    public async Task SyncCatalog_upserts_and_deactivates_missing()
    {
        var now = DateTimeOffset.UtcNow;
        var institutions = new List<PlaidInstitutionData>
        {
            new("ins_3", "Chase", "US", null, null, null, true, Array.Empty<string>(), Array.Empty<string>()),
            new("ins_4", "Wells Fargo", "US", null, null, null, true, Array.Empty<string>(), Array.Empty<string>()),
        };
        var provider = new Mock<IPlaidProvider>();
        provider.Setup(p => p.GetInstitutionsAsync(
                It.IsAny<IReadOnlyCollection<string>>(),
                It.IsAny<IReadOnlyCollection<string>>(),
                It.IsAny<int>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(institutions);
        var catalog = new Mock<IPlaidInstitutionsCatalogService>();
        catalog.Setup(c => c.UpsertInstitutionsAsync(institutions, now, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new InstitutionUpsertCounts(1, 1));
        catalog.Setup(c => c.DeactivateMissingInstitutionsAsync(
                It.Is<IReadOnlyCollection<string>>(s => s.Count == 2),
                now,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(3);
        var business = new PlaidInstitutionsCatalogBusiness(provider.Object, catalog.Object, NullLogger<PlaidInstitutionsCatalogBusiness>.Instance);

        var result = await business.SyncCatalogAsync(now, CancellationToken.None);

        Assert.Equal(2, result.Processed);
        Assert.Equal(1, result.Created);
        Assert.Equal(1, result.Updated);
        Assert.Equal(3, result.Deactivated);
        Assert.Equal(0, result.Failed);
    }

    [Fact]
    public async Task SyncCatalog_returns_empty_when_provider_returns_no_institutions()
    {
        var provider = new Mock<IPlaidProvider>();
        provider.Setup(p => p.GetInstitutionsAsync(
                It.IsAny<IReadOnlyCollection<string>>(),
                It.IsAny<IReadOnlyCollection<string>>(),
                It.IsAny<int>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<PlaidInstitutionData>());
        var catalog = new Mock<IPlaidInstitutionsCatalogService>();
        var business = new PlaidInstitutionsCatalogBusiness(provider.Object, catalog.Object, NullLogger<PlaidInstitutionsCatalogBusiness>.Instance);

        var result = await business.SyncCatalogAsync(DateTimeOffset.UtcNow, CancellationToken.None);

        Assert.Equal(0, result.Processed);
        catalog.Verify(c => c.UpsertInstitutionsAsync(
            It.IsAny<IReadOnlyList<PlaidInstitutionData>>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task SyncCatalog_reports_failure_when_provider_throws_external_provider_exception()
    {
        var provider = new Mock<IPlaidProvider>();
        provider.Setup(p => p.GetInstitutionsAsync(
                It.IsAny<IReadOnlyCollection<string>>(),
                It.IsAny<IReadOnlyCollection<string>>(),
                It.IsAny<int>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ExternalProviderAppException("plaid", "boom"));
        var catalog = new Mock<IPlaidInstitutionsCatalogService>();
        var business = new PlaidInstitutionsCatalogBusiness(provider.Object, catalog.Object, NullLogger<PlaidInstitutionsCatalogBusiness>.Instance);

        var result = await business.SyncCatalogAsync(DateTimeOffset.UtcNow, CancellationToken.None);

        Assert.Equal(1, result.Failed);
        Assert.Equal(0, result.Processed);
    }
}
