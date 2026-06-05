using Moq;
using TrueSpend.Domain.Business.Catalog;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.Models.Permissions;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Recommendations;
using TrueSpend.Domain.ServiceInterfaces.Catalog;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Catalog;

public sealed class CatalogReadBusinessTests
{
    [Fact]
    public async Task GetIssuers_wraps_service_results()
    {
        var issuers = new[] { new Issuer(1, "Chase", null) };
        var service = new Mock<ICatalogReadService>();
        service.Setup(s => s.GetIssuersAsync(It.IsAny<CancellationToken>())).ReturnsAsync(issuers);
        var business = new CatalogReadBusiness(service.Object);

        var response = await business.GetIssuersAsync(CancellationToken.None);

        Assert.True(response.Success);
        Assert.Equal(issuers, response.Data!.Issuers);
    }

    [Fact]
    public async Task GetProducts_forwards_filter_arguments_to_service()
    {
        var products = new[] { new CardProduct(1, "Chase", "Sapphire", null, null, null) };
        var service = new Mock<ICatalogReadService>();
        service.Setup(s => s.GetProductsAsync(7, "sapphire", It.IsAny<CancellationToken>())).ReturnsAsync(products);
        var business = new CatalogReadBusiness(service.Object);

        var response = await business.GetProductsAsync(7, "sapphire", CancellationToken.None);

        Assert.True(response.Success);
        Assert.Equal(products, response.Data!.Products);
    }

    [Fact]
    public async Task GetCategories_returns_service_categories()
    {
        var categories = new[] { new Category(1, "groceries", "Groceries", null) };
        var service = new Mock<ICatalogReadService>();
        service.Setup(s => s.GetCategoriesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(categories);
        var business = new CatalogReadBusiness(service.Object);

        var response = await business.GetCategoriesAsync(CancellationToken.None);

        Assert.Equal(categories, response.Data!.Categories);
    }
}
