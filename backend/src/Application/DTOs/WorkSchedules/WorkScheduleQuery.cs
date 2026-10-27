namespace NhuNguyetSpa.Application.DTOs.WorkSchedules;

/// <summary>Query string of <c>GET /work-schedules</c>; <see cref="Status"/> is active | cancelled.</summary>
public sealed class WorkScheduleQuery
{
    public DateOnly? FromDate { get; set; }
    public DateOnly? ToDate { get; set; }
    public Guid? StaffMemberId { get; set; }
    public string? Status { get; set; }
}
