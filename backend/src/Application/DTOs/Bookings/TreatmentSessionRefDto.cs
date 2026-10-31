namespace NhuNguyetSpa.Application.DTOs.Bookings;

public sealed record TreatmentSessionRefDto(Guid Id, int SequenceNumber, int TotalSessions, Guid CustomerPackageId, string PackageName);
