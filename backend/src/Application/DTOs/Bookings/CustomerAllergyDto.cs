using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Bookings;

public sealed record CustomerAllergyDto(Guid Id, string Allergen, AllergySeverity Severity, string? Note, DateTime RecordedAtUtc);
