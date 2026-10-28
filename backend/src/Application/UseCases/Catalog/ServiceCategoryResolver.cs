using System.Text.RegularExpressions;
using NhuNguyetSpa.Application.Interfaces.Repositories;

namespace NhuNguyetSpa.Application.UseCases.Catalog;

/// <summary>
/// The only place that decides how a service category is stored (BR-CAT-04, Q-13). Moving to a service_categories
/// table later means changing this class and the repository lookup, not the services that call it.
/// </summary>
public sealed partial class ServiceCategoryResolver
{
    private readonly ISpaServiceRepository _services;

    public ServiceCategoryResolver(ISpaServiceRepository services) => _services = services;

    public static string Normalize(string? category) => category is null ? string.Empty : Whitespace().Replace(category.Trim(), " ");

    /// <summary>Returns the spelling already used by another service when one matches ignoring case and accents.</summary>
    public async Task<string> ResolveAsync(string category, Guid? excludeServiceId, CancellationToken cancellationToken)
    {
        var normalized = Normalize(category);
        if (normalized.Length == 0)
            return normalized;
        var existing = await _services.FindCategoryAsync(normalized, excludeServiceId, cancellationToken);
        return string.IsNullOrEmpty(existing) ? normalized : existing;
    }

    [GeneratedRegex(@"\s+")]
    private static partial Regex Whitespace();
}
