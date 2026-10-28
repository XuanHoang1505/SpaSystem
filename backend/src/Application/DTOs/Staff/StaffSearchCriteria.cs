namespace NhuNguyetSpa.Application.DTOs.Staff;

/// <summary>
/// Repository input for staff lists. <see cref="Resigned"/>: null = everyone, true = resignation date reached,
/// false = still working on <see cref="Today"/>. Public lists always mean working, active accounts.
/// </summary>
public sealed record StaffSearchCriteria(
    string? Search,
    bool? Resigned,
    Guid? SpaServiceId,
    DateOnly Today,
    int PageNumber,
    int PageSize);
