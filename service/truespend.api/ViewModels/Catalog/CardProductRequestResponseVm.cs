using TrueSpend.Api.ViewModels.Common;

namespace TrueSpend.Api.ViewModels.Catalog;

public sealed record CardProductRequestResponseVm(CardProductRequestVm Request, CardSummaryVm? UserCard);
