using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.ServiceInterfaces.Cards;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.Entities.Finance;

namespace TrueSpend.Domain.Services.Cards;

public sealed class CardsInsertService(TrueSpendDbContext db) : ICardsInsertService
{
    public async Task<CardSummary> InsertCardAsync(
        OnboardingWorkflowUser user,
        int? cardProductId,
        CardSummary card,
        CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;

        if (card.IsPrimary)
        {
            var existingPrimaries = await db.UserCards
                .Where(x => x.UserId == user.UserId && x.IsPrimary)
                .ToListAsync(cancellationToken);
            foreach (var existing in existingPrimaries)
            {
                existing.IsPrimary = false;
                existing.UpdatedAt = now;
            }
        }

        var sourceId = await db.CardSources.AsNoTracking()
            .Where(x => x.Code == card.Source)
            .Select(x => x.Id)
            .FirstOrDefaultAsync(cancellationToken);
        if (sourceId == 0) sourceId = (short)CardSourceEnum.Manual;

        var entity = new UserCardEntity
        {
            UserId = user.UserId,
            CardProductId = cardProductId,
            SourceId = sourceId,
            SyncStatus = card.SyncStatus,
            CustomIssuerName = cardProductId is null ? card.IssuerName : null,
            CustomCardName = cardProductId is null ? card.DisplayName : null,
            Nickname = card.IsPrimary ? card.DisplayName : null,
            LastFour = card.LastFour,
            IsPrimary = card.IsPrimary,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        };
        db.UserCards.Add(entity);
        await db.SaveChangesAsync(cancellationToken);

        return card with { Id = entity.Id };
    }

    public Task<CardProduct?> FindProductAsync(int productId, CancellationToken cancellationToken) =>
        (from product in db.CardProducts.AsNoTracking().Where(x => x.Id == productId)
         join issuer in db.CardIssuers.AsNoTracking() on product.IssuerId equals issuer.Id
         select new CardProduct(
             product.Id,
             issuer.DisplayName,
             product.DisplayName,
             product.CardArtUrl,
             product.AnnualFee,
             product.RewardCurrencyName))
        .FirstOrDefaultAsync(cancellationToken);

    public Task<Issuer?> FindIssuerAsync(int issuerId, CancellationToken cancellationToken) =>
        db.CardIssuers.AsNoTracking()
            .Where(x => x.Id == issuerId)
            .Select(x => new Issuer(x.Id, x.DisplayName, x.LogoUrl))
            .FirstOrDefaultAsync(cancellationToken);
}
