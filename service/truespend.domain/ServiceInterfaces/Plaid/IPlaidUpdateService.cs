using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Cards;

namespace TrueSpend.Domain.ServiceInterfaces.Plaid;

public sealed record PlaidUserCardMatchContext(int UserCardId, string InstitutionName, string AccountName);

public interface IPlaidUpdateService
{
    Task SyncConnectionAsync(int connectionId, CancellationToken cancellationToken);
    Task<IReadOnlyList<int>> DisconnectConnectionAsync(int connectionId, CancellationToken cancellationToken);
    Task<PlaidConnectionResponse> GetConnectionStateAsync(OnboardingWorkflowUser user, int connectionId, CancellationToken cancellationToken);
    Task UpdateTransactionSyncCursorAsync(int connectionId, string? cursor, DateTimeOffset syncAt, CancellationToken cancellationToken);

    Task<IReadOnlyList<PlaidUserCardMatchContext>> GetUnmatchedPlaidUserCardsAsync(CancellationToken cancellationToken);
    Task SetUserCardProductIdAsync(int userCardId, int cardProductId, DateTimeOffset now, CancellationToken cancellationToken);

    // Converts an existing manual user_card into a Plaid-backed one: attaches the Plaid account,
    // flips source to plaid, fills card_product_id when not already set, and clears the custom
    // issuer/name once a catalog product is resolved. Preserves id, nickname, is_primary, overrides.
    Task AdoptManualCardToPlaidAsync(int userCardId, int plaidAccountRowId, int? cardProductId, CancellationToken cancellationToken);
}
