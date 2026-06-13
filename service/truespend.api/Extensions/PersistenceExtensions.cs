using Microsoft.EntityFrameworkCore;
using Npgsql;
using TrueSpend.Domain.DbContext;

namespace TrueSpend.Api.Extensions;

public static class PersistenceExtensions
{
    // Cap the per-replica Npgsql pool so it can never exhaust the session-mode Supabase
    // pooler (pool_size). Replicas are pinned to 1 (terraform), so api(1) + worker(1) hold
    // at most 2 x MaxPoolSize connections — keep that comfortably under the pooler size.
    private const int MaxPoolSize = 6;

    public static IServiceCollection AddTrueSpendDb(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("TrueSpendDb") ?? string.Empty;
        services.AddDbContext<TrueSpendDbContext>(options =>
        {
            if (!string.IsNullOrWhiteSpace(connectionString))
            {
                var builder = new NpgsqlConnectionStringBuilder(connectionString)
                {
                    MaxPoolSize = MaxPoolSize,
                    MinPoolSize = 0,
                };
                options.UseNpgsql(builder.ConnectionString);
            }
        });
        return services;
    }
}
