using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.ServiceInterfaces.Plaid;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Constants;
using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.Models.Cards;

namespace TrueSpend.Domain.Services.Plaid;

public sealed class PlaidUpdateService(TrueSpendDbContext db) : IPlaidUpdateService
{
    public async Task SyncConnectionAsync(int connectionId, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var item = await db.PlaidItems.FirstOrDefaultAsync(x => x.Id == connectionId, cancellationToken);
        if (item is null) return;
        item.LastSyncAt = now;
        item.UpdatedAt = now;
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<int>> DisconnectConnectionAsync(int connectionId, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;

        var disconnectedStatusId = await db.PlaidItemStatuses.AsNoTracking()
            .Where(s => s.Code == "disconnected")
            .Select(s => s.Id)
            .FirstOrDefaultAsync(cancellationToken);

        var item = await db.PlaidItems.FirstOrDefaultAsync(x => x.Id == connectionId, cancellationToken);
        if (item is null) return Array.Empty<int>();
        item.StatusId = disconnectedStatusId;
        item.UpdatedAt = now;

        var accountIds = await db.PlaidAccounts.AsNoTracking()
            .Where(a => a.PlaidItemId == connectionId)
            .Select(a => a.Id)
            .ToListAsync(cancellationToken);

        var affectedCards = await db.UserCards
            .Where(c => c.PlaidAccountId != null && accountIds.Contains(c.PlaidAccountId!.Value))
            .ToListAsync(cancellationToken);
        foreach (var card in affectedCards)
        {
            card.SyncStatus = CardsConstants.DisconnectedSyncStatus;
            card.UpdatedAt = now;
        }

        await db.SaveChangesAsync(cancellationToken);
        return affectedCards.Select(c => c.Id).ToList();
    }

    public async Task UpdateTransactionSyncCursorAsync(int connectionId, string? cursor, DateTimeOffset syncAt, CancellationToken cancellationToken)
    {
        var item = await db.PlaidItems.FirstOrDefaultAsync(x => x.Id == connectionId, cancellationToken);
        if (item is null) return;
        item.TransactionSyncCursor = cursor;
        item.LastTransactionSyncAt = syncAt;
        item.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<PlaidConnectionResponse> GetConnectionStateAsync(OnboardingWorkflowUser user, int connectionId, CancellationToken cancellationToken)
    {
        var rows = await (from plaidItem in db.PlaidItems.AsNoTracking().Where(x => x.UserId == user.UserId && x.Id == connectionId)
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
