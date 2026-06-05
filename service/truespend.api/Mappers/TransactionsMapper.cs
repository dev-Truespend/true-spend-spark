using TrueSpend.Api.ViewModels.Common;
using TrueSpend.Api.ViewModels.Transactions;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Transactions;

namespace TrueSpend.Api.Mappers;

public interface ITransactionsMapper
{
    CreateTransactionRequest ToDomain(CreateTransactionRequestVm vm);
    UpdateTransactionRequest ToDomain(UpdateTransactionRequestVm vm);
    TransactionsResponseVm ToResponse(TransactionsResponse domain);
    TransactionDetailResponseVm ToDetail(TransactionDetailResponse domain);
    TransactionRewardResultResponseVm ToRewardResult(TransactionRewardResultResponse domain);
    MissedRewardEventsResponseVm ToMissedRewards(MissedRewardEventsResponse domain);
}

public sealed class TransactionsMapper : ITransactionsMapper
{
    public CreateTransactionRequest ToDomain(CreateTransactionRequestVm vm) =>
        new(vm.MerchantName, vm.Amount, vm.CardId, vm.CategoryCode,
            DateOnly.Parse(vm.TransactionDate),
            vm.TransactionTime is not null ? TimeOnly.Parse(vm.TransactionTime) : null,
            vm.LocationLabel, vm.LocationLat, vm.LocationLng);

    public UpdateTransactionRequest ToDomain(UpdateTransactionRequestVm vm) =>
        new(vm.MerchantName, vm.Amount, vm.CardId, vm.CategoryCode,
            vm.TransactionDate is not null ? DateOnly.Parse(vm.TransactionDate) : null,
            vm.TransactionTime is not null ? TimeOnly.Parse(vm.TransactionTime) : null,
            vm.LocationLabel, vm.LocationLat, vm.LocationLng);

    public TransactionsResponseVm ToResponse(TransactionsResponse domain) =>
        new() { Transactions = domain.Transactions.Select(ToVm).ToArray(), EmptyState = domain.EmptyState };

    public TransactionDetailResponseVm ToDetail(TransactionDetailResponse domain) =>
        new()
        {
            Transaction = ToDetailVm(domain.Transaction),
            RewardResult = domain.RewardResult is not null ? ToRewardResultVm(domain.RewardResult) : null,
            MissedReward = domain.MissedReward is not null ? ToMissedRewardVm(domain.MissedReward) : null
        };

    public TransactionRewardResultResponseVm ToRewardResult(TransactionRewardResultResponse domain) =>
        new()
        {
            EarnedReward = domain.EarnedReward is not null ? ToRewardResultVm(domain.EarnedReward) : null,
            MissedReward = domain.MissedReward is not null ? ToMissedRewardVm(domain.MissedReward) : null
        };

    public MissedRewardEventsResponseVm ToMissedRewards(MissedRewardEventsResponse domain) =>
        new() { MissedRewards = domain.MissedRewards.Select(ToMissedRewardVm).ToArray() };

    private static TransactionVm ToVm(Transaction t) =>
        new()
        {
            Id = t.Id,
            MerchantName = t.MerchantName,
            Amount = new MoneyVm(t.Amount, t.CurrencyCode, FormatMoney(t.Amount, t.CurrencyCode)),
            Card = new CardSummaryVm(t.CardId, t.CardDisplayName, string.Empty, null, "manual", false, "active", null),
            CategoryCode = t.CategoryCode,
            CategoryName = t.CategoryName,
            TransactionDate = t.TransactionDate.ToString("yyyy-MM-dd"),
            TransactionTime = t.TransactionTime?.ToString("HH:mm:ss"),
            LocationLabel = t.LocationLabel,
            Source = t.Source,
            IsPending = t.IsPending,
            EarnedReward = t.EarnedRewardAmount.HasValue
                ? new MoneyVm(t.EarnedRewardAmount.Value, t.EarnedRewardCurrency ?? "points", FormatReward(t.EarnedRewardAmount.Value, t.EarnedRewardCurrency))
                : null,
            MissedReward = t.MissedRewardAmount.HasValue
                ? new MoneyVm(t.MissedRewardAmount.Value, "points", FormatReward(t.MissedRewardAmount.Value, null))
                : null,
            SyncStatus = t.SyncStatus
        };

    private static TransactionVm ToDetailVm(TransactionDetail t) =>
        new()
        {
            Id = t.Id,
            MerchantName = t.MerchantName,
            Amount = new MoneyVm(t.Amount, t.CurrencyCode, FormatMoney(t.Amount, t.CurrencyCode)),
            Card = new CardSummaryVm(t.CardId, t.CardDisplayName, string.Empty, null, "manual", false, "active", null),
            CategoryCode = t.CategoryCode,
            CategoryName = t.CategoryName,
            TransactionDate = t.TransactionDate.ToString("yyyy-MM-dd"),
            TransactionTime = t.TransactionTime?.ToString("HH:mm:ss"),
            LocationLabel = t.LocationLabel,
            Source = t.Source,
            IsPending = t.IsPending
        };

    private static TransactionRewardResultVm ToRewardResultVm(TransactionRewardResult r) =>
        new()
        {
            EarnedRate = r.EarnedRate,
            EarnedAmount = new MoneyVm(r.EarnedAmount, r.RewardCurrencyCode ?? "points", FormatReward(r.EarnedAmount, r.RewardCurrencyCode)),
            RewardCurrencyCode = r.RewardCurrencyCode
        };

    private static MissedRewardVm ToMissedRewardVm(MissedReward m) =>
        new()
        {
            Id = m.Id,
            TransactionId = m.TransactionId,
            MerchantName = m.MerchantName,
            ActualCard = ToCardSummaryVm(m.ActualCard),
            BetterCard = ToCardSummaryVm(m.BetterCard),
            ActualReward = new MoneyVm(m.ActualRewardAmount, "points", FormatReward(m.ActualRewardAmount, null)),
            PotentialReward = new MoneyVm(m.PotentialRewardAmount, "points", FormatReward(m.PotentialRewardAmount, null)),
            MissedReward = new MoneyVm(m.MissedAmount, "points", FormatReward(m.MissedAmount, null)),
            IsDismissed = m.IsDismissed
        };

    private static CardSummaryVm ToCardSummaryVm(CardSummary c) =>
        new(c.Id, c.DisplayName, c.IssuerName, c.LastFour, c.Source, c.IsPrimary, c.SyncStatus, c.CardArtUrl);

    private static string FormatMoney(decimal amount, string currencyCode) => MoneyFormatter.FormatMoney(amount, currencyCode);
    private static string FormatReward(decimal amount, string? currencyCode) => MoneyFormatter.FormatReward(amount, currencyCode);
}
