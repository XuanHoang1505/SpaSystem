using FluentAssertions;
using FluentValidation;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.Common.Storage;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.Tests.Catalog;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Common;

/// <summary>Shared image reading and checks for catalog images and avatars (BR-CAT-08, BR-AUTH-19).</summary>
public sealed class ImageUploadReaderTests
{
    private const long MaxBytes = 1024;
    private readonly ImageUploadReader _sut = new(Options.Create(new ImageUploadOptions { MaxBytes = MaxBytes }));

    private static ImageUploadRequest File(byte[] bytes) => new(new MemoryStream(bytes), bytes.Length);

    private static async Task<string> ErrorCodeAsync(Func<Task> act) =>
        (await act.Should().ThrowAsync<ValidationException>()).Which.Errors.Single().ErrorCode;

    [Fact]
    public async Task EmptyFileIsRequired()
    {
        (await ErrorCodeAsync(() => _sut.ReadAsync(File([]), CancellationToken.None))).Should().Be("image_required");
        (await ErrorCodeAsync(() => _sut.ReadAsync(new ImageUploadRequest(null, 0), CancellationToken.None))).Should().Be("image_required");
    }

    [Fact]
    public async Task FileOverLimitIsTooLarge()
    {
        byte[] bytes = [.. ImageFormatDetectorTests.Png, .. new byte[MaxBytes]];

        (await ErrorCodeAsync(() => _sut.ReadAsync(File(bytes), CancellationToken.None))).Should().Be("image_too_large");
    }

    [Fact]
    public async Task StreamLongerThanDeclaredLengthIsTooLarge()
    {
        var bytes = new byte[MaxBytes + 1];

        (await ErrorCodeAsync(() => _sut.ReadAsync(new ImageUploadRequest(new MemoryStream(bytes), 10), CancellationToken.None)))
            .Should().Be("image_too_large");
    }

    [Fact]
    public async Task TextFileIsNotSupported()
    {
        var bytes = "day khong phai la anh"u8.ToArray();

        (await ErrorCodeAsync(() => _sut.ReadAsync(File(bytes), CancellationToken.None))).Should().Be("image_type_not_supported");
    }

    [Fact]
    public async Task ValidImageIsReturnedRewound()
    {
        await using var image = await _sut.ReadAsync(File(ImageFormatDetectorTests.Jpeg), CancellationToken.None);

        image.ContentType.Should().Be("image/jpeg");
        image.Content.Position.Should().Be(0);
        image.Content.Length.Should().Be(ImageFormatDetectorTests.Jpeg.Length);
    }
}
