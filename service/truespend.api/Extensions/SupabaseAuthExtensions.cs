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
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(string.IsNullOrWhiteSpace(secret) ? new string('x', 32) : secret)),
                    ValidateLifetime = true,
                    NameClaimType = "sub",
                    RoleClaimType = "role"
                };
            });

        return services;
    }
}
