namespace NhuNguyetSpa.Application.Common.Options;

/// <summary>Section <c>WorkSchedule</c> (docs/specs/staff.md, BR-STF-06, Q-17).</summary>
public sealed class WorkScheduleOptions
{
    public const string SectionName = "WorkSchedule";

    /// <summary>Shifts can be added or moved from today up to today + this many days.</summary>
    public int MaxDaysAhead { get; set; } = 60;

    /// <summary>Longest range of days one <c>GET /work-schedules</c> may return (6 weeks = one month grid).</summary>
    public int MaxQueryRangeDays { get; set; } = 42;

    /// <summary>Most shifts one <c>POST /work-schedules/batch</c> may build (staff × matching days).</summary>
    public int MaxBatchShifts { get; set; } = 500;
}
