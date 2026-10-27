using FluentValidation;
using FluentValidation.Results;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.Validators.Catalog;

/// <summary>
/// Catalog-specific checks on the shared <see cref="PagedQuery"/> (sort field, search length) and the owner status filter.
/// Kept here rather than in a second PagedQuery validator so other features keep their own sort fields.
/// </summary>
public static class CatalogQuery
{
    public const int MaxSearchLength = 100;

    public static (string? Search, CatalogSortField SortBy) Parse(PagedQuery query)
    {
        ArgumentNullException.ThrowIfNull(query);
        var failures = new List<ValidationFailure>();
        var search = string.IsNullOrWhiteSpace(query.Search) ? null : query.Search.Trim();
        if (search?.Length > MaxSearchLength)
            failures.Add(new ValidationFailure("search", $"Từ khóa tối đa {MaxSearchLength} ký tự.") { ErrorCode = "validation_error" });
        var sortBy = CatalogSortField.Name;
        if (!string.IsNullOrWhiteSpace(query.SortBy) && !Enum.TryParse(query.SortBy.Trim(), ignoreCase: true, out sortBy))
            failures.Add(new ValidationFailure("sortBy", "Chỉ sắp xếp được theo name hoặc price.") { ErrorCode = "validation_error" });
        if (!Enum.IsDefined(query.SortDirection))
            failures.Add(new ValidationFailure("sortDirection", "Chiều sắp xếp phải là asc hoặc desc.") { ErrorCode = "validation_error" });
        if (failures.Count > 0)
            throw new ValidationException(failures);
        return (search, sortBy);
    }

    /// <summary>Parses on_sale | discontinued; blank means every status.</summary>
    public static CatalogStatus? ParseStatus(string? status) => status?.Trim().ToLowerInvariant() switch
    {
        null or "" => null,
        "on_sale" => CatalogStatus.OnSale,
        "discontinued" => CatalogStatus.Discontinued,
        _ => throw new ValidationException([
            new ValidationFailure("status", "Trạng thái phải là on_sale hoặc discontinued.") { ErrorCode = "validation_error" }]),
    };
}
