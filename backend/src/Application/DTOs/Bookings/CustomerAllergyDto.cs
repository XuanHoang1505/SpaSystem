using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Bookings;

public sealed record CustomerAllergyDto(string Allergen, AllergySeverity Severity, string? Note);
