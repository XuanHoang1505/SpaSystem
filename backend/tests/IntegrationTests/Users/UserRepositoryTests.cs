using FluentAssertions;
using NhuNguyetSpa.Application.DTOs.Users;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;
using NhuNguyetSpa.Infrastructure.Persistence;
using NhuNguyetSpa.Infrastructure.Repositories;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.Users;

/// <summary>Account list and detail queries of UC-SPA-05 (docs/specs/auth.md) and the phone unique index translation.</summary>
[Collection(PostgresCollection.Name)]
public sealed class UserRepositoryTests
{
    private static readonly DateTime BaseTime = new(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc);
    private readonly PostgresFixture _postgres;

    public UserRepositoryTests(PostgresFixture postgres) => _postgres = postgres;

    [Fact]
    public async Task SearchIsAccentInsensitiveOnName()
    {
        var tag = Tag();
        var id = await SeedAsync($"Nguyễn Văn Đức {tag}");

        (await Search($"nguyen van duc {tag}")).Items.Select(item => item.Id).Should().Equal(id);
    }

    [Fact]
    public async Task SearchMatchesEmailIgnoringCaseAndPartOfPhone()
    {
        var tag = Tag();
        var phone = NewPhone();
        var id = await SeedAsync($"Khách {tag}", email: $"{tag}@spa.test", phone: phone);

        (await Search(tag.ToUpperInvariant() + "@SPA")).Items.Select(item => item.Id).Should().Equal(id);
        (await Search(phone[2..8])).Items.Select(item => item.Id).Should().Contain(id);
    }

    [Fact]
    public async Task SearchTreatsWildcardsLiterally()
    {
        var tag = Tag();
        await SeedAsync($"Khách {tag}");

        (await Search($"%{tag}")).TotalCount.Should().Be(0);
        (await Search($"_{tag}")).TotalCount.Should().Be(0);
    }

    [Fact]
    public async Task FiltersByRoleAndStatusNewestFirst()
    {
        var tag = Tag();
        var oldCustomer = await SeedAsync($"A {tag}", createdAtUtc: BaseTime);
        var newCustomer = await SeedAsync($"B {tag}", createdAtUtc: BaseTime.AddDays(1));
        var lockedCustomer = await SeedAsync($"C {tag}", status: UserStatus.Locked, createdAtUtc: BaseTime.AddDays(2));
        var staff = await SeedAsync($"D {tag}", role: UserRole.Staff, createdAtUtc: BaseTime.AddDays(3));

        (await Search(tag)).Items.Select(item => item.Id).Should().Equal(staff, lockedCustomer, newCustomer, oldCustomer);
        (await Search(tag, role: UserRole.Customer)).Items.Select(item => item.Id).Should().Equal(lockedCustomer, newCustomer, oldCustomer);
        (await Search(tag, status: UserStatus.Locked)).Items.Select(item => item.Id).Should().Equal(lockedCustomer);
        (await Search(tag, role: UserRole.Customer, status: UserStatus.Active)).Items.Select(item => item.Id).Should().Equal(newCustomer, oldCustomer);
    }

    [Fact]
    public async Task PagesKeepTotalCount()
    {
        var tag = Tag();
        await SeedAsync($"A {tag}", createdAtUtc: BaseTime);
        var second = await SeedAsync($"B {tag}", createdAtUtc: BaseTime.AddDays(1));
        await SeedAsync($"C {tag}", createdAtUtc: BaseTime.AddDays(2));

        var page = await Search(tag, pageNumber: 2, pageSize: 1);

        page.TotalCount.Should().Be(3);
        page.Items.Select(item => item.Id).Should().Equal(second);
    }

    [Fact]
    public async Task DetailIncludesStaffDatesOnlyForStaff()
    {
        var tag = Tag();
        var customer = await SeedAsync($"Khách {tag}");
        var staff = await SeedAsync($"Nhân viên {tag}", role: UserRole.Staff, resignation: new DateOnly(2026, 6, 30));

        await using var context = _postgres.CreateContext();
        var repository = new UserRepository(context);
        var staffDetail = await repository.GetDetailAsync(staff, CancellationToken.None);
        staffDetail!.Staff.Should().Be(new UserStaffInfoDto(new DateOnly(2026, 1, 1), new DateOnly(2026, 6, 30)));
        (await repository.GetDetailAsync(customer, CancellationToken.None))!.Staff.Should().BeNull();
        (await repository.GetDetailAsync(Guid.NewGuid(), CancellationToken.None)).Should().BeNull();
    }

    [Fact]
    public async Task DuplicatePhoneOnSaveIsPhoneExists()
    {
        var phone = NewPhone();
        await SeedAsync($"Khách {Tag()}", phone: phone);

        await using var context = _postgres.CreateContext();
        context.Users.Add(NewUser($"Khách {Tag()}", UserRole.Customer, UserStatus.Active, null, phone, BaseTime));

        (await FluentActions.Awaiting(() => new UnitOfWork(context).SaveChangesAsync()).Should().ThrowAsync<ConflictException>())
            .Which.Code.Should().Be("phone_exists");
    }

    private async Task<PagedResultView> Search(string search, UserRole? role = null, UserStatus? status = null, int pageNumber = 1, int pageSize = 100)
    {
        await using var context = _postgres.CreateContext();
        var result = await new UserRepository(context).SearchAsync(new UserSearchCriteria(search, role, status, pageNumber, pageSize), CancellationToken.None);
        return new PagedResultView(result.Items, result.TotalCount);
    }

    private static string Tag() => "t" + Guid.NewGuid().ToString("N")[..10];

    private static string NewPhone() => "09" + Random.Shared.NextInt64(10_000_000, 99_999_999);

    private static User NewUser(string name, UserRole role, UserStatus status, string? email, string? phone, DateTime createdAtUtc) => new()
    {
        FullName = name,
        Email = email ?? $"user-{Guid.NewGuid():N}@spa.test",
        PhoneNumber = phone ?? NewPhone(),
        PasswordHash = "x",
        Role = role,
        Status = status,
        CreatedAtUtc = createdAtUtc,
    };

    private async Task<Guid> SeedAsync(
        string name, UserRole role = UserRole.Customer, UserStatus status = UserStatus.Active, string? email = null, string? phone = null,
        DateTime? createdAtUtc = null, DateOnly? resignation = null)
    {
        await using var context = _postgres.CreateContext();
        var user = NewUser(name, role, status, email, phone, createdAtUtc ?? BaseTime);
        if (role == UserRole.Staff)
        {
            var staff = new StaffMember { Id = user.Id, User = user, HireDate = new DateOnly(2026, 1, 1) };
            if (resignation is { } date)
                staff.Resign(date);
            context.StaffMembers.Add(staff);
        }
        else
        {
            context.Users.Add(user);
        }
        await context.SaveChangesAsync();
        return user.Id;
    }

    private sealed record PagedResultView(IReadOnlyList<UserListItemDto> Items, int TotalCount);
}
