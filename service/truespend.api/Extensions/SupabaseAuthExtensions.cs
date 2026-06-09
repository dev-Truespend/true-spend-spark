using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

namespace TrueSpend.Api.Extensions;

public static class SupabaseAuthExtensions
{
    public static IServiceCollection AddSupabaseJwtAuth(this IServiceCollection services, IConfiguration configuration)
    {
        var section = configuration.GetSection("Supabase");
        var issuer = section["JwtIssuer"] ?? string.Empty;
        var audience = section["JwtAudience"] ?? "authenticated";
        var secret = section["JwtSecret"] ?? string.Empty;
        var jwtKeys = section["JwtKeys"] ?? string.Empty;

        var signingKeys = BuildSigningKeys(secret, jwtKeys);

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.RequireHttpsMetadata = false;
                options.SaveToken = true;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = !string.IsNullOrWhiteSpace(issuer),
                    ValidIssuer = issuer,
                    ValidateAudience = !string.IsNullOrWhiteSpace(audience),
                    ValidAudience = audience,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKeys = signingKeys,
                    IssuerSigningKeyResolver = (_, _, _, _) => signingKeys,
                    ValidateLifetime = true,
                    NameClaimType = "sub",
                    RoleClaimType = "role"
                };
            });

        return services;
    }

    private static IReadOnlyList<SecurityKey> BuildSigningKeys(string secret, string jwtKeys)
    {
        var signingKeys = new List<SecurityKey>();

        if (!string.IsNullOrWhiteSpace(jwtKeys))
        {
            var json = jwtKeys.TrimStart().StartsWith('[')
                ? $$"""{"keys":{{jwtKeys}}}"""
                : jwtKeys;

            signingKeys.AddRange(new JsonWebKeySet(json).GetSigningKeys());
        }

        var symmetricSecret = string.IsNullOrWhiteSpace(secret) ? new string('x', 32) : secret;
        signingKeys.Add(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(symmetricSecret)));

        return signingKeys;
    }
}
