using NhuNguyetSpa.Application.DTOs.Bookings;

namespace NhuNguyetSpa.Application.UseCases.Bookings;

/// <summary>BR-BKG-14 "any staff" (Q-26, <c>least_busy</c>): fewest occupying appointments that day, then name, then id.</summary>
public static class StaffPicker
{
    public static AvailabilityCandidate? PickLeastBusy(IReadOnlyList<(AvailabilityCandidate Candidate, int OccupyingCount)> free)
    {
        ArgumentNullException.ThrowIfNull(free);
        return free
            .OrderBy(entry => entry.OccupyingCount)
            .ThenBy(entry => entry.Candidate.FullName, StringComparer.Ordinal)
            .ThenBy(entry => entry.Candidate.StaffMemberId)
            .Select(entry => entry.Candidate)
            .FirstOrDefault();
    }
}
