using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.Interfaces.Authentication;
using NhuNguyetSpa.Infrastructure.Authentication;
using NhuNguyetSpa.Application.Interfaces.Notifications;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Infrastructure.Common;
using NhuNguyetSpa.Infrastructure.Notifications;
using NhuNguyetSpa.Infrastructure.Persistence;
using NhuNguyetSpa.Infrastructure.Persistence.Interceptors;
using NhuNguyetSpa.Infrastructure.Persistence.Seeds;
using NhuNguyetSpa.Infrastructure.Repositories;

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

        // Validated when first resolved (no ValidateOnStart): a missing JWT_KEY must not stop health checks or Swagger.
        services.AddOptions<JwtOptions>()
            .Bind(configuration.GetSection(JwtOptions.SectionName))
            .Validate(options => options.SecretKey.Length >= JwtOptions.MinimumSecretKeyLength,
                $"Jwt:SecretKey (JWT_KEY in .env) must be at least {JwtOptions.MinimumSecretKeyLength} characters.");
        services.AddOptions<AccountOptions>().Bind(configuration.GetSection(AccountOptions.SectionName));
        // Mail credentials are checked by SmtpEmailSender when sending (not at startup), like JWT_KEY.
        services.AddOptions<MailSettings>().Bind(configuration.GetSection(MailSettings.SectionName));
        services.AddSingleton<IEmailSender, SmtpEmailSender>();
        services.AddOptions<SeedOptions>().Bind(configuration.GetSection(SeedOptions.SectionName));
        services.AddScoped<DevelopmentSeeder>();
        services.AddSingleton<IPasswordHasher, PasswordHasher>();
        services.AddSingleton<ITokenService, JwtTokenService>();

        services.AddHealthChecks().AddDbContextCheck<AppDbContext>("database", tags: [ReadinessTag]);
        return services;
    }

    internal static void ConfigureDbContext(DbContextOptionsBuilder options, string connectionString) =>
        options.UseNpgsql(connectionString).UseSnakeCaseNamingConvention();
}
