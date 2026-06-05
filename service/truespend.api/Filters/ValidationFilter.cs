using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace TrueSpend.Api.Filters;

public sealed class ValidationFilter : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        if (!context.ModelState.IsValid)
        {
            var errors = context.ModelState
                .SelectMany(kv => kv.Value?.Errors.Select(e => e.ErrorMessage) ?? Array.Empty<string>())
                .Where(message => !string.IsNullOrWhiteSpace(message))
                .ToArray();

            context.Result = new BadRequestObjectResult(new { success = false, errors });
            return;
        }

        await next();
    }
}
