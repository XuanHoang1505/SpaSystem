using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.Interfaces.Authentication;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Infrastructure;
using NhuNguyetSpa.Infrastructure.Authentication;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests;

public sealed class AuthenticationServicesTests
{
    private const string SecretKey = "test-secret-key-at-least-32-characters-long!!";
    private static readonly DateTime Now = new(2026, 10, 25, 0, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void PasswordHasherVerifiesOnlyTheOriginalPassword()
    {
        IPasswordHasher hasher = new PasswordHasher();
        var hash = hasher.Hash("Spa@12345");

        hash.Should().NotContain("Spa@12345");
        hasher.Verify(hash, "Spa@12345").Should().BeTrue();
        hasher.Verify(hash, "spa@12345").Should().BeFalse();
        hasher.Verify(hasher.DummyHash, "x").Should().BeFalse();
    }

    [Fact]
    public void AccessTokenCarriesSubjectRoleAndFifteenMinuteExpiry()
    {
        var user = new User { FullName = "Chủ spa", Email = "owner@spa.vn", PhoneNumber = "0900000000", Role = UserRole.Owner };

        var token = CreateTokenService().CreateAccessToken(user, Now);

        token.ExpiresAtUtc.Should().Be(Now.AddMinutes(15));
        var jwt = new JsonWebTokenHandler().ReadJsonWebToken(token.Token);
        jwt.Subject.Should().Be(user.Id.ToString());
        jwt.GetClaim("role").Value.Should().Be("owner");
        jwt.GetClaim("name").Value.Should().Be("Chủ spa");
        jwt.Id.Should().NotBeNullOrEmpty();
        jwt.Issuer.Should().Be("NhuNguyetSpa.API");
        jwt.Audiences.Should().ContainSingle().Which.Should().Be("NhuNguyetSpa.Clients");
        jwt.ValidTo.Should().Be(Now.AddMinutes(15));
    }

    [Fact]
    public void RefreshTokenIsRandomAndOnlyHashIsStored()
    {
        var service = CreateTokenService();

        var first = service.CreateRefreshToken(Now);
        var second = service.CreateRefreshToken(Now);

        first.Token.Should().NotBe(second.Token);
        first.TokenHash.Should().Be(service.HashRefreshToken(first.Token));
        first.TokenHash.Should().MatchRegex("^[0-9a-f]{64}$");
        first.TokenHash.Should().NotContain(first.Token);
        first.ExpiresAtUtc.Should().Be(Now.AddDays(7));
    }

    [Fact]
    public void JwtOptionsRejectShortSecretKey()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Jwt:SecretKey"] = "short" })
            .Build();
        using var provider = new ServiceCollection().AddLogging().AddInfrastructure(configuration).BuildServiceProvider();

        FluentActions.Invoking(() => provider.GetRequiredService<IOptions<JwtOptions>>().Value)
            .Should().Throw<OptionsValidationException>().WithMessage("*JWT_KEY*");
    }

    [Fact]
    public async Task ResetTokenRoundTripsWithSubjectAndPasswordStamp()
    {
        var service = CreateTokenService();
        var user = new User { FullName = "An", Email = "an@gmail.com", PasswordHash = "hash-v1", Role = UserRole.Customer };

        var token = service.CreatePasswordResetToken(user, Now, Now.AddMinutes(10));
        var claims = await service.ReadPasswordResetTokenAsync(token.Token, Now.AddMinutes(9));

        token.ExpiresAtUtc.Should().Be(Now.AddMinutes(10));
        claims.Should().NotBeNull();
        claims!.UserId.Should().Be(user.Id);
        claims.PasswordStamp.Should().Be(service.ComputePasswordStamp("hash-v1"));
        service.ComputePasswordStamp("hash-v2").Should().NotBe(claims.PasswordStamp);
        claims.PasswordStamp.Should().NotContain("hash-v1");
    }

    [Fact]
    public async Task ExpiredResetTokenReadsNull()
    {
        var service = CreateTokenService();
        var token = service.CreatePasswordResetToken(new User { PasswordHash = "h" }, Now, Now.AddMinutes(10));

        (await service.ReadPasswordResetTokenAsync(token.Token, Now.AddMinutes(10).AddSeconds(1))).Should().BeNull();
    }

    [Fact]
    public async Task AccessTokenIsNotAResetToken()
    {
        var service = CreateTokenService();
        var access = service.CreateAccessToken(new User { FullName = "An", Role = UserRole.Customer }, Now);

        (await service.ReadPasswordResetTokenAsync(access.Token, Now)).Should().BeNull();
        (await service.ReadPasswordResetTokenAsync("khong-phai-token", Now)).Should().BeNull();
    }

    [Fact]
    public async Task ResetTokenSignedWithAnotherKeyIsRejected()
    {
        var other = new JwtTokenService(Options.Create(new JwtOptions { SecretKey = new string('x', 40) }));
        var token = other.CreatePasswordResetToken(new User { PasswordHash = "h" }, Now, Now.AddMinutes(10));

        (await CreateTokenService().ReadPasswordResetTokenAsync(token.Token, Now)).Should().BeNull();
    }

    private static JwtTokenService CreateTokenService() =>
        new(Options.Create(new JwtOptions { SecretKey = SecretKey }));
}
