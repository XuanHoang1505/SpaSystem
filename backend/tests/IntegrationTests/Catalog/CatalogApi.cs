using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Infrastructure;

namespace NhuNguyetSpa.IntegrationTests.Catalog;

/// <summary>
/// HTTP and seeding helpers for catalog endpoint tests. Every test tags its rows with a unique <see cref="Tag"/> and
/// searches by it, so rows left by other tests in the shared container never change the result.
/// </summary>
public sealed class CatalogApi
{
    public const string Password = "matkhau123";

    private readonly AuthApiFactory _factory;
    private readonly PostgresFixture _postgres;

    public CatalogApi(AuthApiFactory factory, PostgresFixture postgres)
    {
        _factory = factory;
        _postgres = postgres;
        Client = factory.CreateClient();
    }

    public HttpClient Client { get; }

    public static string NewTag() => "t" + Guid.NewGuid().ToString("N")[..10];

    public async Task<string> LoginAsync(UserRole role)
    {
        var user = await _factory.CreateUserAsync(Password, role: role);
        var (_, body) = await AuthApiFactory.PostAsync(Client, "/api/v1/auth/login", new { login = user.Email, password = Password });
        return body.RootElement.GetProperty("data").GetProperty("accessToken").GetString()!;
    }

    public Task<(HttpResponseMessage Response, JsonDocument Body)> GetAsync(string path, string? bearer = null) =>
        SendAsync(HttpMethod.Get, path, null, bearer);

    public Task<(HttpResponseMessage Response, JsonDocument Body)> SendJsonAsync(HttpMethod method, string path, object payload, string? bearer) =>
        SendAsync(method, path, JsonContent.Create(payload), bearer);

    public async Task<(HttpResponseMessage Response, JsonDocument Body)> SendAsync(HttpMethod method, string path, HttpContent? content, string? bearer)
    {
        using var request = new HttpRequestMessage(method, path) { Content = content };
        if (bearer is not null)
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearer);
        var response = await Client.SendAsync(request);
        var text = await response.Content.ReadAsStringAsync();
        return (response, JsonDocument.Parse(string.IsNullOrEmpty(text) ? "{}" : text));
    }

    public static MultipartFormDataContent ImageForm(byte[] bytes, string fileName = "anh.jpg", string contentType = "image/jpeg", string field = "file")
    {
        var form = new MultipartFormDataContent();
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        form.Add(file, field, fileName);
        return form;
    }

    public async Task<SpaService> SeedServiceAsync(
        string name, string category = "Chăm sóc da", decimal price = 300_000, CatalogStatus status = CatalogStatus.OnSale, string? imageUrl = null)
    {
        await using var context = _postgres.CreateContext();
        var service = new SpaService { Name = name, Category = category, DurationMinutes = 60, Price = price, Description = "Mô tả" };
        service.ChangeStatus(status);
        if (imageUrl is not null)
            service.SetImage(imageUrl);
        context.SpaServices.Add(service);
        await context.SaveChangesAsync();
        return service;
    }

    public async Task<ServicePackage> SeedPackageAsync(
        string name, IReadOnlyList<SpaService> services, decimal price = 2_000_000, CatalogStatus status = CatalogStatus.OnSale,
        DateOnly? saleStart = null, DateOnly? saleEnd = null, string? imageUrl = null, IReadOnlyList<int>? sortOrders = null)
    {
        await using var context = _postgres.CreateContext();
        var package = new ServicePackage { Name = name, Price = price, ValidityDays = 90, SaleStartDate = saleStart, SaleEndDate = saleEnd };
        package.ChangeStatus(status);
        if (imageUrl is not null)
            package.SetImage(imageUrl);
        package.ReplaceItems(services.Select((service, index) => new ServicePackageItem
        {
            ServicePackageId = package.Id,
            SpaServiceId = service.Id,
            SessionCount = index + 1,
            SortOrder = sortOrders?[index] ?? index + 1,
            MinDaysBetweenSessions = 7,
        }));
        context.ServicePackages.Add(package);
        await context.SaveChangesAsync();
        return package;
    }

    public static JsonElement Data(JsonDocument body) => body.RootElement.GetProperty("data");

    public static string ErrorCode(JsonDocument body) => body.RootElement.GetProperty("errors")[0].GetProperty("code").GetString()!;

    public static string[] Names(JsonDocument body) =>
        Data(body).GetProperty("items").EnumerateArray().Select(item => item.GetProperty("name").GetString()!).ToArray();
}
