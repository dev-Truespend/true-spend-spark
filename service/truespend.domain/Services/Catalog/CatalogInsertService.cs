using TrueSpend.Domain.Entities.Catalog;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.ServiceInterfaces.Catalog;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Models.Onboarding;

namespace TrueSpend.Domain.Services.Catalog;

public sealed class CatalogInsertService(TrueSpendDbContext db) : ICatalogInsertService
{
    public async Task<CardProductRequest> InsertProductRequestAsync(
        OnboardingWorkflowUser user,
        string issuerName,
        string cardName,
        CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var entity = new CardProductRequestEntity
        {
            UserId = user.UserId,
            IssuerName = issuerName,
            CardName = cardName,
            Status = "pending",
            CreatedAt = now,
            UpdatedAt = now
        };
        db.CardProductRequests.Add(entity);
        await db.SaveChangesAsync(cancellationToken);

        return new CardProductRequest(entity.Id, entity.IssuerName, entity.CardName, entity.Status);
    }
}
