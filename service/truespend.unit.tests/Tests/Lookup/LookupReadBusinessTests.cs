using Moq;
using TrueSpend.Domain.Business.Lookup;
using TrueSpend.Domain.Models.Lookup;
using TrueSpend.Domain.ServiceInterfaces.Lookup;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Lookup;

public sealed class LookupReadBusinessTests
{
    [Fact]
    public async Task GetCurrencies_wraps_service_list_in_response()
    {
        var currencies = new[] { new CurrencyOption("USD", "US Dollar", "$") };
        var service = new Mock<ILookupReadService>();
        service.Setup(s => s.GetCurrenciesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(currencies);

        var business = new LookupReadBusiness(service.Object);
        var response = await business.GetCurrenciesAsync(CancellationToken.None);

        Assert.True(response.Success);
        Assert.Single(response.Data!.Currencies);
        Assert.Equal("USD", response.Data!.Currencies[0].Code);
    }
}
