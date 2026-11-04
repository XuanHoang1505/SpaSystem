using FluentAssertions;
using NhuNguyetSpa.API.Configuration;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests;

public sealed class EnvLoaderTests
{
    [Theory]
    [InlineData("CONNECTION_STRING", "ConnectionStrings:Default")]
    [InlineData("SWAGGER_ENABLED", "Swagger:Enabled")]
    [InlineData("JWT_KEY", "Jwt:SecretKey")]
    [InlineData("JWT_ACCESS_TOKEN_EXPIRATION", "Jwt:AccessTokenExpirationMinutes")]
    [InlineData("JWT_SOMETHING_NEW", "Jwt:SomethingNew")]
    [InlineData("MAIL_SETTINGS_DISPLAY_NAME", "MailSettings:DisplayName")]
    [InlineData("mail_settings_host", "MailSettings:Host")]
    [InlineData("SEED_OWNER_EMAIL", "Seed:OwnerEmail")]
    [InlineData("SEED_OWNER_FULL_NAME", "Seed:OwnerFullName")]
    [InlineData("CLOUDINARY_CLOUD_NAME", "Cloudinary:CloudName")]
    [InlineData("CLOUDINARY_API_KEY", "Cloudinary:ApiKey")]
    [InlineData("CLOUDINARY_API_SECRET", "Cloudinary:ApiSecret")]
    [InlineData("VNPAY_TMN_CODE", "Vnpay:TmnCode")]
    [InlineData("VNPAY_HASH_SECRET", "Vnpay:HashSecret")]
    [InlineData("PAYMENT_PUBLIC_API_BASE_URL", "Payment:PublicApiBaseUrl")]
    [InlineData("PAYMENT_WEB_RETURN_URL", "Payment:ClientReturnUrls:Web")]
    [InlineData("PAYMENT_MOBILE_RETURN_URL", "Payment:ClientReturnUrls:Mobile")]
    [InlineData("GEMINI_API_KEY", "Ai:ApiKey")]
    [InlineData("PATH", null)]
    [InlineData("JWT_", null)]
    public void MapsUpperSnakeCaseVariablesToConfigurationKeys(string envKey, string? configKey) =>
        EnvLoader.ResolveConfigKey(envKey).Should().Be(configKey);

    [Fact]
    public void ReadsEnvFileAndStripsQuotesWithoutTouchingProcessEnvironment()
    {
        var folder = Directory.CreateTempSubdirectory("envloader-");
        try
        {
            File.WriteAllText(Path.Combine(folder.FullName, EnvLoader.FileName),
                "# comment\nCONNECTION_STRING=Host=filehost;Database=spa\nMAIL_SETTINGS_PASSWORD=\"abcd efgh\"\nUNRELATED_SETTING=ignored\n");

            var values = EnvLoader.Read(folder.FullName);

            values["ConnectionStrings:Default"].Should().Be("Host=filehost;Database=spa");
            values["MailSettings:Password"].Should().Be("abcd efgh");
            values.Keys.Should().NotContain(key => key.Contains("Unrelated", StringComparison.OrdinalIgnoreCase));
            Environment.GetEnvironmentVariable("MAIL_SETTINGS_PASSWORD").Should().BeNull("parsing .env must not leak into the process environment");
        }
        finally
        {
            folder.Delete(recursive: true);
        }
    }

    [Fact]
    public void RealEnvironmentVariableOverridesEnvFile()
    {
        const string variable = "JWT_ISSUER";
        var folder = Directory.CreateTempSubdirectory("envloader-");
        try
        {
            File.WriteAllText(Path.Combine(folder.FullName, EnvLoader.FileName), $"{variable}=from-file\n");
            Environment.SetEnvironmentVariable(variable, "from-environment");

            EnvLoader.Read(folder.FullName)["Jwt:Issuer"].Should().Be("from-environment");
        }
        finally
        {
            Environment.SetEnvironmentVariable(variable, null);
            folder.Delete(recursive: true);
        }
    }
}
