using System.Net;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Infrastructure.Authentication;
using NhuNguyetSpa.Infrastructure.Persistence.Seeds;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.Auth;

[Collection(PostgresCollection.Name)]
public sealed class DevelopmentSeederTests
{
    private readonly PostgresFixture _postgres;

    public DevelopmentSeederTests(PostgresFixture postgres) => _postgres = postgres;

    private const string Password = "Owner@2026";

    [Fact]
    public async Task SeedCreatesOwnerWhoCanLogInAndIsIdempotent()
    {
        var options = new SeedOptions
        {
            OwnerEmail = $"owner-{Guid.NewGuid():N}@spa.test",
            OwnerPassword = Password,
            OwnerPhone = "08" + Random.Shared.NextInt64(10_000_000, 99_999_999),
        };

        (await Seed(options)).Should().Be(SeedOutcome.Created);
        (await Seed(options)).Should().Be(SeedOutcome.AlreadyExists);

        await using (var context = _postgres.CreateContext())
        {
            var owner = await context.Users.SingleAsync(user => user.Email == options.OwnerEmail);
            owner.Role.Should().Be(UserRole.Owner);
            owner.Status.Should().Be(UserStatus.Active);
            owner.FullName.Should().Be("Chủ spa");
            (await context.OwnerProfiles.AnyAsync(profile => profile.Id == owner.Id)).Should().BeTrue();
        }

        await using var factory = new AuthApiFactory(_postgres.ConnectionString);
        using var client = factory.CreateClient();
        var (response, body) = await AuthApiFactory.PostAsync(client, "/api/v1/auth/login", new { login = options.OwnerEmail, password = Password });
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        body.RootElement.GetProperty("data").GetProperty("user").GetProperty("role").GetString().Should().Be("owner");
    }

    [Theory]
    [InlineData(null, "0811111111", Password, "SEED_OWNER_EMAIL")]
    [InlineData("missing-phone@spa.test", null, Password, "SEED_OWNER_PHONE")]
    [InlineData("weak@spa.test", "0822222222", "Short7!", "SEED_OWNER_PASSWORD")]
    [InlineData("no-password@spa.test", "0833333333", null, "SEED_OWNER_PASSWORD")]
    public async Task SeedRejectsMissingOrWeakSettings(string? email, string? phone, string? password, string variable)
    {
        var options = new SeedOptions { OwnerEmail = email, OwnerPhone = phone, OwnerPassword = password };

        var act = () => Seed(options);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage($"*{variable}*");
        await using var context = _postgres.CreateContext();
        if (email is not null)
            (await context.Users.AnyAsync(user => user.Email == email)).Should().BeFalse();
    }

    private async Task<SeedOutcome> Seed(SeedOptions options)
    {
        await using var context = _postgres.CreateContext();
        var seeder = new DevelopmentSeeder(context, new PasswordHasher(), Options.Create(options), NullLogger<DevelopmentSeeder>.Instance);
        return await seeder.SeedOwnerAsync(CancellationToken.None);
    }
}
