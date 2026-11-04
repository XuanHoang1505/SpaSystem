using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Catalog;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using NhuNguyetSpa.IntegrationTests.Staff;

namespace NhuNguyetSpa.IntegrationTests.Bookings;

/// <summary>Seeding helpers for availability and appointment endpoint tests; appointments are inserted directly (no booking API yet).</summary>
public sealed class BookingApi
{
    private readonly AuthApiFactory _factory;
    private readonly PostgresFixture _postgres;

    public BookingApi(AuthApiFactory factory, PostgresFixture postgres)
    {
        _factory = factory;
        _postgres = postgres;
        Api = new CatalogApi(factory, postgres);
        Staff = new StaffApi(factory, postgres);
    }

    public CatalogApi Api { get; }
    public StaffApi Staff { get; }

    public static string D(DateOnly date) => date.ToString("yyyy-MM-dd");

    public static TimeOnly At(int hour, int minute = 0) => new(hour, minute);

    /// <summary>A staff member with the skill for <paramref name="serviceId"/> and one active shift per day given.</summary>
    public async Task<StaffMember> SeedQualifiedStaffAsync(string name, Guid serviceId, params (DateOnly Date, int Start, int End)[] shifts)
    {
        var staff = await Staff.SeedStaffAsync(name);
        await AddSkillAsync(staff.Id, serviceId);
        foreach (var (date, start, end) in shifts)
            await Staff.SeedShiftAsync(staff.Id, date, start, end);
        return staff;
    }

    public async Task AddSkillAsync(Guid staffId, Guid serviceId)
    {
        await using var context = _postgres.CreateContext();
        context.StaffSkills.Add(new StaffSkill { StaffMemberId = staffId, SpaServiceId = serviceId });
        await context.SaveChangesAsync();
    }

    /// <summary>A staff account that can sign in; returns its bearer token and staff id.</summary>
    public async Task<(string Token, Guid StaffId)> LoginStaffAsync()
    {
        var user = await _factory.CreateUserAsync(CatalogApi.Password, role: UserRole.Staff);
        await using (var context = _postgres.CreateContext())
        {
            context.StaffMembers.Add(new StaffMember { Id = user.Id, HireDate = new DateOnly(2026, 1, 1) });
            await context.SaveChangesAsync();
        }
        var (_, body) = await AuthApiFactory.PostAsync(Api.Client, "/api/v1/auth/login", new { login = user.Email, password = CatalogApi.Password });
        return (body.RootElement.GetProperty("data").GetProperty("accessToken").GetString()!, user.Id);
    }

    /// <summary>A customer account that can sign in; returns its bearer token and customer id.</summary>
    public async Task<(string Token, Guid CustomerId)> LoginCustomerAsync()
    {
        var user = await _factory.CreateUserAsync(CatalogApi.Password, role: UserRole.Customer);
        await using (var context = _postgres.CreateContext())
        {
            context.Customers.Add(new Customer { Id = user.Id });
            await context.SaveChangesAsync();
        }
        var (_, body) = await AuthApiFactory.PostAsync(Api.Client, "/api/v1/auth/login", new { login = user.Email, password = CatalogApi.Password });
        return (body.RootElement.GetProperty("data").GetProperty("accessToken").GetString()!, user.Id);
    }

    public async Task<Appointment> LoadAsync(Guid appointmentId)
    {
        await using var context = _postgres.CreateContext();
        return await context.Appointments.FindAsync(appointmentId) ?? throw new InvalidOperationException("missing appointment");
    }
}
