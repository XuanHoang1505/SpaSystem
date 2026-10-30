using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Bookings;

namespace NhuNguyetSpa.Application.Interfaces.Services.Bookings;

/// <summary>UC-SPA-17 owner appointment management, plus the assigned staff member's detail view (docs/specs/bookings.md).</summary>
public interface IAppointmentManagementService
{
    Task<OperationResult<PagedResult<AppointmentListItemDto>>> ListAsync(PagedQuery paging, AppointmentListQuery query, CancellationToken cancellationToken);

    /// <summary>Owner, or the staff member the appointment is assigned to (<c>appointment_not_assigned</c> otherwise).</summary>
    Task<OperationResult<AppointmentDetailDto>> GetAsync(Guid id, CancellationToken cancellationToken);

    Task<OperationResult<AppointmentDetailDto>> ConfirmAsync(Guid id, CancellationToken cancellationToken);
    Task<OperationResult<AppointmentDetailDto>> RescheduleAsync(Guid id, RescheduleAppointmentRequest request, CancellationToken cancellationToken);
    Task<OperationResult<AppointmentDetailDto>> AssignStaffAsync(Guid id, AssignAppointmentStaffRequest request, CancellationToken cancellationToken);
    Task<OperationResult<AppointmentDetailDto>> CancelAsync(Guid id, CancelAppointmentRequest request, CancellationToken cancellationToken);
    Task<OperationResult<AppointmentDetailDto>> MarkNoShowAsync(Guid id, MarkNoShowRequest request, CancellationToken cancellationToken);
}
