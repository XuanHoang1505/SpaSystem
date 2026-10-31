using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Care;

/// <summary>The package after a session was completed (BR-TRT-03).</summary>
public sealed record PackageProgressDto(Guid CustomerPackageId, string PackageName, int UsedSessions, int TotalSessions, CustomerPackageStatus Status);
