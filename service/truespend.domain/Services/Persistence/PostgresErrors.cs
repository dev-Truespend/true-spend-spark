using Microsoft.EntityFrameworkCore;

namespace TrueSpend.Domain.Services.Persistence;

public static class PostgresErrors
{
    private const string UniqueViolationSqlState = "23505";

    public static bool IsUniqueViolation(DbUpdateException ex)
    {
        for (Exception? inner = ex.InnerException; inner is not null; inner = inner.InnerException)
        {
            var sqlState = inner.GetType().GetProperty("SqlState")?.GetValue(inner) as string;
            if (sqlState == UniqueViolationSqlState) return true;
        }
        return false;
    }
}
