using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.UseCases.Treatments;

/// <summary>
/// BR-TRT-06 (BR-SEC-01): who sees and who edits a treatment plan. <c>assigned</c> = the user has a pending, confirmed, completed or
/// no-show appointment on one of the plan's sessions; it counts only when <c>Treatments:AssignedStaffCanView</c> is on (Q-37).
/// </summary>
public static class TreatmentScope
{
    /// <summary>Appointment statuses that put a staff member "on" a plan (Q-37).</summary>
    public static readonly AppointmentStatus[] AssignedStatuses =
    [
        AppointmentStatus.PendingConfirmation, AppointmentStatus.Confirmed, AppointmentStatus.Completed, AppointmentStatus.NoShow,
    ];

    public static bool CanView(bool isOwner, Guid? userId, Guid? primaryStaffId, bool assigned, bool assignedCanView) =>
        isOwner || (userId is not null && userId == primaryStaffId) || (assigned && assignedCanView);

    public static bool CanEdit(bool isOwner, Guid? userId, Guid? primaryStaffId, TreatmentPlanStatus status) =>
        status is not (TreatmentPlanStatus.Completed or TreatmentPlanStatus.Cancelled) &&
        (isOwner || (userId is not null && userId == primaryStaffId));
}
