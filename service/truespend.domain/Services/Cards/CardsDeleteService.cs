using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.ServiceInterfaces.Cards;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Models.Onboarding;
using Microsoft.EntityFrameworkCore;

namespace TrueSpend.Domain.Services.Cards;

public sealed class CardsDeleteService(TrueSpendDbContext db) : ICardsDeleteService
{
    public async Task<bool> SoftDeleteCardAsync(OnboardingWorkflowUser user, int cardId, CancellationToken cancellationToken)
    {
        var entity = await db.UserCards
            .FirstOrDefaultAsync(x => x.UserId == user.UserId && x.Id == cardId && x.IsActive, cancellationToken);
        if (entity is null) return false;

        entity.IsActive = false;
        entity.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }
}
