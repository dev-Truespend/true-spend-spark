namespace TrueSpend.Domain.Models.Cards;

// A manual user_card that is a candidate for adoption when a Plaid account with the same last-four
// is linked. IssuerName resolves to the catalog issuer (when CardProductId is set) or the
// user-entered custom issuer name. See PlaidInsertBusiness adoption rule.
public sealed record AdoptableManualCard(
    int UserCardId,
    int? CardProductId,
    string? IssuerName,
    bool IsPrimary,
    DateTimeOffset CreatedAt);
