using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.ServiceInterfaces.Cards;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Models.Onboarding;
using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.Entities.Finance;

namespace TrueSpend.Domain.Services.Cards;

public sealed class CardsUpdateService(TrueSpendDbContext db) : ICardsUpdateService
{
    public async Task<CardSummary?> FindCardAsync(OnboardingWorkflowUser user, int cardId, CancellationToken cancellationToken)
    {
        return await (from card in db.UserCards.AsNoTracking().Where(x => x.UserId == user.UserId && x.Id == cardId && x.IsActive)
                      join product in db.CardProducts.AsNoTracking() on card.CardProductId equals product.Id into productJoin
                      from product in productJoin.DefaultIfEmpty()
                      join issuer in db.CardIssuers.AsNoTracking() on product.IssuerId equals issuer.Id into issuerJoin
                      from issuer in issuerJoin.DefaultIfEmpty()
                      join source in db.CardSources.AsNoTracking() on card.SourceId equals source.Id into sourceJoin
                      from source in sourceJoin.DefaultIfEmpty()
                      select new CardSummary(
                          card.Id,
                          card.Nickname ?? product.DisplayName ?? card.CustomCardName ?? "Card",
                          issuer.DisplayName ?? card.CustomIssuerName ?? "Unknown issuer",
                          card.LastFour,
                          source.Code ?? "manual",
                          card.IsPrimary,
                          card.SyncStatus,
                          product.CardArtUrl))
                     .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<CardSummary> UpdateCardAsync(OnboardingWorkflowUser user, int cardId, UpdateCardRequest request, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;

        if (request.IsPrimary)
        {
            var existingPrimaries = await db.UserCards
                .Where(x => x.UserId == user.UserId && x.IsPrimary && x.Id != cardId)
                .ToListAsync(cancellationToken);
            foreach (var existing in existingPrimaries)
            {
                existing.IsPrimary = false;
                existing.UpdatedAt = now;
            }
        }

        var entity = await db.UserCards.FirstAsync(x => x.Id == cardId && x.UserId == user.UserId, cancellationToken);
        entity.Nickname = request.Nickname;
        entity.LastFour = request.LastFour;
        entity.IsPrimary = request.IsPrimary;
        entity.UpdatedAt = now;
        await db.SaveChangesAsync(cancellationToken);

        return await FindCardAsync(user, cardId, cancellationToken) ?? throw new InvalidOperationException("Card not found after update.");
    }

    public async Task SetPrimaryAsync(OnboardingWorkflowUser user, int cardId, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var existing = await db.UserCards
            .Where(x => x.UserId == user.UserId && x.IsPrimary && x.Id != cardId)
            .ToListAsync(cancellationToken);
        foreach (var c in existing) { c.IsPrimary = false; c.UpdatedAt = now; }

        var target = await db.UserCards.FirstAsync(x => x.Id == cardId && x.UserId == user.UserId, cancellationToken);
        target.IsPrimary = true;
        target.UpdatedAt = now;
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task UpsertRewardOverrideAsync(OnboardingWorkflowUser user, int cardId, UpsertRewardOverrideRequest request, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;

        var category = await db.Categories.AsNoTracking()
            .Where(x => x.Code == request.CategoryCode)
            .Select(x => new { x.Id })
            .FirstOrDefaultAsync(cancellationToken);
        short? categoryId = (short?)category?.Id;

        var existing = await db.CardRewardOverrides
            .Where(x => x.UserCardId == cardId && x.CategoryId == categoryId)
            .FirstOrDefaultAsync(cancellationToken);

        if (existing is not null)
        {
            existing.Multiplier = request.Multiplier;
            existing.Notes = request.Notes;
            existing.UpdatedAt = now;
        }
        else
        {
            db.CardRewardOverrides.Add(new CardRewardOverrideEntity
            {
                UserCardId = cardId,
                CategoryId = categoryId,
                Multiplier = request.Multiplier,
                Notes = request.Notes,
                CreatedAt = now,
                UpdatedAt = now
            });
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteRewardOverrideAsync(OnboardingWorkflowUser user, int cardId, DeleteRewardOverrideRequest request, CancellationToken cancellationToken)
    {
        var category = await db.Categories.AsNoTracking()
            .Where(x => x.Code == request.CategoryCode)
            .Select(x => new { x.Id })
            .FirstOrDefaultAsync(cancellationToken);
        short? categoryId = (short?)category?.Id;

        var existing = await db.CardRewardOverrides
            .Where(x => x.UserCardId == cardId && x.CategoryId == categoryId)
            .FirstOrDefaultAsync(cancellationToken);

        if (existing is not null)
        {
            db.CardRewardOverrides.Remove(existing);
            await db.SaveChangesAsync(cancellationToken);
        }
    }
}
