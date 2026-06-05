using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.DbContext;

namespace TrueSpend.Api.Extensions;

public static class PersistenceExtensions
{
    public static IServiceCollection AddTrueSpendDb(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("TrueSpendDb") ?? string.Empty;
        services.AddDbContext<TrueSpendDbContext>(options =>
        {
            if (!string.IsNullOrWhiteSpace(connectionString))
            {
                options.UseNpgsql(connectionString);
            }
        });
        return services;
    }
}
