namespace NhuNguyetSpa.Application.UseCases.Bookings;

/// <summary>
/// Steps A5–A7 of the free-slot algorithm (docs/specs/bookings.md, BR-BKG-12) for one staff member on one day, kept pure
/// so it is unit-tested without a database. Works in minutes from 00:00 so nothing wraps past midnight.
/// </summary>
public static class AvailabilitySlots
{
    /// <param name="shifts">Active shifts of the day, any order.</param>
    /// <param name="busy">Occupying appointments of the staff member (and, for a customer, of that customer), any order.</param>
    /// <param name="notAfter">When the date is today: the current Vietnam time; slots starting at or before it are dropped.</param>
    public static IReadOnlyList<(TimeOnly Start, TimeOnly End)> Compute(
        IReadOnlyList<(TimeOnly Start, TimeOnly End)> shifts,
        IReadOnlyList<(TimeOnly Start, TimeOnly End)> busy,
        int durationMinutes,
        int stepMinutes,
        TimeOnly? notAfter)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(durationMinutes);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(stepMinutes);

        var blocked = busy.Select(range => (Start: Minutes(range.Start), End: Minutes(range.End))).OrderBy(range => range.Start).ToList();
        var earliest = notAfter is { } now ? Minutes(now) + 1 : 0;
        var starts = new SortedSet<int>();

        foreach (var (shiftStart, shiftEnd) in shifts)
        {
            foreach (var (freeStart, freeEnd) in Subtract(Minutes(shiftStart), Minutes(shiftEnd), blocked))
            {
                var from = Math.Max(freeStart, earliest);
                for (var t = RoundUp(from, stepMinutes); t + durationMinutes <= freeEnd; t += stepMinutes)
                    starts.Add(t);
            }
        }

        return starts.Select(start => (FromMinutes(start), FromMinutes(start + durationMinutes))).ToList();
    }

    private static IEnumerable<(int Start, int End)> Subtract(int start, int end, IReadOnlyList<(int Start, int End)> blocked)
    {
        var cursor = start;
        foreach (var range in blocked)
        {
            if (range.End <= cursor || range.Start >= end)
                continue;
            if (range.Start > cursor)
                yield return (cursor, range.Start);
            cursor = Math.Max(cursor, range.End);
            if (cursor >= end)
                yield break;
        }

        if (cursor < end)
            yield return (cursor, end);
    }

    private static int RoundUp(int minutes, int step) => (minutes + step - 1) / step * step;

    private static int Minutes(TimeOnly time) => time.Hour * 60 + time.Minute;

    private static TimeOnly FromMinutes(int minutes) => new(minutes / 60, minutes % 60);
}
