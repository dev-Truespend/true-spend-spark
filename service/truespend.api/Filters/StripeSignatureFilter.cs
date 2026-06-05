using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace TrueSpend.Api.Filters;

public sealed class StripeSignatureFilter(IConfiguration configuration) : IAsyncActionFilter
{
    private const string SignatureHeader = "Stripe-Signature";
    private const int ToleranceSeconds = 300;

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var secret = configuration["Stripe:WebhookSecret"];
        if (string.IsNullOrWhiteSpace(secret))
        {
            context.Result = new StatusCodeResult(500);
            return;
        }

        var request = context.HttpContext.Request;
        if (!request.Headers.TryGetValue(SignatureHeader, out var headerValues))
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        request.EnableBuffering();
        request.Body.Position = 0;
        using var reader = new StreamReader(request.Body, Encoding.UTF8, leaveOpen: true);
        var body = await reader.ReadToEndAsync();
        request.Body.Position = 0;

        if (!Verify(headerValues.ToString(), body, secret))
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        context.HttpContext.Items["StripeRawBody"] = body;
        await next();
    }

    private static bool Verify(string header, string body, string secret)
    {
        long? timestamp = null;
        var signatures = new List<string>();
        foreach (var part in header.Split(','))
        {
            var pair = part.Split('=', 2);
            if (pair.Length != 2) continue;
            if (pair[0] == "t" && long.TryParse(pair[1], NumberStyles.Integer, CultureInfo.InvariantCulture, out var ts))
            {
                timestamp = ts;
            }
            else if (pair[0] == "v1")
            {
                signatures.Add(pair[1]);
            }
        }

        if (timestamp is null || signatures.Count == 0) return false;

        var nowUnix = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        if (Math.Abs(nowUnix - timestamp.Value) > ToleranceSeconds) return false;

        var signedPayload = $"{timestamp.Value}.{body}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var computed = Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(signedPayload))).ToLowerInvariant();

        foreach (var sig in signatures)
        {
            if (CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(sig), Encoding.UTF8.GetBytes(computed)))
            {
                return true;
            }
        }

        return false;
    }
}
