namespace NhuNguyetSpa.Infrastructure.Persistence;

/// <summary>Raw-SQL constraint on <c>work_schedules</c> that EF Core cannot model (BR-STF-03, same shape as appointments).</summary>
public static class WorkScheduleConstraints
{
    public const string NoOverlap = "ex_work_schedules_no_overlap";

    public const string CreateNoOverlapSql =
        $"""
        ALTER TABLE work_schedules ADD CONSTRAINT {NoOverlap}
        EXCLUDE USING gist (
            staff_member_id WITH =,
            tsrange(date + start_time, date + end_time, '[)') WITH &&
        ) WHERE (status = 'active');
        """;

    public const string DropNoOverlapSql = $"ALTER TABLE work_schedules DROP CONSTRAINT IF EXISTS {NoOverlap};";
}
