using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.UseCases.WorkSchedules;

/// <summary>
/// BR-STF-11: the appointments a staff member sees inside one of their shifts. Held and hold-expired ones are not the staff
/// member's work yet (Q-33) and cancelled ones no longer are; overlap is <c>[start, end)</c>, so touching the edge is outside.
/// </summary>
public static class ShiftAppointments
{
    public static readonly IReadOnlyList<AppointmentStatus> ShownStatuses =
    [
        AppointmentStatus.PendingConfirmation,
        AppointmentStatus.Confirmed,
        AppointmentStatus.Completed,
        AppointmentStatus.NoShow,
    ];
}
