namespace NhuNguyetSpa.Domain.Enums;

/// <summary>
/// What a notification points to (UC-SPA-34, BR-NTF-07). Stored as snake_case text: appointment, order, treatment_plan, review,
/// work_schedule. Clients pick the screen for the reader's role.
/// </summary>
public enum NotificationReferenceType
{
    Appointment,
    Order,
    TreatmentPlan,
    Review,
    WorkSchedule,
}
