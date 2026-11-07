using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Infrastructure.Repositories;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.Auth;

/// <summary>BR-AUTH-07/08 against real PostgreSQL: atomic consume and failure counting.</summary>
[Collection(PostgresCollection.Name)]
public sealed class OtpCodeRepositoryTests
{
    private readonly PostgresFixture _postgres;

    public OtpCodeRepositoryTests(PostgresFixture postgres) => _postgres = postgres;

    private static readonly DateTime Now = DateTime.UtcNow;

    [Fact]
    public async Task TryConsumeSucceedsOnceUnderConcurrency()
    {
        var otp = await SeedAsync(Unique());

        var results = await Task.WhenAll(Enumerable.Range(0, 2).Select(async _ =>
        {
            await using var context = _postgres.CreateContext();
            return await new OtpCodeRepository(context).TryConsumeAsync(otp.Id, Now, 5, CancellationToken.None);
        }));

        results.Count(consumed => consumed).Should().Be(1);
        (await ReloadAsync(otp.Id)).UsedAtUtc.Should().NotBeNull();
    }

    [Fact]
    public async Task TryConsumeRefusesExpiredOrLockedCodes()
    {
        var expired = await SeedAsync(Unique(), expiresAtUtc: Now.AddSeconds(-1));
        var locked = await SeedAsync(Unique(), failedAttempts: 5);
        await using var context = _postgres.CreateContext();
        var repository = new OtpCodeRepository(context);

        (await repository.TryConsumeAsync(expired.Id, Now, 5, CancellationToken.None)).Should().BeFalse();
        (await repository.TryConsumeAsync(locked.Id, Now, 5, CancellationToken.None)).Should().BeFalse();
    }

    [Fact]
    public async Task TryRecordFailureCountsUpToMaxThenStops()
    {
        var otp = await SeedAsync(Unique());
        await using var context = _postgres.CreateContext();
        var repository = new OtpCodeRepository(context);

        var counts = new List<int?>();
        for (var attempt = 0; attempt < 6; attempt++)
            counts.Add(await repository.TryRecordFailureAsync(otp.Id, 5, CancellationToken.None));

        counts.Should().Equal(1, 2, 3, 4, 5, null);
        (await ReloadAsync(otp.Id)).FailedAttempts.Should().Be(5);
    }

    [Fact]
    public async Task ExpireActiveOnlyTouchesUnusedCodesOfThatPurpose()
    {
        var email = Unique();
        var active = await SeedAsync(email);
        var used = await SeedAsync(email, usedAtUtc: Now.AddMinutes(-1));
        var otherPurpose = await SeedAsync(email, purpose: OtpPurpose.PasswordReset);
        await using var context = _postgres.CreateContext();

        await new OtpCodeRepository(context).ExpireActiveAsync(email.ToUpperInvariant(), OtpPurpose.Registration, Now, CancellationToken.None);

        (await ReloadAsync(active.Id)).ExpiresAtUtc.Should().BeCloseTo(Now, TimeSpan.FromMilliseconds(1));
        (await ReloadAsync(used.Id)).ExpiresAtUtc.Should().BeAfter(Now);
        (await ReloadAsync(otherPurpose.Id)).ExpiresAtUtc.Should().BeAfter(Now);
    }

    [Fact]
    public async Task FindLatestReturnsNewestEvenIfUsedAndLastSentIgnoresOtherPurpose()
    {
        var email = Unique();
        await SeedAsync(email, createdAtUtc: Now.AddMinutes(-3));
        await SeedAsync(email, createdAtUtc: Now.AddMinutes(-1));
        var newest = await SeedAsync(email, createdAtUtc: Now, usedAtUtc: Now);
        await SeedAsync(email, purpose: OtpPurpose.PasswordReset, createdAtUtc: Now.AddSeconds(30));
        await using var context = _postgres.CreateContext();
        var repository = new OtpCodeRepository(context);

        (await repository.FindLatestAsync(email, OtpPurpose.Registration, CancellationToken.None))!.Id.Should().Be(newest.Id);
        (await repository.GetLastSentAtAsync(email, OtpPurpose.Registration, CancellationToken.None))
            .Should().BeCloseTo(Now, TimeSpan.FromMilliseconds(1));
        (await repository.GetLastSentAtAsync(Unique(), OtpPurpose.Registration, CancellationToken.None)).Should().BeNull();
    }

    [Fact]
    public async Task DeleteRemovesTheRow()
    {
        var otp = await SeedAsync(Unique());
        await using var context = _postgres.CreateContext();

        await new OtpCodeRepository(context).DeleteAsync(otp.Id, CancellationToken.None);

        await using var check = _postgres.CreateContext();
        (await check.OtpCodes.AnyAsync(row => row.Id == otp.Id)).Should().BeFalse();
    }

    private static string Unique() => $"otp-{Guid.NewGuid():N}@spa.test";

    private async Task<OtpCode> SeedAsync(string email, OtpPurpose purpose = OtpPurpose.Registration, int failedAttempts = 0,
        DateTime? expiresAtUtc = null, DateTime? usedAtUtc = null, DateTime? createdAtUtc = null)
    {
        var otp = new OtpCode
        {
            Email = email, Purpose = purpose, CodeHash = "hash", FailedAttempts = failedAttempts,
            ExpiresAtUtc = expiresAtUtc ?? Now.AddMinutes(5), UsedAtUtc = usedAtUtc, CreatedAtUtc = createdAtUtc ?? Now.AddMinutes(-2),
        };
        await using var context = _postgres.CreateContext();
        context.OtpCodes.Add(otp);
        await context.SaveChangesAsync();
        return otp;
    }

    private async Task<OtpCode> ReloadAsync(Guid id)
    {
        await using var context = _postgres.CreateContext();
        return await context.OtpCodes.AsNoTracking().SingleAsync(row => row.Id == id);
    }
}
