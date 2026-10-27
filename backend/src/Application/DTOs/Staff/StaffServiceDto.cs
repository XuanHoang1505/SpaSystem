using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Staff;

public sealed record StaffServiceDto(Guid Id, string Name, CatalogStatus Status);
