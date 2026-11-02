using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.Common.Storage;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.Catalog;
using NhuNguyetSpa.Application.Interfaces.Storage;
using NhuNguyetSpa.Domain.Common;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Exceptions;

namespace NhuNguyetSpa.Application.UseCases.Catalog;

/// <summary>
/// Image upload and delete for services and packages through one code path (BR-CAT-08, 09). The stored URL changes only
/// after the storage call succeeds, so a failed upload or delete keeps the current image.
/// </summary>
public sealed class CatalogImageService : ICatalogImageService
{
    private readonly ISpaServiceRepository _services;
    private readonly IServicePackageRepository _packages;
    private readonly IFileStorage _storage;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ImageUploadReader _reader;

    public CatalogImageService(
        ISpaServiceRepository services, IServicePackageRepository packages, IFileStorage storage, IUnitOfWork unitOfWork,
        ImageUploadReader reader)
    {
        _services = services;
        _packages = packages;
        _storage = storage;
        _unitOfWork = unitOfWork;
        _reader = reader;
    }

    public Task<OperationResult<ImageUrlDto>> UploadServiceImageAsync(Guid id, ImageUploadRequest file, CancellationToken cancellationToken) =>
        UploadAsync(file, Service(id), cancellationToken);

    public Task<OperationResult<ImageUrlDto>> UploadPackageImageAsync(Guid id, ImageUploadRequest file, CancellationToken cancellationToken) =>
        UploadAsync(file, Package(id), cancellationToken);

    public Task DeleteServiceImageAsync(Guid id, CancellationToken cancellationToken) => DeleteAsync(Service(id), cancellationToken);

    public Task DeletePackageImageAsync(Guid id, CancellationToken cancellationToken) => DeleteAsync(Package(id), cancellationToken);

    private ImageTarget<SpaService> Service(Guid id) => new(
        token => _services.GetByIdAsync(id, token), CatalogErrors.ServiceNotFound, $"services/{id}",
        service => service.ImageUrl, (service, url) => service.SetImage(url), service => service.RemoveImage());

    private ImageTarget<ServicePackage> Package(Guid id) => new(
        token => _packages.GetByIdAsync(id, token), CatalogErrors.PackageNotFound, $"packages/{id}",
        package => package.ImageUrl, (package, url) => package.SetImage(url), package => package.RemoveImage());

    private async Task<OperationResult<ImageUrlDto>> UploadAsync<T>(ImageUploadRequest file, ImageTarget<T> target, CancellationToken cancellationToken)
        where T : BaseEntity
    {
        await using var image = await _reader.ReadAsync(file, cancellationToken);
        var entity = await target.Load(cancellationToken) ?? throw target.NotFound();

        var url = await _storage.UploadImageAsync(image.Content, target.PublicId, image.ContentType, cancellationToken);
        target.SetImage(entity, url);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return OperationResult<ImageUrlDto>.Success(new ImageUrlDto(url), "Đã cập nhật ảnh.");
    }

    private async Task DeleteAsync<T>(ImageTarget<T> target, CancellationToken cancellationToken) where T : BaseEntity
    {
        var entity = await target.Load(cancellationToken) ?? throw target.NotFound();
        if (target.ImageUrl(entity) is null)
            return;
        await _storage.DeleteAsync(target.PublicId, cancellationToken);
        target.RemoveImage(entity);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private sealed record ImageTarget<T>(
        Func<CancellationToken, Task<T?>> Load,
        Func<NotFoundException> NotFound,
        string PublicId,
        Func<T, string?> ImageUrl,
        Action<T, string> SetImage,
        Action<T> RemoveImage);
}
