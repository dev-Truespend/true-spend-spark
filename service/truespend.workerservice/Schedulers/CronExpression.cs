namespace TrueSpend.WorkerService.Schedulers;

public sealed class CronExpression
{
    private readonly bool[] _minutes;
    private readonly bool[] _hours;
    private readonly bool[] _daysOfMonth;
    private readonly bool[] _months;
    private readonly bool[] _daysOfWeek;

    private CronExpression(bool[] minutes, bool[] hours, bool[] daysOfMonth, bool[] months, bool[] daysOfWeek)
    {
        _minutes = minutes;
        _hours = hours;
        _daysOfMonth = daysOfMonth;
        _months = months;
        _daysOfWeek = daysOfWeek;
    }

    public static CronExpression Parse(string expression)
    {
        var parts = expression.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length != 5)
            throw new ArgumentException($"Cron expression must have 5 fields, got {parts.Length}: '{expression}'", nameof(expression));
        return new CronExpression(
            ParseField(parts[0], 0, 59),
            ParseField(parts[1], 0, 23),
            ParseField(parts[2], 1, 31),
            ParseField(parts[3], 1, 12),
            ParseField(parts[4], 0, 6));
    }

    public DateTimeOffset GetNextOccurrence(DateTimeOffset from)
    {
        var next = new DateTimeOffset(from.Year, from.Month, from.Day, from.Hour, from.Minute, 0, from.Offset).AddMinutes(1);
        var endSearch = next.AddYears(1);
        while (next < endSearch)
        {
            if (!_months[next.Month - 1])
            {
                next = new DateTimeOffset(next.Year, next.Month, 1, 0, 0, 0, next.Offset).AddMonths(1);
                continue;
            }
            if (!_daysOfMonth[next.Day - 1] || !_daysOfWeek[(int)next.DayOfWeek])
            {
                next = new DateTimeOffset(next.Year, next.Month, next.Day, 0, 0, 0, next.Offset).AddDays(1);
                continue;
            }
            if (!_hours[next.Hour])
            {
                next = new DateTimeOffset(next.Year, next.Month, next.Day, next.Hour, 0, 0, next.Offset).AddHours(1);
                continue;
            }
            if (!_minutes[next.Minute])
            {
                next = next.AddMinutes(1);
                continue;
            }
            return next;
        }
        throw new InvalidOperationException($"Cron expression has no occurrence within 1 year of {from}.");
    }

    private static bool[] ParseField(string field, int min, int max)
    {
        var flags = new bool[max - min + 1];
        foreach (var part in field.Split(','))
        {
            int rangeMin = min, rangeMax = max, step = 1;
            var token = part;
            var stepIdx = token.IndexOf('/');
            if (stepIdx >= 0)
            {
                step = int.Parse(token[(stepIdx + 1)..]);
                token = token[..stepIdx];
            }
            if (token == "*")
            {
                rangeMin = min;
                rangeMax = max;
            }
            else if (token.Contains('-'))
            {
                var dash = token.IndexOf('-');
                rangeMin = int.Parse(token[..dash]);
                rangeMax = int.Parse(token[(dash + 1)..]);
            }
            else
            {
                rangeMin = rangeMax = int.Parse(token);
            }
            for (var i = rangeMin; i <= rangeMax; i += step)
            {
                if (i >= min && i <= max)
                    flags[i - min] = true;
            }
        }
        return flags;
    }
}
