using NhuNguyetSpa.Domain.Exceptions;

namespace NhuNguyetSpa.Application.UseCases.Catalog;

/// <summary>Error codes and user-facing messages for UC-SPA-06/07/09 (docs/specs/catalog.md).</summary>
public static class CatalogErrors
{
    public const string ServiceNotFoundCode = "service_not_found";
    public const string PackageNotFoundCode = "package_not_found";
    public const string PackageServiceNotFoundCode = "package_service_not_found";
    public const string PackageServiceDiscontinuedCode = "package_service_discontinued";
    public const string ImageStorageUnavailableCode = "image_storage_unavailable";

    // One message whether the item is missing or hidden from the caller, so guests cannot probe for hidden items.
    public static NotFoundException ServiceNotFound() => new("Không tìm thấy dịch vụ hoặc dịch vụ hiện không mở bán.", ServiceNotFoundCode);

    public static NotFoundException PackageNotFound() => new("Không tìm thấy gói dịch vụ hoặc gói hiện không mở bán.", PackageNotFoundCode);

    public static BusinessRuleException PackageServiceNotFound(int sortOrder) =>
        new($"Dịch vụ ở thứ tự {sortOrder} không tồn tại.", PackageServiceNotFoundCode);

    public static BusinessRuleException PackageServiceDiscontinued(int sortOrder, string serviceName) =>
        new($"Dịch vụ \"{serviceName}\" (thứ tự {sortOrder}) đang ngừng bán, không thể thêm vào gói.", PackageServiceDiscontinuedCode);

    public static ServiceUnavailableException ImageStorageUnavailable() =>
        new("Không lưu được ảnh lúc này, vui lòng thử lại sau.", ImageStorageUnavailableCode);
}
