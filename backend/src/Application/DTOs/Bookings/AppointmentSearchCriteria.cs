using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Bookings;

/// <summary>Repository input for the owner list: dates inclusive; <see cref="Search"/> matches customer name (accent-insensitive) or phone.</summary>
public sealed record AppointmentSearchCriteria(
    DateOnly FromDate,
    DateOnly ToDate,
    Guid? StaffMemberId,
    AppointmentStatus? Status,
    string? Search,
    int PageNumber,
    int PageSize);
