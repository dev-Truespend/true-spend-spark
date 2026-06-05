using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using TrueSpend.Api.Mappers;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.Models.Permissions;

namespace TrueSpend.Api.Controllers;

public abstract class AppControllerBase(IClientResponseMapper clientResponseMapper, IWorkflowUserMapper workflowUserMapper) : ControllerBase
{
    protected IClientResponseMapper ClientResponseMapper { get; } = clientResponseMapper;

    protected OnboardingWorkflowUser CurrentUser() => workflowUserMapper.FromClaims(User);

    protected IActionResult Respond<TDomain>(BusinessResponse<TDomain> response) =>
        StatusCode(response.StatusCode, ClientResponseMapper.ToClientResponse(response));

    protected IActionResult Respond<TDomain, TVm>(BusinessResponse<TDomain> response, Func<TDomain, TVm> projector) =>
        StatusCode(response.StatusCode, ClientResponseMapper.ToClientResponse(response, projector));

    protected ClaimsPrincipal CurrentPrincipal() => User;
}
