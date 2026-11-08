namespace NhuNguyetSpa.Application.DTOs.Catalog;

/// <summary>One procedure step sent by the owner; its order in the list becomes its sort order (BR-CAT-16).</summary>
public sealed record ServiceStepRequest(string Title, string? Description, int? DurationMinutes);
