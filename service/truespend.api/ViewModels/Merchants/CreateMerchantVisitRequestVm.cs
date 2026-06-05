namespace TrueSpend.Api.ViewModels.Merchants;

public sealed record CreateMerchantVisitRequestVm(int MerchantId, string SelectedCategoryCode, DateTimeOffset VisitedAt);
