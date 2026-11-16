namespace NhuNguyetSpa.Application.Interfaces.Repositories;

/// <summary>A confirmed appointment that may need a reminder (BR-NTF-06); the service is derived (BR-BKG-13).</summary>
public sealed record ReminderCandidate(
    Guid AppointmentId,
    Guid CustomerId,
    string ServiceName,
    bool IsPackageSession,
    DateOnly Date,
    TimeOnly StartTime,
    DateTime CreatedAtUtc);
