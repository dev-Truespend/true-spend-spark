namespace TrueSpend.Domain.Entities.Catalog;

public sealed class CardProductEntity
{
    public int Id { get; set; }
    public short IssuerId { get; set; }
    public short NetworkId { get; set; }
    public short RewardCurrencyId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? CardArtUrl { get; set; }
    public decimal? AnnualFee { get; set; }
    public string? PurchaseApr { get; set; }
    public string? ForeignTransactionFee { get; set; }
    public string? TermsSummary { get; set; }
    public string? RewardCurrencyName { get; set; }
    public decimal BaseRewardRate { get; set; } = 1.0m;
    public string? RewardsCcId { get; set; }
    public string? CardType { get; set; }
    public string? CardUrl { get; set; }
    public decimal? FxFee { get; set; }
    public string? CreditRange { get; set; }
    public decimal? BaseRewardValuation { get; set; }
    public bool HasLoungeAccess { get; set; }
    public bool HasFreeCheckedBag { get; set; }
    public bool HasTrustedTravelerCredit { get; set; }
    public bool HasFreeHotelNight { get; set; }
    public string? SignupBonus { get; set; }
    public string? Perks { get; set; }
    public string? AnnualSpendRewards { get; set; }
    public bool IsActive { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
