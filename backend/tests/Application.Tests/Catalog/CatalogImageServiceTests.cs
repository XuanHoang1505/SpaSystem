using FluentAssertions;
using FluentValidation;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.Common.Storage;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Storage;
using NhuNguyetSpa.Application.UseCases.Catalog;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Exceptions;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Catalog;

/// <summary>Image upload and delete for services and packages (BR-CAT-08, 09; CAT-T24..T27).</summary>
public sealed class CatalogImageServiceTests
{
    private const long MaxBytes = 1024;
    private readonly ISpaServiceRepository _services = Substitute.For<ISpaServiceRepository>();
    private readonly IServicePackageRepository _packages = Substitute.For<IServicePackageRepository>();
    private readonly IFileStorage _storage = Substitute.For<IFileStorage>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly SpaService _service = new() { Name = "Chăm sóc da" };
    private readonly ServicePackage _package = new() { Name = "Gói" };
    private readonly CatalogImageService _sut;

    public CatalogImageServiceTests()
    {
        _services.GetByIdAsync(_service.Id, Arg.Any<CancellationToken>()).Returns(_service);
        _packages.GetByIdAsync(_package.Id, Arg.Any<CancellationToken>()).Returns(_package);
        _storage.UploadImageAsync(Arg.Any<Stream>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(call => "https://img.test/" + call.ArgAt<string>(1) + "?v=2");
        _sut = new CatalogImageService(_services, _packages, _storage, _unitOfWork, new ImageUploadReader(Options.Create(new ImageUploadOptions { MaxBytes = MaxBytes })));
    }

    private static ImageUploadRequest File(byte[] bytes) => new(new MemoryStream(bytes), bytes.Length);

    private static byte[] Padded(byte[] header, int length) => [.. header, .. new byte[length - header.Length]];

    [Fact]
    public async Task UploadStoresUrlReturnedByStorage()
    {
        var result = await _sut.UploadServiceImageAsync(_service.Id, File(ImageFormatDetectorTests.Png), CancellationToken.None);

        result.Data!.ImageUrl.Should().Be($"https://img.test/services/{_service.Id}?v=2");
        _service.ImageUrl.Should().Be(result.Data.ImageUrl);
        await _storage.Received(1).UploadImageAsync(Arg.Any<Stream>(), $"services/{_service.Id}", "image/png", Arg.Any<CancellationToken>());
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task PackageUploadUsesPackagesFolder()
    {
        await _sut.UploadPackageImageAsync(_package.Id, File(ImageFormatDetectorTests.Webp), CancellationToken.None);

        _package.ImageUrl.Should().Be($"https://img.test/packages/{_package.Id}?v=2");
        await _storage.Received(1).UploadImageAsync(Arg.Any<Stream>(), $"packages/{_package.Id}", "image/webp", Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task UploadSendsWholeFileFromTheStart()
    {
        var bytes = Padded(ImageFormatDetectorTests.Jpeg, 600);
        byte[]? sent = null;
        _storage.UploadImageAsync(Arg.Do<Stream>(stream => sent = ((MemoryStream)stream).ToArray()), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns("https://img.test/x");

        await _sut.UploadServiceImageAsync(_service.Id, File(bytes), CancellationToken.None);

        sent.Should().Equal(bytes);
    }

    public static TheoryData<byte[]?, string> InvalidFiles => new()
    {
        { ImageFormatDetectorTests.Gif, "image_type_not_supported" },
        { "plain text file"u8.ToArray(), "image_type_not_supported" },
        { [], "image_required" },
        { null, "image_required" },
        { Padded(ImageFormatDetectorTests.Png, (int)MaxBytes + 1), "image_too_large" },
    };

    [Theory]
    [MemberData(nameof(InvalidFiles))]
    public async Task UploadRejectsInvalidFilesBeforeCallingStorage(byte[]? bytes, string code)
    {
        var file = bytes is null ? new ImageUploadRequest(null, 0) : File(bytes);

        var act = () => _sut.UploadServiceImageAsync(_service.Id, file, CancellationToken.None);

        var failure = (await act.Should().ThrowAsync<ValidationException>()).Which.Errors.Should().ContainSingle().Which;
        failure.PropertyName.Should().Be("file");
        failure.ErrorCode.Should().Be(code);
        await _storage.DidNotReceiveWithAnyArgs().UploadImageAsync(default!, default!, default!, default);
    }

    [Fact]
    public async Task UploadFailureKeepsOldImage()
    {
        _service.SetImage("https://img.test/old");
        _storage.UploadImageAsync(Arg.Any<Stream>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(CatalogErrors.ImageStorageUnavailable());

        var act = () => _sut.UploadServiceImageAsync(_service.Id, File(ImageFormatDetectorTests.Jpeg), CancellationToken.None);

        (await act.Should().ThrowAsync<ServiceUnavailableException>()).Which.Code.Should().Be(CatalogErrors.ImageStorageUnavailableCode);
        _service.ImageUrl.Should().Be("https://img.test/old");
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task UploadOnMissingPackageThrowsPackageNotFound()
    {
        var act = () => _sut.UploadPackageImageAsync(Guid.NewGuid(), File(ImageFormatDetectorTests.Jpeg), CancellationToken.None);

        (await act.Should().ThrowAsync<NotFoundException>()).Which.Code.Should().Be(CatalogErrors.PackageNotFoundCode);
    }

    [Fact]
    public async Task DeleteCallsStorageOnlyWhenImageExists()
    {
        await _sut.DeletePackageImageAsync(_package.Id, CancellationToken.None);
        await _storage.DidNotReceiveWithAnyArgs().DeleteAsync(default!, default);

        _service.SetImage("https://img.test/a");
        await _sut.DeleteServiceImageAsync(_service.Id, CancellationToken.None);

        await _storage.Received(1).DeleteAsync($"services/{_service.Id}", Arg.Any<CancellationToken>());
        _service.ImageUrl.Should().BeNull();
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task DeleteFailureKeepsImageUrl()
    {
        _package.SetImage("https://img.test/p");
        _storage.DeleteAsync(Arg.Any<string>(), Arg.Any<CancellationToken>()).ThrowsAsync(CatalogErrors.ImageStorageUnavailable());

        var act = () => _sut.DeletePackageImageAsync(_package.Id, CancellationToken.None);

        await act.Should().ThrowAsync<ServiceUnavailableException>();
        _package.ImageUrl.Should().Be("https://img.test/p");
    }

    [Fact]
    public async Task DeleteOnMissingServiceThrowsServiceNotFound()
    {
        var act = () => _sut.DeleteServiceImageAsync(Guid.NewGuid(), CancellationToken.None);

        (await act.Should().ThrowAsync<NotFoundException>()).Which.Code.Should().Be(CatalogErrors.ServiceNotFoundCode);
    }
}
