using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using TrueSpend.Domain.ServiceInterfaces.Plaid;

namespace TrueSpend.Api.Filters;

// Verifies Plaid's webhook JWS per https://plaid.com/docs/api/webhooks/webhook-verification/
//   1. Parse the Plaid-Verification header as a three-part JWS (header.payload.signature).
//   2. Decode the JWS header; require alg = ES256 and pull the kid.
//   3. Resolve the EC P-256 JWK via IPlaidWebhookKeyProvider (cached real impl in prod, fail-closed
//      placeholder in dev). Verify the ECDSA signature over the signing input `header.payload`.
//   4. Decode the JWS payload, enforce the 5-min `iat` skew window, and compare the body's
//      SHA256 against the `request_body_sha256` claim.
// Any step that fails returns 400 so Plaid retries. The raw body is stashed on HttpContext.Items
// for the controller to use after we've fully validated it.
public sealed class PlaidSignatureFilter(IPlaidWebhookKeyProvider keyProvider) : IAsyncActionFilter
{
    private const string SignatureHeader = "Plaid-Verification";
    private const int ToleranceSeconds = 300;

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var request = context.HttpContext.Request;
        if (!request.Headers.TryGetValue(SignatureHeader, out var headerValues))
        {
            context.Result = new BadRequestResult();
            return;
        }

        request.EnableBuffering();
        request.Body.Position = 0;
        using var reader = new StreamReader(request.Body, Encoding.UTF8, leaveOpen: true);
        var body = await reader.ReadToEndAsync(context.HttpContext.RequestAborted);
        request.Body.Position = 0;

        if (!await VerifyAsync(headerValues.ToString(), body, context.HttpContext.RequestAborted))
        {
            context.Result = new BadRequestResult();
            return;
        }

        context.HttpContext.Items["PlaidRawBody"] = body;
        await next();
    }

    private async Task<bool> VerifyAsync(string headerValue, string body, CancellationToken cancellationToken)
    {
        var parts = headerValue.Split('.');
        if (parts.Length != 3) return false;

        try
        {
            var headerJson = Encoding.UTF8.GetString(Base64UrlDecode(parts[0]));
            using var headerDoc = JsonDocument.Parse(headerJson);
            var headerRoot = headerDoc.RootElement;

            if (!headerRoot.TryGetProperty("alg", out var algEl) || algEl.GetString() != "ES256") return false;
            if (!headerRoot.TryGetProperty("kid", out var kidEl)) return false;
            var kid = kidEl.GetString();
            if (string.IsNullOrWhiteSpace(kid)) return false;

            var key = await keyProvider.GetKeyAsync(kid, cancellationToken);
            if (key is null) return false;
            if (key.ExpiredAt is { } expiredAt && expiredAt <= DateTimeOffset.UtcNow) return false;
            if (!string.Equals(key.Algorithm, "ES256", StringComparison.Ordinal)) return false;

            if (!VerifySignature(parts, key)) return false;

            var payloadJson = Encoding.UTF8.GetString(Base64UrlDecode(parts[1]));
            using var payloadDoc = JsonDocument.Parse(payloadJson);
            var payloadRoot = payloadDoc.RootElement;

            if (payloadRoot.TryGetProperty("iat", out var iatEl) && iatEl.TryGetInt64(out var iat))
            {
                var nowUnix = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
                if (Math.Abs(nowUnix - iat) > ToleranceSeconds) return false;
            }
            else
            {
                return false;
            }

            if (!payloadRoot.TryGetProperty("request_body_sha256", out var hashEl)) return false;
            var expectedHash = hashEl.GetString();
            if (string.IsNullOrWhiteSpace(expectedHash)) return false;

            using var sha = SHA256.Create();
            var computed = Convert.ToHexString(sha.ComputeHash(Encoding.UTF8.GetBytes(body))).ToLowerInvariant();

            return CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(expectedHash),
                Encoding.UTF8.GetBytes(computed));
        }
        catch
        {
            return false;
        }
    }

    private static bool VerifySignature(string[] parts, Domain.Models.Plaid.PlaidWebhookVerificationKey key)
    {
        var x = Base64UrlDecode(key.X);
        var y = Base64UrlDecode(key.Y);
        var signature = Base64UrlDecode(parts[2]);
        var signingInput = Encoding.UTF8.GetBytes($"{parts[0]}.{parts[1]}");

        using var ecdsa = ECDsa.Create(new ECParameters
        {
            Curve = ECCurve.NamedCurves.nistP256,
            Q = new ECPoint { X = x, Y = y }
        });
        return ecdsa.VerifyData(signingInput, signature, HashAlgorithmName.SHA256, DSASignatureFormat.IeeeP1363FixedFieldConcatenation);
    }

    private static byte[] Base64UrlDecode(string value)
    {
        var padded = value.Replace('-', '+').Replace('_', '/');
        switch (padded.Length % 4)
        {
            case 2: padded += "=="; break;
            case 3: padded += "="; break;
        }
        return Convert.FromBase64String(padded);
    }
}
