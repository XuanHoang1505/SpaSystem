using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Bookings;

namespace NhuNguyetSpa.Application.Interfaces.Services.Bookings;

/// <summary>UC-SPA-15 customer bookings and the customer's own appointment (docs/specs/bookings.md).</summary>
public interface ICustomerBookingService
{
    /// <summary>Flow 1: holds the slot and creates its order in one transaction (BR-BKG-06).</summary>
    Task<OperationResult<BookNowResult>> BookNowAsync(BookNowRequest request, Guid? idempotencyKey, CancellationToken cancellationToken);

    /// <summary>Flow 2: books with a bought service or a package session; the appointment is confirmed at once (Q-02).</summary>
    Task<OperationResult<MyAppointmentDto>> BookFromEntitlementAsync(BookAppointmentRequest request, CancellationToken cancellationToken);

    Task<OperationResult<MyAppointmentDto>> GetAsync(Guid id, CancellationToken cancellationToken);
}
