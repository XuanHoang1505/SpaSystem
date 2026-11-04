using FluentValidation;
using FluentValidation.Results;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.UseCases.Catalog;

namespace NhuNguyetSpa.Application.Common.Storage;

/// <summary>
/// Reads an uploaded image into memory and checks it (BR-CAT-08), shared by catalog images and avatars (BR-AUTH-19).
/// Errors are validation errors on the <c>file</c> field.
/// </summary>
public sealed class ImageUploadReader
{
    private const string FileField = "file";

    private readonly IOptions<ImageUploadOptions> _options;

    public ImageUploadReader(IOptions<ImageUploadOptions> options) => _options = options;

    public async Task<ValidatedImage> ReadAsync(ImageUploadRequest file, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(file);
        var content = await ReadLimitedAsync(file, cancellationToken);
        var contentType = ImageFormatDetector.Detect(content.GetBuffer().AsSpan(0, (int)content.Length));
        if (contentType is null)
        {
            await content.DisposeAsync();
            throw Invalid("image_type_not_supported", "Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.");
        }
        content.Position = 0;
        return new ValidatedImage(content, contentType);
    }

    /// <summary>Copies at most MaxBytes + 1 bytes, so a stream longer than its declared length is still rejected.</summary>
    private async Task<MemoryStream> ReadLimitedAsync(ImageUploadRequest file, CancellationToken cancellationToken)
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
}
