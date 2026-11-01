using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Bookings;

namespace NhuNguyetSpa.Application.Interfaces.Services.Bookings;

/// <summary>UC-SPA-16: the signed-in customer's appointment list, reschedule and cancel (docs/specs/bookings.md).</summary>
public interface IMyAppointmentService
{
    /// <summary>The customer's appointments grouped by tab (BR-BKG-17), with change flags.</summary>
    Task<OperationResult<PagedResult<MyAppointmentListItemDto>>> ListAsync(
        PagedQuery paging, MyAppointmentListQuery query, CancellationToken cancellationToken);

    /// <summary>A1: moves a pending/confirmed appointment at least the cutoff before it (BR-BKG-07, 16); any staff when none is given.</summary>
    Task<OperationResult<MyAppointmentDto>> RescheduleAsync(Guid id, RescheduleMyAppointmentRequest request, CancellationToken cancellationToken);

    /// <summary>A2: cancels with a reason and gives back the entitlement or session (BR-BKG-07, 10).</summary>
    Task<OperationResult<MyAppointmentDto>> CancelAsync(Guid id, CancelAppointmentRequest request, CancellationToken cancellationToken);
}
