namespace NhuNguyetSpa.Application.DTOs.Catalog;

public sealed record ServiceStepDto(int SortOrder, string Title, string? Description, int? DurationMinutes);
