namespace NhuNguyetSpa.Application.DTOs.Bookings;

/// <summary><c>GET /availability</c>: staff with at least one free slot, by name; slots by time.</summary>
public sealed record AvailabilityDto(DateOnly Date, int DurationMinutes, IReadOnlyList<AvailableStaffDto> Staff);

public sealed record AvailableStaffDto(Guid Id, string FullName, IReadOnlyList<TimeSlotDto> Slots);

public sealed record TimeSlotDto(TimeOnly StartTime, TimeOnly EndTime);
