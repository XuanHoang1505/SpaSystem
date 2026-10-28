using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Catalog;

namespace NhuNguyetSpa.Application.Interfaces.Services.Catalog;

/// <summary>Owner uploads, replaces and deletes service and package images (UC-SPA-09 A4/A5, BR-CAT-08/09).</summary>
public interface ICatalogImageService
{
    Task<OperationResult<ImageUrlDto>> UploadServiceImageAsync(Guid id, ImageUploadRequest file, CancellationToken cancellationToken);
    Task<OperationResult<ImageUrlDto>> UploadPackageImageAsync(Guid id, ImageUploadRequest file, CancellationToken cancellationToken);
    Task DeleteServiceImageAsync(Guid id, CancellationToken cancellationToken);
    Task DeletePackageImageAsync(Guid id, CancellationToken cancellationToken);
}
