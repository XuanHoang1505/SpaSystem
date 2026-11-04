namespace NhuNguyetSpa.Application.DTOs.Bookings;

/// <summary>A staff member who can do the service and works on the date (algorithm step A3).</summary>
public sealed record AvailabilityCandidate(Guid StaffMemberId, string FullName);
