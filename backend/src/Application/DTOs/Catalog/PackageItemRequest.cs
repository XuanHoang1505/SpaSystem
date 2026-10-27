namespace NhuNguyetSpa.Application.DTOs.Catalog;

public sealed record PackageItemRequest(Guid SpaServiceId, int SessionCount, int SortOrder, int MinDaysBetweenSessions, string? Note);
