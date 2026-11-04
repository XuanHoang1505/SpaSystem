using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Bookings;

namespace NhuNguyetSpa.Application.Interfaces.Services.Bookings;

/// <summary>The free-slot algorithm shared by UC-SPA-15, 16 and 17 (docs/specs/bookings.md, BR-BKG-12).</summary>
public interface IAvailabilityService
{
    Task<OperationResult<AvailabilityDto>> GetAsync(AvailabilityQuery query, CancellationToken cancellationToken);
}
