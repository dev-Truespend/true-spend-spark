using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.ServiceInterfaces.Plaid;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Entities.Finance;

namespace TrueSpend.Domain.Services.Plaid;

public sealed class PlaidInsertService(TrueSpendDbContext db) : IPlaidInsertService
{
    public async Task<PlaidPersistResult> PersistPlaidConnectionAsync(
        OnboardingWorkflowUser user,
        PlaidExchangeResult exchange,
        CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;

        var itemStatusId = await db.PlaidItemStatuses.AsNoTracking()
            .Where(s => s.Code == "connected")
            .Select(s => s.Id)
            .FirstOrDefaultAsync(cancellationToken);
        if (itemStatusId == 0) itemStatusId = (short)PlaidItemStatusEnum.Connected;

        var item = new PlaidItemEntity
        {
            UserId = user.UserId,
            PlaidItemId = exchange.ItemId,
            PlaidInstitutionId = exchange.InstitutionId,
            InstitutionName = exchange.InstitutionName,
            InstitutionLogoUrl = exchange.InstitutionLogoUrl,
            AccessTokenEncrypted = exchange.AccessToken,
            StatusId = itemStatusId,
            LastSyncAt = now,
            CreatedAt = now,
            UpdatedAt = now
        };
        db.PlaidItems.Add(item);
        await db.SaveChangesAsync(cancellationToken);

        // Insert all accounts in one round-trip instead of a SaveChanges per account.
        // EF backfills each entity's generated Id on the single save, so the result list is
        // built afterwards from the same tracked entities.
        var accountEntities = exchange.Accounts
            .Select(accountInfo => new PlaidAccountEntity
            {
                PlaidItemId = item.Id,
                PlaidAccountId = accountInfo.AccountId,
                AccountName = accountInfo.Name,
                Subtype = accountInfo.Subtype,
                Mask = accountInfo.Mask,
                CreatedAt = now,
                UpdatedAt = now
            })
            .ToList();

        if (accountEntities.Count > 0)
        {
            db.PlaidAccounts.AddRange(accountEntities);
            await db.SaveChangesAsync(cancellationToken);
        }

        var accounts = accountEntities
            .Select(a => new PlaidPersistedAccount(a.Id, a.AccountName, a.Mask))
            .ToList();

        return new PlaidPersistResult(item.Id, exchange.InstitutionName, accounts);
    }

    public async Task InsertPlaidUserCardAsync(
        OnboardingWorkflowUser user,
        int plaidAccountRowId,
        string accountName,
        string? mask,
        int? cardProductId,
        CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;

        var cardSourceId = await db.CardSources.AsNoTracking()
            .Where(s => s.Code == "plaid")
            .Select(s => s.Id)
            .FirstOrDefaultAsync(cancellationToken);
        if (cardSourceId == 0) cardSourceId = (short)CardSourceEnum.Plaid;

        db.UserCards.Add(new UserCardEntity
        {
            UserId = user.UserId,
            PlaidAccountId = plaidAccountRowId,
            CardProductId = cardProductId,
            SourceId = cardSourceId,
            SyncStatus = CardsConstants.DefaultSyncStatus,
            Nickname = accountName,
            LastFour = mask,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        });
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<PlaidConnectionResponse> GetCurrentStateAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken)
    {
        var rows = await (from plaidItem in db.PlaidItems.AsNoTracking().Where(x => x.UserId == user.UserId)
                          join status in db.PlaidItemStatuses.AsNoTracking() on plaidItem.StatusId equals status.Id
                          join account in db.PlaidAccounts.AsNoTracking() on plaidItem.Id equals account.PlaidItemId into accounts
                          from acct in accounts.DefaultIfEmpty()
                          join userCard in db.UserCards.AsNoTracking().Where(c => c.UserId == user.UserId && c.IsActive)
                              on acct.Id equals userCard.PlaidAccountId into cards
                          from uc in cards.DefaultIfEmpty()
                          select new
                          {
                              ItemId = plaidItem.Id,
                              plaidItem.InstitutionName,
                              plaidItem.InstitutionLogoUrl,
                              StatusCode = status.Code,
                              plaidItem.LastSyncAt,
                              AccountName = acct != null ? acct.AccountName : null,
                              AccountMask = acct != null ? acct.Mask : null,
                              Card = uc
                          }).ToListAsync(cancellationToken);

        var connections = rows
            .GroupBy(r => new { r.ItemId, r.InstitutionName, r.InstitutionLogoUrl, r.StatusCode, r.LastSyncAt })
            .Select(g => new PlaidConnection(
                g.Key.ItemId,
                g.Key.InstitutionName,
                g.Key.InstitutionLogoUrl,
                g.Key.StatusCode,
                g.Key.LastSyncAt,
                g.Count(r => r.Card != null)))
            .OrderByDescending(c => c.LastSyncAt)
            .ToList();

        var cardSummaries = rows
            .Where(r => r.Card != null)
            .Select(r => new CardSummary(
                r.Card!.Id,
                r.Card.Nickname ?? r.AccountName ?? "Card",
                r.InstitutionName,
                r.Card.LastFour ?? r.AccountMask,
                "plaid",
                r.Card.IsPrimary,
                r.Card.SyncStatus,
                null))
            .ToList();

        return new PlaidConnectionResponse(connections, cardSummaries, "complete");
    }
}
