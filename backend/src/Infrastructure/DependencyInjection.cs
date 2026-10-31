using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.Interfaces.Authentication;
using NhuNguyetSpa.Infrastructure.Authentication;
using NhuNguyetSpa.Application.Interfaces.Notifications;
using NhuNguyetSpa.Application.Interfaces.Payments;
using NhuNguyetSpa.Infrastructure.BackgroundJobs;
using NhuNguyetSpa.Infrastructure.Payments;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Storage;
using NhuNguyetSpa.Application.UseCases.Staff;
using NhuNguyetSpa.Infrastructure.Common;
using NhuNguyetSpa.Infrastructure.Notifications;
using NhuNguyetSpa.Infrastructure.Persistence;
using NhuNguyetSpa.Infrastructure.Persistence.Interceptors;
using NhuNguyetSpa.Infrastructure.Persistence.Seeds;
using NhuNguyetSpa.Infrastructure.Repositories;
using NhuNguyetSpa.Infrastructure.Storage;

namespace NhuNguyetSpa.Infrastructure;

public static class DependencyInjection
{
    public const string ConnectionStringName = "Default";
    public const string ReadinessTag = "ready";

    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);
        services.AddSingleton<IDateTimeProvider, SystemDateTimeProvider>();

        services.AddScoped<AuditableEntityInterceptor>();
        // The connection string is read when a DbContext is first needed, so hosts without a database
        // (for example tests that never touch persistence) still start.
        services.AddDbContext<AppDbContext>((provider, options) =>
        {
            var connectionString = configuration.GetConnectionString(ConnectionStringName);
            if (string.IsNullOrWhiteSpace(connectionString))
                throw new InvalidOperationException($"Connection string 'ConnectionStrings:{ConnectionStringName}' is not configured.");
            ConfigureDbContext(options, connectionString);
            options.AddInterceptors(provider.GetRequiredService<AuditableEntityInterceptor>());
        });
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
        services.AddScoped<IOtpCodeRepository, OtpCodeRepository>();
        services.AddScoped<ISpaServiceRepository, SpaServiceRepository>();
        services.AddScoped<IServicePackageRepository, ServicePackageRepository>();
        services.AddScoped<IStaffMemberRepository, StaffMemberRepository>();
        services.AddScoped<IWorkScheduleRepository, WorkScheduleRepository>();
        services.AddScoped<IAppointmentRepository, AppointmentRepository>();
        services.AddScoped<IPurchaseRepository, PurchaseRepository>();
        services.AddScoped<ISkinProfileRepository, SkinProfileRepository>();
        services.AddScoped<ICustomerAllergyRepository, CustomerAllergyRepository>();
        services.AddScoped<IPromotionRepository, PromotionRepository>();
        services.AddScoped<ICartRepository, CartRepository>();
        services.AddScoped<IOrderRepository, OrderRepository>();
        services.AddScoped<IPaymentRepository, PaymentRepository>();

        // Validated when first resolved (no ValidateOnStart): a missing JWT_KEY must not stop health checks or Swagger.
        services.AddOptions<JwtOptions>()
            .Bind(configuration.GetSection(JwtOptions.SectionName))
            .Validate(options => options.SecretKey.Length >= JwtOptions.MinimumSecretKeyLength,
                $"Jwt:SecretKey (JWT_KEY in .env) must be at least {JwtOptions.MinimumSecretKeyLength} characters.");
        services.AddOptions<AccountOptions>().Bind(configuration.GetSection(AccountOptions.SectionName));
        // Mail credentials are checked by SmtpEmailSender when sending (not at startup), like JWT_KEY.
        services.AddOptions<MailSettings>().Bind(configuration.GetSection(MailSettings.SectionName));
        services.AddSingleton<IEmailSender, SmtpEmailSender>();
        // Cloudinary credentials are checked by CloudinaryFileStorage on each image call, so the API starts without them.
        services.AddOptions<CloudinaryOptions>().Bind(configuration.GetSection(CloudinaryOptions.SectionName));
        services.AddSingleton<IFileStorage, CloudinaryFileStorage>();
        services.AddOptions<ImageUploadOptions>()
            .Bind(configuration.GetSection(ImageUploadOptions.SectionName))
            .Validate(options => options.MaxBytes is > 0 and <= ImageUploadOptions.HardLimitBytes,
                $"ImageUpload:MaxBytes must be between 1 and {ImageUploadOptions.HardLimitBytes}.");
        services.AddOptions<StaffOptions>()
            .Bind(configuration.GetSection(StaffOptions.SectionName))
            .Validate(options => options.TemporaryPasswordLength is >= TemporaryPasswordGenerator.MinLength and <= TemporaryPasswordGenerator.MaxLength,
                $"Staff:TemporaryPasswordLength must be between {TemporaryPasswordGenerator.MinLength} and {TemporaryPasswordGenerator.MaxLength}.");
        services.AddOptions<WorkScheduleOptions>()
            .Bind(configuration.GetSection(WorkScheduleOptions.SectionName))
            .Validate(options => options.MaxDaysAhead is >= 1 and <= 366 && options.MaxQueryRangeDays is >= 1 and <= 366 &&
                                 options.MaxBatchShifts is >= 1 and <= 5000,
                "WorkSchedule:MaxDaysAhead and MaxQueryRangeDays must be 1–366, MaxBatchShifts 1–5000.");
        services.AddOptions<BookingOptions>()
            .Bind(configuration.GetSection(BookingOptions.SectionName))
            .Validate(BookingOptions.IsValid,
                "Booking:SlotStepMinutes must be 5–60 and divide 60; MaxDaysAhead and MaxQueryRangeDays must be 1–366; " +
                "AutoAssignStrategy must be least_busy.")
            .ValidateOnStart();
        // VNPay keys are checked by VnpayPaymentGateway on each call, so the API starts without them (like Cloudinary).
        services.AddOptions<VnpayOptions>().Bind(configuration.GetSection(VnpayOptions.SectionName));
        services.AddSingleton<IPaymentGateway, VnpayPaymentGateway>();
        services.AddOptions<CartOptions>()
            .Bind(configuration.GetSection(CartOptions.SectionName))
            .Validate(options => options.MaxItems is >= 1 and <= 100, "Cart:MaxItems must be 1–100.")
            .ValidateOnStart();
        services.AddOptions<OrderOptions>()
            .Bind(configuration.GetSection(OrderOptions.SectionName))
            .Validate(options => options.PaymentTimeoutMinutes is >= 1 and <= 1440, "Order:PaymentTimeoutMinutes must be 1–1440.")
            .ValidateOnStart();
        // Payment URLs are checked by the gateway on each call, so the API starts without them (like Cloudinary).
        services.AddOptions<PaymentOptions>()
            .Bind(configuration.GetSection(PaymentOptions.SectionName))
            .Validate(options => options.MaxAttemptsPerOrder is >= 1 and <= 20, "Payment:MaxAttemptsPerOrder must be 1–20.")
            .ValidateOnStart();
        services.AddOptions<PurchasesOptions>()
            .Bind(configuration.GetSection(PurchasesOptions.SectionName))
            .Validate(options => options.MaxListItems is >= 1 and <= 1000, "Purchases:MaxListItems must be 1–1000.")
            .ValidateOnStart();
        services.AddOptions<CareOptions>()
            .Bind(configuration.GetSection(CareOptions.SectionName))
            .Validate(CareOptions.IsValid, "Care:SkinProfileEditWindowDays must be 0–365.")
            .ValidateOnStart();
        services.AddOptions<OrderExpiryOptions>()
            .Bind(configuration.GetSection(OrderExpiryOptions.SectionName))
            .Validate(options => options.IntervalSeconds is >= 5 and <= 3600 && options.GraceMinutes is >= 0 and <= 120 &&
                                 options.BatchSize is >= 1 and <= 1000,
                "OrderExpiry:IntervalSeconds must be 5–3600, GraceMinutes 0–120, BatchSize 1–1000.")
            .ValidateOnStart();
        services.AddHostedService<OrderExpiryJob>();
        services.AddOptions<SeedOptions>().Bind(configuration.GetSection(SeedOptions.SectionName));
        services.AddScoped<DevelopmentSeeder>();
        services.AddScoped<DemoDataSeeder>();
        services.AddSingleton<IPasswordHasher, PasswordHasher>();
        services.AddSingleton<ITokenService, JwtTokenService>();

        services.AddHealthChecks().AddDbContextCheck<AppDbContext>("database", tags: [ReadinessTag]);
        return services;
    }

    internal static void ConfigureDbContext(DbContextOptionsBuilder options, string connectionString) =>
        options.UseNpgsql(connectionString).UseSnakeCaseNamingConvention();
}
