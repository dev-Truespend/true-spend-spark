namespace TrueSpend.Domain.ServiceInterfaces.Profile;

public interface IProfileLookupService
{
    Task<bool> CountryExistsAsync(string code, CancellationToken cancellationToken);

    Task<bool> CurrencyExistsAsync(string code, CancellationToken cancellationToken);
}
