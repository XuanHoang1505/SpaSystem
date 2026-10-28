using FluentValidation;
using FluentValidation.Results;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.Common.Options;
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
    private const string FileField = "file";

    private readonly ISpaServiceRepository _services;
    private readonly IServicePackageRepository _packages;
    private readonly IFileStorage _storage;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IOptions<ImageUploadOptions> _options;

    public CatalogImageService(
        ISpaServiceRepository services, IServicePackageRepository packages, IFileStorage storage, IUnitOfWork unitOfWork,
        IOptions<ImageUploadOptions> options)
    {
        _services = services;
        _packages = packages;
        _storage = storage;
        _unitOfWork = unitOfWork;
        _options = options;
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
        ArgumentNullException.ThrowIfNull(file);
        await using var content = await ReadValidatedAsync(file, cancellationToken);
        var contentType = ImageFormatDetector.Detect(content.GetBuffer().AsSpan(0, (int)content.Length))
            ?? throw Invalid("image_type_not_supported", "Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.");
        var entity = await target.Load(cancellationToken) ?? throw target.NotFound();

        content.Position = 0;
        var url = await _storage.UploadImageAsync(content, target.PublicId, contentType, cancellationToken);
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

    /// <summary>Copies at most MaxBytes + 1 bytes, so a stream longer than its declared length is still rejected.</summary>
    private async Task<MemoryStream> ReadValidatedAsync(ImageUploadRequest file, CancellationToken cancellationToken)
    {
        if (file.Content is null || file.Length <= 0)
            throw Invalid("image_required", "Vui lòng chọn ảnh để tải lên.");
        var maxBytes = _options.Value.MaxBytes;
        if (file.Length > maxBytes)
            throw TooLarge(maxBytes);

        var buffer = new MemoryStream();
        var chunk = new byte[81920];
        int read;
        while ((read = await file.Content.ReadAsync(chunk, cancellationToken)) > 0)
        {
            if (buffer.Length + read > maxBytes)
            {
                await buffer.DisposeAsync();
                throw TooLarge(maxBytes);
            }
            buffer.Write(chunk, 0, read);
        }
        if (buffer.Length == 0)
        {
            await buffer.DisposeAsync();
            throw Invalid("image_required", "Vui lòng chọn ảnh để tải lên.");
        }
        return buffer;
    }

    private static ValidationException TooLarge(long maxBytes) =>
        Invalid("image_too_large", $"Ảnh tối đa {maxBytes / (1024.0 * 1024):0.#} MB.");

    private static ValidationException Invalid(string code, string message) =>
        new([new ValidationFailure(FileField, message) { ErrorCode = code }]);

    private sealed record ImageTarget<T>(
        Func<CancellationToken, Task<T?>> Load,
        Func<NotFoundException> NotFound,
        string PublicId,
        Func<T, string?> ImageUrl,
        Action<T, string> SetImage,
        Action<T> RemoveImage);
}
