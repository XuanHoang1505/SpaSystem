using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Interfaces.Ai;
using NhuNguyetSpa.Application.Interfaces.Notifications;
using NhuNguyetSpa.Application.Interfaces.Payments;
using NhuNguyetSpa.Application.Interfaces.Storage;
using Microsoft.Extensions.DependencyInjection;
using NhuNguyetSpa.Application.Interfaces.Authentication;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Infrastructure.Persistence;

namespace NhuNguyetSpa.IntegrationTests.Infrastructure;

/// <summary>API host pointed at the test container, with a fixed JWT key (overrides any local .env).</summary>
/// <remarks>
/// Mail goes to <see cref="Mail"/> (no real SMTP) and time comes from <see cref="Clock"/>, unless
/// <paramref name="useRealMailSender"/> is true; then MailSettings are emptied so no test can reach Gmail.
/// Images go to <see cref="Files"/> unless <paramref name="useRealFileStorage"/> is true; Cloudinary settings are always
/// emptied so no test can reach Cloudinary.
/// </remarks>
public sealed class AuthApiFactory : WebApplicationFactory<Program>
{
    public const string SecretKey = "test-secret-key-at-least-32-characters-long!!";

    private readonly string _connectionString;
    private readonly string? _secretKey;
    private readonly bool _useRealMailSender;
    private readonly bool _useRealFileStorage;

    private readonly bool _useRealPaymentGateway;
    private readonly IReadOnlyDictionary<string, string?> _settings;

    /// <param name="settings">Configuration overrides applied after the defaults below (e.g. lower AI rate limits).</param>
    public AuthApiFactory(string connectionString, string? secretKey = SecretKey, bool useRealMailSender = false, bool useRealFileStorage = false,
        bool useRealPaymentGateway = false, IReadOnlyDictionary<string, string?>? settings = null)
    {
        _connectionString = connectionString;
        _secretKey = secretKey;
        _useRealMailSender = useRealMailSender;
        _useRealFileStorage = useRealFileStorage;
        _useRealPaymentGateway = useRealPaymentGateway;
        _settings = settings ?? new Dictionary<string, string?>();
    }

    public FakeAiChatModel Ai { get; } = new();

    public const string WebResultPage = "https://web.test/payment/result";

    public FakePaymentGateway Payments { get; } = new();

    public FakeEmailSender Mail { get; } = new();

    public FakeFileStorage Files { get; } = new();

    public TestClock Clock { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.UseSetting("ConnectionStrings:Default", _connectionString);
        builder.UseSetting("Jwt:SecretKey", _secretKey ?? string.Empty);
        // Never use the developer's real Gmail credentials from .env in tests.
        builder.UseSetting("MailSettings:Mail", string.Empty);
        builder.UseSetting("MailSettings:Password", string.Empty);
        // Never use the developer's real Cloudinary credentials from .env in tests.
        builder.UseSetting("Cloudinary:CloudName", string.Empty);
        builder.UseSetting("Cloudinary:ApiKey", string.Empty);
        builder.UseSetting("Cloudinary:ApiSecret", string.Empty);
        // Never use the developer's real VNPay keys; tests drive payments through FakePaymentGateway and call expiry directly.
        builder.UseSetting("Vnpay:TmnCode", string.Empty);
        builder.UseSetting("Vnpay:HashSecret", string.Empty);
        builder.UseSetting("Payment:PublicApiBaseUrl", "https://api.test");
        builder.UseSetting("Payment:ClientReturnUrls:Web", WebResultPage);
        builder.UseSetting("OrderExpiry:Enabled", "false");
        // Never call Gemini with the developer's key; chats go through FakeAiChatModel. Tests share one client IP, so the AI
        // limiter is opened wide unless a test passes its own limits.
        builder.UseSetting("Ai:ApiKey", string.Empty);
        builder.UseSetting("Ai:RateLimit:PermitLimit", "100000");
        builder.UseSetting("Ai:RateLimit:DailyLimit", "100000");
        foreach (var (key, value) in _settings)
            builder.UseSetting(key, value);
        builder.ConfigureTestServices(services =>
        {
            services.AddSingleton<IAiChatModel>(Ai);
            if (!_useRealPaymentGateway)
                services.AddSingleton<IPaymentGateway>(Payments);
            services.AddSingleton<IDateTimeProvider>(Clock);
            if (!_useRealMailSender)
                services.AddSingleton<IEmailSender>(Mail);
            if (!_useRealFileStorage)
                services.AddSingleton<IFileStorage>(Files);
        });
    }

    public async Task<User> CreateUserAsync(string password, UserStatus status = UserStatus.Active, UserRole role = UserRole.Owner)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var unique = Guid.NewGuid().ToString("N");
        var user = new User
        {
            FullName = "Người dùng " + unique[..6],
            Email = $"user-{unique}@spa.test",
            PhoneNumber = "09" + Random.Shared.NextInt64(10_000_000, 99_999_999),
            PasswordHash = scope.ServiceProvider.GetRequiredService<IPasswordHasher>().Hash(password),
            Role = role,
            Status = status,
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();
        return user;
    }

    public static async Task<(HttpResponseMessage Response, JsonDocument Body)> PostAsync(HttpClient client, string path, object payload, string? bearer = null)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, path) { Content = JsonContent.Create(payload) };
        if (bearer is not null) request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearer);
        var response = await client.SendAsync(request);
        var text = await response.Content.ReadAsStringAsync();
        return (response, JsonDocument.Parse(string.IsNullOrEmpty(text) ? "{}" : text));
    }
}
