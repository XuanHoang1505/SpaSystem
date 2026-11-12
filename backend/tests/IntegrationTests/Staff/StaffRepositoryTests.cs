using FluentAssertions;
using NhuNguyetSpa.Application.DTOs.Staff;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Infrastructure.Repositories;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.Staff;

/// <summary>Staff list queries (docs/specs/staff.md, UC-SPA-22 A4): accent-insensitive search, literal wildcards, public view.</summary>
[Collection(PostgresCollection.Name)]
public sealed class StaffRepositoryTests
{
    private static readonly DateOnly Today = new(2026, 10, 27);
    private readonly PostgresFixture _postgres;

    public StaffRepositoryTests(PostgresFixture postgres) => _postgres = postgres;

    [Fact]
    public async Task SearchIsAccentInsensitive()
    {
        var tag = Tag();
        var id = await SeedAsync($"Lê Thị Thư {tag}");

        var result = await Search($"le thi thu {tag}");

        result.Items.Select(item => item.Id).Should().Equal(id);
    }

    [Fact]
    public async Task SearchMatchesEmailAndPhone()
    {
        var tag = Tag();
        var id = await SeedAsync($"Nhân viên {tag}", email: $"{tag}@spa.test");

        (await Search(tag.ToUpperInvariant() + "@SPA")).Items.Select(item => item.Id).Should().Equal(id);
    }

    [Fact]
    public async Task SearchEscapesWildcards()
    {
        await SeedAsync($"Nhân viên {Tag()}");

        (await Search("%")).TotalCount.Should().Be(0);
        (await Search("_")).TotalCount.Should().Be(0);
    }

    [Fact]
    public async Task PublicSearchExcludesResignedAndLocked()
    {
        var tag = Tag();
        var working = await SeedAsync($"Đang làm {tag}");
        var leavingTomorrow = await SeedAsync($"Nghỉ mai {tag}", resignation: Today.AddDays(1));
        await SeedAsync($"Đã nghỉ {tag}", resignation: Today);
        await SeedAsync($"Bị khóa {tag}", status: UserStatus.Locked);

        await using var context = _postgres.CreateContext();
        var result = await new StaffMemberRepository(context).SearchPublicAsync(Criteria(tag, resigned: true), CancellationToken.None);

        result.Items.Select(item => item.Id).Should().BeEquivalentTo([working, leavingTomorrow]);
    }

    [Fact]
    public async Task OwnerSearchFiltersResignedStatus()
    {
        var tag = Tag();
        var working = await SeedAsync($"A {tag}");
        var resigned = await SeedAsync($"B {tag}", resignation: Today);

        await using var context = _postgres.CreateContext();
        var repository = new StaffMemberRepository(context);
        (await repository.SearchAsync(Criteria(tag, resigned: true), CancellationToken.None)).Items.Select(item => item.Id).Should().Equal(resigned);
        (await repository.SearchAsync(Criteria(tag, resigned: false), CancellationToken.None)).Items.Select(item => item.Id).Should().Equal(working);
        (await repository.SearchAsync(Criteria(tag, resigned: null), CancellationToken.None)).Items.Should().HaveCount(2);
    }

    private async Task<PagedResultView> Search(string search)
    {
        await using var context = _postgres.CreateContext();
        var result = await new StaffMemberRepository(context).SearchAsync(Criteria(search, resigned: null), CancellationToken.None);
        return new PagedResultView(result.Items, result.TotalCount);
    }

    private static StaffSearchCriteria Criteria(string search, bool? resigned) => new(search, resigned, null, Today, 1, 100);

    private static string Tag() => "t" + Guid.NewGuid().ToString("N")[..10];

    private async Task<Guid> SeedAsync(string name, DateOnly? resignation = null, UserStatus status = UserStatus.Active, string? email = null)
    {
        await using var context = _postgres.CreateContext();
        var user = new User
        {
            FullName = name,
            Email = email ?? $"staff-{Guid.NewGuid():N}@spa.test",
            PhoneNumber = "09" + Random.Shared.NextInt64(10_000_000, 99_999_999),
            PasswordHash = "x",
            Role = UserRole.Staff,
            Status = status,
        };
        var staff = new StaffMember { Id = user.Id, User = user, HireDate = new DateOnly(2026, 1, 1) };
        if (resignation is { } date)
            staff.Resign(date);
        context.StaffMembers.Add(staff);
        await context.SaveChangesAsync();
        return user.Id;
    }

    private sealed record PagedResultView(IReadOnlyList<StaffListItemDto> Items, int TotalCount);
}
