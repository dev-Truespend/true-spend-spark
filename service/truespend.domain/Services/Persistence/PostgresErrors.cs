using Microsoft.EntityFrameworkCore;

namespace TrueSpend.Domain.Services.Persistence;

public static class PostgresErrors
{
    private const string UniqueViolationSqlState = "23505";
    private const string ForeignKeyViolationSqlState = "23503";

    public static bool IsUniqueViolation(DbUpdateException ex) =>
        HasSqlState(ex, UniqueViolationSqlState);

    public static bool IsForeignKeyViolation(DbUpdateException ex) =>
        HasSqlState(ex, ForeignKeyViolationSqlState);

    private static bool HasSqlState(DbUpdateException ex, string sqlState)
    {
        for (Exception? inner = ex.InnerException; inner is not null; inner = inner.InnerException)
        {
            var state = inner.GetType().GetProperty("SqlState")?.GetValue(inner) as string;
            if (state == sqlState) return true;
        }
        return false;
    }
}
