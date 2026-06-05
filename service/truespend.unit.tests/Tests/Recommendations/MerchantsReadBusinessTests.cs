using Moq;
using TrueSpend.Domain.Business.Merchants;
using TrueSpend.Domain.Models.Recommendations;
using TrueSpend.Domain.ServiceInterfaces.Merchants;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Recommendations;

public sealed class MerchantsReadBusinessTests
{
    [Fact]
    public async Task GetMerchant_returns_merchant_when_found()
    {
        var merchant = new Merchant(1, "Target", "home_goods", true, "1 Main St");
        var service = new Mock<IMerchantsReadService>();
        service.Setup(s => s.GetMerchantAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(merchant);
        var business = new MerchantsReadBusiness(service.Object);

        var response = await business.GetMerchantAsync(1, CancellationToken.None);

        Assert.True(response.Success);
        Assert.Equal(merchant, response.Data!.Merchant);
    }

    [Fact]
    public async Task GetMerchant_returns_404_when_missing()
    {
        var service = new Mock<IMerchantsReadService>();
        service.Setup(s => s.GetMerchantAsync(It.IsAny<int>(), It.IsAny<CancellationToken>())).ReturnsAsync((Merchant?)null);
        var business = new MerchantsReadBusiness(service.Object);

        var response = await business.GetMerchantAsync(999, CancellationToken.None);

        Assert.False(response.Success);
        Assert.Equal(404, response.StatusCode);
    }
}
