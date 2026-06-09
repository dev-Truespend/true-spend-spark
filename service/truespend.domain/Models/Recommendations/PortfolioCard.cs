using TrueSpend.Domain.Models.Cards;

namespace TrueSpend.Domain.Models.Recommendations;

// Per-card summary shown on the home portfolio block. Top N categories sorted
// by multiplier descending; cards with no catalog product surface a single
// "everywhere" entry so the mobile renders consistently across both paths.
public sealed record PortfolioCard(
    CardSummary Card,
    IReadOnlyList<PortfolioCategory> TopCategories);
