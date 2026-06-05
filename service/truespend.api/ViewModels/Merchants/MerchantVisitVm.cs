namespace TrueSpend.Api.ViewModels.Merchants;

public sealed record MerchantVisitVm(int MerchantId, string SelectedCategoryCode, DateTimeOffset VisitedAt);
