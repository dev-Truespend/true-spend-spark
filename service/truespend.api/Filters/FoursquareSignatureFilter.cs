using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace TrueSpend.Api.Filters;

public sealed class FoursquareSignatureFilter(IConfiguration configuration) : IAsyncActionFilter
{
    private const string SignatureHeader = "Foursquare-Signature";

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var secret = configuration["Foursquare:WebhookSecret"];
        if (string.IsNullOrWhiteSpace(secret))
        {
            context.Result = new StatusCodeResult(500);
            return;
        }

        var request = context.HttpContext.Request;
        if (!request.Headers.TryGetValue(SignatureHeader, out var headerValues))
        {
            context.Result = new BadRequestResult();
            return;
        }

        request.EnableBuffering();
        request.Body.Position = 0;
        using var reader = new StreamReader(request.Body, Encoding.UTF8, leaveOpen: true);
        var body = await reader.ReadToEndAsync();
        request.Body.Position = 0;

        if (!Verify(headerValues.ToString(), body, secret))
        {
            context.Result = new BadRequestResult();
            return;
        }

        context.HttpContext.Items["FoursquareRawBody"] = body;
        await next();
    }

    private static bool Verify(string headerValue, string body, string secret)
    {
        if (string.IsNullOrWhiteSpace(headerValue)) return false;
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var computed = Convert.ToBase64String(hmac.ComputeHash(Encoding.UTF8.GetBytes(body)));
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(headerValue.Trim()),
            Encoding.UTF8.GetBytes(computed));
    }
}
