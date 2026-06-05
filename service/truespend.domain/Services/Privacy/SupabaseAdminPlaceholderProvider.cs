using Microsoft.Extensions.Logging;
using TrueSpend.Domain.ServiceInterfaces.Privacy;

namespace TrueSpend.Domain.Services.Privacy;

public sealed class SupabaseAdminPlaceholderProvider(ILogger<SupabaseAdminPlaceholderProvider> logger) : ISupabaseAdminProvider
{
    public Task DeleteAuthUserAsync(Guid userId, CancellationToken cancellationToken)
    {
        logger.LogInformation("Placeholder Supabase admin DELETE auth user for {UserId} (no remote call made)", userId);
        return Task.CompletedTask;
    }
}
