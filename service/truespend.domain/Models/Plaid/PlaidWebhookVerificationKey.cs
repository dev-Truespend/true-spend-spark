namespace TrueSpend.Domain.Models.Plaid;

// JSON Web Key (EC P-256) returned by Plaid's /webhook_verification_key/get endpoint.
// Used to verify the ES256 signature on the Plaid-Verification JWS header.
public sealed record PlaidWebhookVerificationKey(
    string KeyId,
    string Algorithm,
    string Curve,
    string X,
    string Y,
    DateTimeOffset? ExpiredAt);
