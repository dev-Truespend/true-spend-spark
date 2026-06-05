namespace TrueSpend.Api.ViewModels.Notifications;

public sealed record RelatedTransactionVm(
    int Id,
    string MerchantName,
    string TransactionDate,
    decimal Amount,
    string CurrencyCode);
