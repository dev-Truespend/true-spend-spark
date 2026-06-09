using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrueSpend.Api.Mappers;
using TrueSpend.Domain.BusinessInterfaces.Transactions;
using TrueSpend.Domain.Models.Transactions;

namespace TrueSpend.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/[controller]")]
public sealed class TransactionsController(
    ITransactionsReadBusiness readBusiness,
    ITransactionsInsertBusiness insertBusiness, // archived: kept for future manual-tx re-enable
    ITransactionsUpdateBusiness updateBusiness, // archived: kept for future manual-tx re-enable
    ITransactionsDeleteBusiness deleteBusiness, // archived: kept for future manual-tx re-enable
    ITransactionsMapper mapper,
    IClientResponseMapper clientResponseMapper,
    IWorkflowUserMapper workflowUserMapper) : AppControllerBase(clientResponseMapper, workflowUserMapper)
{
    [HttpGet]
    public async Task<IActionResult> GetTransactions(
        [FromQuery] string? q,
        [FromQuery] string? categoryCode,
        [FromQuery] int? cardId,
        CancellationToken cancellationToken)
    {
        _ = insertBusiness;
        _ = updateBusiness;
        _ = deleteBusiness;
        return Respond(await readBusiness.GetTransactionsAsync(CurrentUser(), new TransactionListQuery(q, categoryCode, cardId), cancellationToken), mapper.ToResponse);
    }

    [HttpGet("{transactionId:int}")]
    public async Task<IActionResult> GetDetail(int transactionId, CancellationToken cancellationToken) =>
        Respond(await readBusiness.GetTransactionDetailAsync(CurrentUser(), transactionId, cancellationToken), mapper.ToDetail);

    [HttpGet("{transactionId:int}/reward-result")]
    public async Task<IActionResult> GetRewardResult(int transactionId, CancellationToken cancellationToken) =>
        Respond(await readBusiness.GetRewardResultAsync(CurrentUser(), transactionId, cancellationToken), mapper.ToRewardResult);

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories(CancellationToken cancellationToken) =>
        Respond(await readBusiness.GetCategoriesAsync(cancellationToken), mapper.ToCategories);

    #region archive — manual transaction add/edit/delete (removed from MVP)
    // Manual transaction add/edit/delete actions were removed from the MVP. Plaid-driven sync is
    // the sole producer of transaction rows in MVP. Mark-not-a-miss continues to live on
    // MissedRewardsController and TransactionsUpdateBusiness.MarkNotAMissAsync is unaffected.
    //
    // The constructor still injects insertBusiness/updateBusiness/deleteBusiness so existing DI
    // registrations resolve. The discards above keep the unused-param analyzer quiet without
    // touching DI wiring.
    //
    // using TrueSpend.Api.ViewModels.Transactions;
    //
    // [HttpPost]
    // public async Task<IActionResult> Create(CreateTransactionRequestVm request, CancellationToken cancellationToken) =>
    //     Respond(await insertBusiness.CreateTransactionAsync(CurrentUser(), mapper.ToDomain(request), cancellationToken), mapper.ToDetail);
    //
    // [HttpPost("{transactionId:int}")]
    // public async Task<IActionResult> Update(int transactionId, UpdateTransactionRequestVm request, CancellationToken cancellationToken) =>
    //     Respond(await updateBusiness.UpdateTransactionAsync(CurrentUser(), transactionId, mapper.ToDomain(request), cancellationToken), mapper.ToDetail);
    //
    // [HttpPost("{transactionId:int}/delete")]
    // public async Task<IActionResult> Delete(int transactionId, CancellationToken cancellationToken) =>
    //     Respond(await deleteBusiness.DeleteTransactionAsync(CurrentUser(), transactionId, cancellationToken), mapper.ToResponse);
    #endregion
}
