using NhuNguyetSpa.Application.DTOs.Bookings;

namespace NhuNguyetSpa.Application.DTOs.Care;

/// <summary>Filters of <c>GET /me/care-history</c> (UC-SPA-26); the text search and paging come from <c>PagedQuery</c>.</summary>
public sealed class CareHistoryQuery
{
    public DateOnly? FromDate { get; set; }
    public DateOnly? ToDate { get; set; }
    public Guid? CustomerId { get; set; }
}

public sealed record CareHistoryCriteria(
    string? Search, DateOnly? FromDate, DateOnly? ToDate, Guid? CustomerId, int PageNumber, int PageSize);

/// <summary>One visit the signed-in staff member completed (BR-CARE-07); the detail is <c>GET /appointments/{id}</c>.</summary>
public sealed record CareHistoryItemDto(
    Guid AppointmentId,
    DateOnly Date,
    TimeOnly StartTime,
    TimeOnly EndTime,
    AppointmentCustomerDto Customer,
    AppointmentServiceDto Service,
    TreatmentSessionRefDto? TreatmentSession,
    bool HasAllergies,
    Guid? SkinProfileId);
