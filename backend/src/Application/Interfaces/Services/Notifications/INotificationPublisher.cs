using NhuNguyetSpa.Application.UseCases.Notifications;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.Interfaces.Services.Notifications;

/// <summary>
/// Adds the notifications of docs/specs/notifications.md (NTF-E01..E14) to the caller's unit of work. It never saves: the caller's
/// <c>SaveChangesAsync</c> stores them with the business change (BR-NTF-02). <c>actorUserId</c> is who acted; they never get a
/// notice about it (BR-NTF-03).
/// </summary>
public interface INotificationPublisher
{
    /// <summary>NTF-E03 to the customer and, when <paramref name="notifyStaff"/>, NTF-E09 to the assigned staff member.</summary>
    Task AppointmentConfirmedAsync(AppointmentNotice appointment, Guid? actorUserId, bool notifyStaff, CancellationToken cancellationToken);

    /// <summary>NTF-E04: the owner moved the appointment.</summary>
    Task AppointmentRescheduledByOwnerAsync(AppointmentNotice before, AppointmentNotice after, Guid? actorUserId, CancellationToken cancellationToken);

    /// <summary>NTF-E05: the owner gave the appointment to another staff member.</summary>
    Task AppointmentStaffChangedAsync(AppointmentNotice before, AppointmentNotice after, Guid? actorUserId, CancellationToken cancellationToken);

    /// <summary>NTF-E06: the owner cancelled the appointment.</summary>
    Task AppointmentCancelledByOwnerAsync(AppointmentNotice appointment, string reason, Guid? actorUserId, CancellationToken cancellationToken);

    /// <summary>NTF-E07: the customer moved (<paramref name="after"/> set) or cancelled (<paramref name="after"/> null) the appointment.</summary>
    Task AppointmentChangedByCustomerAsync(AppointmentNotice before, AppointmentNotice? after, Guid? actorUserId, CancellationToken cancellationToken);

    /// <summary>NTF-E10: the visit is done; the customer is invited to review it.</summary>
    Task AppointmentCompletedAsync(AppointmentNotice appointment, Guid? actorUserId, CancellationToken cancellationToken);

    /// <summary>
    /// NTF-E01 to the customer; a book-now <paramref name="hold"/> is named in it and, unless <paramref name="holdExpired"/>, its staff
    /// member gets NTF-E09.
    /// </summary>
    Task OrderPaidAsync(Order order, AppointmentNotice? hold, bool holdExpired, CancellationToken cancellationToken);

    /// <summary>NTF-E02: the owner cancelled an unpaid order.</summary>
    Task OrderCancelledByOwnerAsync(Order order, string reason, Guid? actorUserId, CancellationToken cancellationToken);

    /// <summary>NTF-E11: the spa replied to a review.</summary>
    Task ReviewRepliedAsync(Review review, string productName, Guid? actorUserId, CancellationToken cancellationToken);

    /// <summary>NTF-E12: the owner paused, resumed, cancelled or closed a treatment plan.</summary>
    Task TreatmentPlanStatusChangedAsync(Guid planId, Guid customerId, string packageName, TreatmentPlanStatus newStatus, string? reason,
        Guid? actorUserId, CancellationToken cancellationToken);

    /// <summary>NTF-E13: the owner created, edited or cancelled one shift.</summary>
    Task WorkScheduleChangedAsync(WorkSchedule shift, WorkScheduleChange change, Guid? actorUserId, CancellationToken cancellationToken);

    /// <summary>NTF-E14: one summary per staff member for the shifts a batch created.</summary>
    Task WorkSchedulesBatchCreatedAsync(IReadOnlyCollection<WorkSchedule> created, Guid? actorUserId, CancellationToken cancellationToken);
}
