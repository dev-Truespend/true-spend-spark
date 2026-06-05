using System.Text.Json;
using TrueSpend.Domain.Exceptions;

namespace TrueSpend.Api.Middleware;

public sealed class ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (ValidationAppException ex)
        {
            await WriteAsync(context, 400, ex.Errors);
        }
        catch (NotFoundAppException ex)
        {
            await WriteAsync(context, 404, [ex.Message]);
        }
        catch (EntitlementRequiredAppException ex)
        {
            await WriteEntitlementRequiredAsync(context, ex);
        }
        catch (ForbiddenAppException ex)
        {
            await WriteAsync(context, 403, [ex.Message]);
        }
        catch (ConflictAppException ex)
        {
            await WriteAsync(context, 409, [ex.Message]);
        }
        catch (ExternalProviderAppException ex)
        {
            logger.LogError(ex, "External provider {Provider} failed", ex.Provider);
            await WriteAsync(context, 502, [ex.Message]);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception");
            await WriteAsync(context, 500, ["An unexpected error occurred."]);
        }
    }

    private static async Task WriteAsync(HttpContext context, int statusCode, IReadOnlyList<string> errors)
    {
        if (context.Response.HasStarted) return;
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";
        var payload = JsonSerializer.Serialize(new { success = false, errors });
        await context.Response.WriteAsync(payload);
    }

    private static async Task WriteEntitlementRequiredAsync(HttpContext context, EntitlementRequiredAppException ex)
    {
        if (context.Response.HasStarted) return;
        context.Response.StatusCode = 403;
        context.Response.ContentType = "application/json";
        var payload = JsonSerializer.Serialize(new
        {
            success = false,
            errorCode = "ENTITLEMENT_REQUIRED",
            featureCode = ex.FeatureCode,
            requiredPlanCode = ex.RequiredPlanCode,
            message = ex.Message
        });
        await context.Response.WriteAsync(payload);
    }
}
