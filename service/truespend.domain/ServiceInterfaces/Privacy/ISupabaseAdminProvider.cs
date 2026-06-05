namespace TrueSpend.Domain.ServiceInterfaces.Privacy;

public interface ISupabaseAdminProvider
{
    Task DeleteAuthUserAsync(Guid userId, CancellationToken cancellationToken);
}
