namespace NhuNguyetSpa.Infrastructure.Persistence;

/// <summary>Raw-SQL constraints on <c>appointments</c> that EF Core cannot model (ADR-0003).</summary>
public static class AppointmentConstraints
{
    public const string StaffNoOverlap = "ex_appointments_staff_no_overlap";

    /// <summary>Statuses that occupy a staff member's time slot.</summary>
    public const string OccupyingStatuses = "'held', 'pending_confirmation', 'confirmed'";

    public const string CreateStaffNoOverlapSql =
        $"""
        ALTER TABLE appointments ADD CONSTRAINT {StaffNoOverlap}
        EXCLUDE USING gist (
            staff_member_id WITH =,
            tsrange(date + start_time, date + end_time, '[)') WITH &&
        ) WHERE (status IN ({OccupyingStatuses}));
        """;

    public const string DropStaffNoOverlapSql = $"ALTER TABLE appointments DROP CONSTRAINT IF EXISTS {StaffNoOverlap};";
}
