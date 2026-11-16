using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.Notifications;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.ValueObjects;

namespace NhuNguyetSpa.Application.UseCases.Notifications;

/// <summary>
/// BR-NTF-01..03: turns business events into notification rows in the caller's unit of work. Recipients are user ids (customer and
/// staff ids share the user's primary key); the actor and repeated recipients are dropped, the first notice for a user wins.
/// </summary>
public sealed class NotificationPublisher : INotificationPublisher
{
    private readonly INotificationRepository _notifications;
    private readonly IDateTimeProvider _clock;

    public NotificationPublisher(INotificationRepository notifications, IDateTimeProvider clock)
    {
        _notifications = notifications;
        _clock = clock;
    }

    public async Task AppointmentConfirmedAsync(AppointmentNotice appointment, Guid? actorUserId, bool notifyStaff,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(appointment);
        var names = await NamesAsync([appointment], cancellationToken);
        var service = names.Service(appointment.SpaServiceId);
        var notices = new List<(Guid, NotificationContent)>
        {
            (appointment.CustomerId, NotificationTemplates.AppointmentConfirmed(service, appointment.Date, appointment.StartTime,
                names.User(appointment.StaffMemberId), appointment.IsPackageSession)),
        };
        if (notifyStaff)
            notices.Add((appointment.StaffMemberId, NewForStaff(appointment, names)));
        await AddAsync(notices, Reference(appointment), actorUserId, cancellationToken);
    }

    public async Task AppointmentRescheduledByOwnerAsync(AppointmentNotice before, AppointmentNotice after, Guid? actorUserId,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(before);
        ArgumentNullException.ThrowIfNull(after);
        var names = await NamesAsync([before, after], cancellationToken);
        var service = names.Service(after.SpaServiceId);
        var customer = names.User(after.CustomerId);
        var notices = new List<(Guid, NotificationContent)>
        {
            (after.CustomerId, NotificationTemplates.RescheduledForCustomer(service, before.Date, before.StartTime, after.Date, after.StartTime,
                after.IsPackageSession)),
        };
        if (before.StaffMemberId != after.StaffMemberId)
        {
            notices.Add((before.StaffMemberId, NotificationTemplates.UnassignedForStaff(service, customer, before.Date, before.StartTime, before.IsPackageSession)));
            notices.Add((after.StaffMemberId, NewForStaff(after, names)));
        }
        else
        {
            notices.Add((after.StaffMemberId,
                NotificationTemplates.RescheduledForStaff(service, customer, before.Date, before.StartTime, after.Date, after.StartTime, after.IsPackageSession)));
        }

        await AddAsync(notices, Reference(after), actorUserId, cancellationToken);
    }

    public async Task AppointmentStaffChangedAsync(AppointmentNotice before, AppointmentNotice after, Guid? actorUserId,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(before);
        ArgumentNullException.ThrowIfNull(after);
        var names = await NamesAsync([before, after], cancellationToken);
        var service = names.Service(after.SpaServiceId);
        var notices = new List<(Guid, NotificationContent)>
        {
            (after.CustomerId, NotificationTemplates.StaffChangedForCustomer(service, after.Date, after.StartTime,
                names.User(after.StaffMemberId), after.IsPackageSession)),
            (before.StaffMemberId, NotificationTemplates.UnassignedForStaff(service, names.User(after.CustomerId), before.Date, before.StartTime, before.IsPackageSession)),
            (after.StaffMemberId, NewForStaff(after, names)),
        };
        await AddAsync(notices, Reference(after), actorUserId, cancellationToken);
    }

    public async Task AppointmentCancelledByOwnerAsync(AppointmentNotice appointment, string reason, Guid? actorUserId,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(appointment);
        var names = await NamesAsync([appointment], cancellationToken);
        var service = names.Service(appointment.SpaServiceId);
        var notices = new List<(Guid, NotificationContent)>
        {
            (appointment.CustomerId, NotificationTemplates.CancelledForCustomer(service, appointment.Date, appointment.StartTime, reason,
                appointment.IsPackageSession)),
            (appointment.StaffMemberId, NotificationTemplates.CancelledForStaff(service, names.User(appointment.CustomerId), appointment.Date,
                appointment.StartTime, appointment.IsPackageSession)),
        };
        await AddAsync(notices, Reference(appointment), actorUserId, cancellationToken);
    }

    public async Task AppointmentChangedByCustomerAsync(AppointmentNotice before, AppointmentNotice? after, Guid? actorUserId,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(before);
        var owners = await _notifications.GetActiveOwnerIdsAsync(cancellationToken);
        var names = await NamesAsync(after is null ? [before] : [before, after], cancellationToken);
        var service = names.Service(before.SpaServiceId);
        var customer = names.User(before.CustomerId);
        var notices = new List<(Guid, NotificationContent)>();
        if (after is null)
        {
            var cancelled = NotificationTemplates.CancelledByCustomer(service, customer, before.Date, before.StartTime, before.IsPackageSession);
            notices.Add((before.StaffMemberId, cancelled));
            notices.AddRange(owners.Select(owner => (owner, cancelled)));
        }
        else
        {
            var moved = NotificationTemplates.RescheduledByCustomer(service, customer, before.Date, before.StartTime, after.Date, after.StartTime, after.IsPackageSession);
            if (before.StaffMemberId == after.StaffMemberId)
            {
                notices.Add((after.StaffMemberId, moved));
            }
            else
            {
                notices.Add((before.StaffMemberId, NotificationTemplates.UnassignedForStaff(service, customer, before.Date, before.StartTime, before.IsPackageSession)));
                notices.Add((after.StaffMemberId, NewForStaff(after, names)));
            }

            notices.AddRange(owners.Select(owner => (owner, moved)));
        }

        await AddAsync(notices, Reference(before), actorUserId, cancellationToken);
    }

    public async Task AppointmentCompletedAsync(AppointmentNotice appointment, Guid? actorUserId, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(appointment);
        var names = await NamesAsync([appointment], cancellationToken);
        var content = NotificationTemplates.Completed(names.Service(appointment.SpaServiceId), appointment.Date, appointment.IsPackageSession);
        await AddAsync([(appointment.CustomerId, content)], Reference(appointment), actorUserId, cancellationToken);
    }

    public async Task OrderPaidAsync(Order order, AppointmentNotice? hold, bool holdExpired, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(order);
        var names = hold is null ? null : await NamesAsync([hold], cancellationToken);
        var content = NotificationTemplates.OrderPaid(order.Code, order.GrandTotal, hold is null ? null : names!.Service(hold.SpaServiceId),
            hold?.Date, hold?.StartTime, holdExpired);
        await AddAsync([(order.CustomerId, content)], new NotificationReference(NotificationReferenceType.Order, order.Id), null, cancellationToken);
        if (hold is not null && !holdExpired)
            await AddAsync([(hold.StaffMemberId, NewForStaff(hold, names!))], Reference(hold), null, cancellationToken);
    }

    public Task OrderCancelledByOwnerAsync(Order order, string reason, Guid? actorUserId, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(order);
        return AddAsync([(order.CustomerId, NotificationTemplates.OrderCancelledByOwner(order.Code, reason))],
            new NotificationReference(NotificationReferenceType.Order, order.Id), actorUserId, cancellationToken);
    }

    public Task ReviewRepliedAsync(Review review, string productName, Guid? actorUserId, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(review);
        return AddAsync([(review.CustomerId, NotificationTemplates.ReviewReplied(productName))],
            new NotificationReference(NotificationReferenceType.Review, review.Id), actorUserId, cancellationToken);
    }

    public Task TreatmentPlanStatusChangedAsync(Guid planId, Guid customerId, string packageName, TreatmentPlanStatus newStatus, string? reason,
        Guid? actorUserId, CancellationToken cancellationToken) =>
        AddAsync([(customerId, NotificationTemplates.TreatmentStatus(packageName, newStatus, reason))],
            new NotificationReference(NotificationReferenceType.TreatmentPlan, planId), actorUserId, cancellationToken);

    public Task WorkScheduleChangedAsync(WorkSchedule shift, WorkScheduleChange change, Guid? actorUserId, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(shift);
        return AddAsync([(shift.StaffMemberId, NotificationTemplates.Shift(change, shift.Date, shift.StartTime, shift.EndTime))],
            new NotificationReference(NotificationReferenceType.WorkSchedule, shift.Id), actorUserId, cancellationToken);
    }

    public async Task WorkSchedulesBatchCreatedAsync(IReadOnlyCollection<WorkSchedule> created, Guid? actorUserId, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(created);
        foreach (var shifts in created.GroupBy(shift => shift.StaffMemberId))
        {
            var content = NotificationTemplates.ShiftsBatch(shifts.Count(), shifts.Min(shift => shift.Date), shifts.Max(shift => shift.Date));
            await AddAsync([(shifts.Key, content)], null, actorUserId, cancellationToken);
        }
    }

    private static NotificationContent NewForStaff(AppointmentNotice appointment, NoticeNames names) =>
        NotificationTemplates.NewAppointmentForStaff(names.Service(appointment.SpaServiceId), appointment.Date, appointment.StartTime,
            names.User(appointment.CustomerId));

    private static NotificationReference Reference(AppointmentNotice appointment) =>
        new(NotificationReferenceType.Appointment, appointment.AppointmentId);

    private Task<NoticeNames> NamesAsync(IReadOnlyCollection<AppointmentNotice> appointments, CancellationToken cancellationToken) =>
        _notifications.GetNamesAsync(
            appointments.Select(appointment => appointment.SpaServiceId).Distinct().ToList(),
            appointments.SelectMany(appointment => new[] { appointment.CustomerId, appointment.StaffMemberId }).Distinct().ToList(),
            cancellationToken);

    private async Task AddAsync(IEnumerable<(Guid UserId, NotificationContent Content)> notices, NotificationReference? reference,
        Guid? actorUserId, CancellationToken cancellationToken)
    {
        var now = _clock.UtcNow;
        var seen = new HashSet<Guid>();
        foreach (var (userId, content) in notices)
        {
            if (userId == actorUserId || !seen.Add(userId))
                continue;
            await _notifications.AddAsync(Notification.Create(userId, content.Type, content.Title, content.Body, reference, null, now),
                cancellationToken);
        }
    }
}
