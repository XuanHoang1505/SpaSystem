using System.Net;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.Catalog;

/// <summary>Image endpoints with a fake storage (CAT-T24..T28); no test reaches Cloudinary.</summary>
[Collection(PostgresCollection.Name)]
public sealed class CatalogImageEndpointsTests : IAsyncLifetime
{
    private static readonly byte[] Jpeg = [0xFF, 0xD8, 0xFF, 0xE0, 0, 0x10, 0x4A, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1];
    private static readonly byte[] Png = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0x0D, 0x49, 0x48, 0x44, 0x52];
    private static readonly byte[] Webp = [.."RIFF"u8, 0x24, 0, 0, 0, .."WEBP"u8, .."VP8 "u8];
    private static readonly byte[] Gif = [.."GIF89a"u8, 1, 0, 1, 0, 0x80, 0, 0, 0, 0, 0];

    private readonly PostgresFixture _postgres;
    private AuthApiFactory _factory = null!;
    private CatalogApi _api = null!;
    private string _owner = null!;

    public CatalogImageEndpointsTests(PostgresFixture postgres) => _postgres = postgres;

    public async Task InitializeAsync()
    {
        _factory = new AuthApiFactory(_postgres.ConnectionString);
        _api = new CatalogApi(_factory, _postgres);
        _owner = await _api.LoginAsync(UserRole.Owner);
    }

    public async Task DisposeAsync()
    {
        _api.Client.Dispose();
        await _factory.DisposeAsync();
    }

    [Fact]
    public async Task OwnerUploadsJpegPngAndWebpForServicesAndPackages()
    {
        var tag = CatalogApi.NewTag();
        var service = await _api.SeedServiceAsync($"{tag} ảnh");
        var package = await _api.SeedPackageAsync($"{tag} gói ảnh", [service], status: CatalogStatus.Discontinued);

        var (jpeg, jpegBody) = await Upload($"/api/v1/services/{service.Id}/image", Jpeg, "anh.png", "image/png");
        var (png, _) = await Upload($"/api/v1/services/{service.Id}/image", Png);
        var (webp, webpBody) = await Upload($"/api/v1/packages/{package.Id}/image", Webp);

        jpeg.StatusCode.Should().Be(HttpStatusCode.OK);
        png.StatusCode.Should().Be(HttpStatusCode.OK);
        webp.StatusCode.Should().Be(HttpStatusCode.OK, "discontinued packages can still get an image");
        CatalogApi.Data(jpegBody).GetProperty("imageUrl").GetString().Should().StartWith($"https://res.cloudinary.test/services/{service.Id}");
        _factory.Files.Uploads.Select(upload => (upload.PublicId, upload.ContentType)).Should().Equal(
            ($"services/{service.Id}", "image/jpeg"), ($"services/{service.Id}", "image/png"), ($"packages/{package.Id}", "image/webp"));
        _factory.Files.Uploads.First().Bytes.Should().Equal(Jpeg);
        await using var context = _postgres.CreateContext();
        (await context.SpaServices.AsNoTracking().SingleAsync(row => row.Id == service.Id)).ImageUrl.Should().EndWith("?v=2");
        (await context.ServicePackages.AsNoTracking().SingleAsync(row => row.Id == package.Id)).ImageUrl
            .Should().Be(CatalogApi.Data(webpBody).GetProperty("imageUrl").GetString());
    }

    [Fact]
    public async Task UploadRejectsFilesThatAreNotSupportedImages()
    {
        var service = await _api.SeedServiceAsync($"{CatalogApi.NewTag()} sai ảnh");
        var path = $"/api/v1/services/{service.Id}/image";

        await Expect(await Upload(path, Gif, "anh.jpg", "image/jpeg"), "image_type_not_supported");
        await Expect(await Upload(path, "đây là văn bản thường"u8.ToArray(), "anh.jpg", "image/jpeg"), "image_type_not_supported");
        await Expect(await Upload(path, [], "anh.jpg", "image/jpeg"), "image_required");
        await Expect(await _api.SendAsync(HttpMethod.Post, path, CatalogApi.ImageForm(Jpeg, field: "photo"), _owner), "image_required");
        await Expect(await Upload(path, [.. Jpeg, .. new byte[5 * 1024 * 1024 + 1 - Jpeg.Length]]), "image_too_large");
        _factory.Files.Uploads.Should().BeEmpty();

        static Task Expect((HttpResponseMessage Response, System.Text.Json.JsonDocument Body) result, string code)
        {
            result.Response.StatusCode.Should().Be(HttpStatusCode.BadRequest, code);
            CatalogApi.ErrorCode(result.Body).Should().Be(code);
            result.Body.RootElement.GetProperty("errors")[0].GetProperty("field").GetString().Should().Be("file");
            return Task.CompletedTask;
        }
    }

    [Fact]
    public async Task StorageFailureKeepsCurrentImage()
    {
        var service = await _api.SeedServiceAsync($"{CatalogApi.NewTag()} lỗi lưu", imageUrl: "https://img.test/cu.jpg");
        _factory.Files.Fail = true;

        var (response, body) = await Upload($"/api/v1/services/{service.Id}/image", Jpeg);
        var (delete, _) = await _api.SendAsync(HttpMethod.Delete, $"/api/v1/services/{service.Id}/image", null, _owner);

        response.StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);
        CatalogApi.ErrorCode(body).Should().Be("image_storage_unavailable");
        delete.StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);
        await using var context = _postgres.CreateContext();
        (await context.SpaServices.AsNoTracking().SingleAsync(row => row.Id == service.Id)).ImageUrl.Should().Be("https://img.test/cu.jpg");
    }

    [Fact]
    public async Task DeleteImageClearsUrlAndSkipsStorageWhenThereIsNoImage()
    {
        var tag = CatalogApi.NewTag();
        var service = await _api.SeedServiceAsync($"{tag} xóa ảnh", imageUrl: "https://img.test/a.jpg");
        var package = await _api.SeedPackageAsync($"{tag} gói không ảnh", [service]);

        var (deleteService, _) = await _api.SendAsync(HttpMethod.Delete, $"/api/v1/services/{service.Id}/image", null, _owner);
        var (deletePackage, _) = await _api.SendAsync(HttpMethod.Delete, $"/api/v1/packages/{package.Id}/image", null, _owner);
        var (missing, missingBody) = await _api.SendAsync(HttpMethod.Delete, $"/api/v1/packages/{Guid.NewGuid()}/image", null, _owner);

        deleteService.StatusCode.Should().Be(HttpStatusCode.NoContent);
        deletePackage.StatusCode.Should().Be(HttpStatusCode.NoContent);
        missing.StatusCode.Should().Be(HttpStatusCode.NotFound);
        CatalogApi.ErrorCode(missingBody).Should().Be("package_not_found");
        _factory.Files.Deletes.Should().Equal($"services/{service.Id}");
        await using var context = _postgres.CreateContext();
        (await context.SpaServices.AsNoTracking().SingleAsync(row => row.Id == service.Id)).ImageUrl.Should().BeNull();
    }

    [Fact]
    public async Task MissingCloudinaryConfigurationOnlyBreaksImageEndpoints()
    {
        await using var factory = new AuthApiFactory(_postgres.ConnectionString, useRealFileStorage: true);
        var api = new CatalogApi(factory, _postgres);
        var owner = await api.LoginAsync(UserRole.Owner);
        var service = await api.SeedServiceAsync($"{CatalogApi.NewTag()} không cấu hình");

        var (live, _) = await api.GetAsync("/health/live");
        var (list, _) = await api.GetAsync("/api/v1/services");
        var (upload, body) = await api.SendAsync(HttpMethod.Post, $"/api/v1/services/{service.Id}/image", CatalogApi.ImageForm(Jpeg), owner);

        live.StatusCode.Should().Be(HttpStatusCode.OK);
        list.StatusCode.Should().Be(HttpStatusCode.OK);
        upload.StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);
        CatalogApi.ErrorCode(body).Should().Be("image_storage_unavailable");
        body.RootElement.GetRawText().Should().NotContainAny("CLOUDINARY", "Cloudinary", "ApiSecret");
        api.Client.Dispose();
    }

    private Task<(HttpResponseMessage Response, System.Text.Json.JsonDocument Body)> Upload(
        string path, byte[] bytes, string fileName = "anh.jpg", string contentType = "image/jpeg") =>
        _api.SendAsync(HttpMethod.Post, path, CatalogApi.ImageForm(bytes, fileName, contentType), _owner);
}
