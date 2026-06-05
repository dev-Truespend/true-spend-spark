namespace TrueSpend.Domain.BusinessInterfaces.Cards;

public interface ICardsCacheInvalidatorBusiness
{
    Task InvalidateAsync(Guid userId, CancellationToken cancellationToken);
}
