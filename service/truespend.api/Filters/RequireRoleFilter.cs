using Microsoft.AspNetCore.Authorization;

namespace TrueSpend.Api.Filters;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public sealed class RequireRoleAttribute : AuthorizeAttribute
{
    public RequireRoleAttribute(params string[] roles)
    {
        Roles = string.Join(',', roles);
    }
}
