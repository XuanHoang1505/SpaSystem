using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Interfaces.Authentication;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Infrastructure.Persistence.Seeds;

/// <summary>
/// Demo data for trying UC-SPA-15/17/18 by hand (<c>npm run db:seed:demo</c>, Development only): services, a package, staff with
/// skills and shifts for the next 14 days, two customers with bought services/packages, promotions. Ids are fixed (<see cref="DemoIds"/>)
/// so the Postman collection can refer to them. Every run deletes the previous demo rows (and whatever the demo accounts booked or
/// ordered since) and recreates them relative to today, so dates never go stale.
/// </summary>
public sealed class DemoDataSeeder
{
    private readonly AppDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IDateTimeProvider _clock;
    private readonly IOptions<SeedOptions> _options;
    private readonly ILogger<DemoDataSeeder> _logger;
    private readonly List<(Guid OrderId, DateTime CreatedAtUtc)> _backdated = [];

    public DemoDataSeeder(AppDbContext context, IPasswordHasher passwordHasher, IDateTimeProvider clock, IOptions<SeedOptions> options,
        ILogger<DemoDataSeeder> logger)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _clock = clock;
        _options = options;
        _logger = logger;
    }

    public async Task SeedAsync(CancellationToken cancellationToken)
    {
        var password = _options.Value.DemoPassword ?? _options.Value.OwnerPassword;
        if (string.IsNullOrWhiteSpace(password) || password.Trim().Length < SeedOptions.MinimumPasswordLength)
            throw new InvalidOperationException(
                $"SEED_DEMO_PASSWORD (or SEED_OWNER_PASSWORD) must be set in backend/src/API/.env, at least {SeedOptions.MinimumPasswordLength} characters.");

        await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
        await DeleteAsync(cancellationToken);
        await CreateAsync(_passwordHasher.Hash(password.Trim()), cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        _logger.LogInformation("Demo data created for {Today}", SpaTime.Today(_clock.UtcNow));
    }

    private async Task DeleteAsync(CancellationToken cancellationToken)
    {
        Guid[] customers = [DemoIds.CustomerLan, DemoIds.CustomerMai];
        Guid[] staff = [DemoIds.StaffAn, DemoIds.StaffBinh, DemoIds.StaffChi];
        Guid[] services = [DemoIds.ServiceBasic, DemoIds.ServiceMassage, DemoIds.ServiceAcne, DemoIds.ServiceMask];
        Guid[] users = [.. customers, .. staff];
        var orderIds = await _context.Orders.Where(order => customers.Contains(order.CustomerId)).Select(order => order.Id).ToListAsync(cancellationToken);

        await _context.SkinProfiles.Where(row => customers.Contains(row.CustomerId)).ExecuteDeleteAsync(cancellationToken);
        await _context.Appointments.Where(row => customers.Contains(row.CustomerId) || staff.Contains(row.StaffMemberId))
            .ExecuteDeleteAsync(cancellationToken);
        await _context.TreatmentSessions.Where(row => customers.Contains(row.TreatmentPlan.CustomerPackage.CustomerId)).ExecuteDeleteAsync(cancellationToken);
        await _context.TreatmentPlans.Where(row => customers.Contains(row.CustomerPackage.CustomerId)).ExecuteDeleteAsync(cancellationToken);
        await _context.CustomerPackages.Where(row => customers.Contains(row.CustomerId)).ExecuteDeleteAsync(cancellationToken);
        await _context.ServiceEntitlements.Where(row => customers.Contains(row.CustomerId)).ExecuteDeleteAsync(cancellationToken);
        await _context.PromotionRedemptions.Where(row => orderIds.Contains(row.OrderId)).ExecuteDeleteAsync(cancellationToken);
        await _context.Payments.Where(row => orderIds.Contains(row.OrderId)).ExecuteDeleteAsync(cancellationToken);
        await _context.OrderItems.Where(row => orderIds.Contains(row.OrderId)).ExecuteDeleteAsync(cancellationToken);
        await _context.Orders.Where(row => orderIds.Contains(row.Id)).ExecuteDeleteAsync(cancellationToken);
        await _context.CartItems.Where(row => customers.Contains(row.Cart.CustomerId)).ExecuteDeleteAsync(cancellationToken);
        await _context.Carts.Where(row => customers.Contains(row.CustomerId)).ExecuteDeleteAsync(cancellationToken);
        await _context.CustomerAllergies.Where(row => customers.Contains(row.CustomerId)).ExecuteDeleteAsync(cancellationToken);
        await _context.RefreshTokens.Where(row => users.Contains(row.UserId)).ExecuteDeleteAsync(cancellationToken);
        await _context.WorkSchedules.Where(row => staff.Contains(row.StaffMemberId)).ExecuteDeleteAsync(cancellationToken);
        await _context.StaffSkills.Where(row => staff.Contains(row.StaffMemberId)).ExecuteDeleteAsync(cancellationToken);
        await _context.StaffMembers.Where(row => staff.Contains(row.Id)).ExecuteDeleteAsync(cancellationToken);
        await _context.Customers.Where(row => customers.Contains(row.Id)).ExecuteDeleteAsync(cancellationToken);
        await _context.Users.Where(row => users.Contains(row.Id)).ExecuteDeleteAsync(cancellationToken);
        await _context.ServicePackageItems.Where(row => row.ServicePackageId == DemoIds.PackageAcne).ExecuteDeleteAsync(cancellationToken);
        await _context.ServicePackages.Where(row => row.Id == DemoIds.PackageAcne).ExecuteDeleteAsync(cancellationToken);
        await _context.Promotions.Where(row => row.Id == DemoIds.PromotionFree || row.Id == DemoIds.PromotionTwenty).ExecuteDeleteAsync(cancellationToken);
        try
        {
            await _context.SpaServices.Where(row => services.Contains(row.Id)).ExecuteDeleteAsync(cancellationToken);
        }
        catch (DbUpdateException exception)
        {
            throw new InvalidOperationException(
                "Demo services are still used by orders or carts of non-demo accounts; remove those rows or reset the database first.", exception);
        }
    }

    private async Task CreateAsync(string passwordHash, CancellationToken cancellationToken)
    {
        var now = _clock.UtcNow;
        var today = SpaTime.Today(now);

        // Catalog.
        var basic = Service(DemoIds.ServiceBasic, "Chăm sóc da cơ bản (demo)", 60, 300_000);
        var massage = Service(DemoIds.ServiceMassage, "Massage mặt thư giãn (demo)", 45, 250_000);
        var acne = Service(DemoIds.ServiceAcne, "Trị mụn chuyên sâu (demo)", 90, 450_000);
        var mask = Service(DemoIds.ServiceMask, "Đắp mặt nạ thảo dược (demo, ngừng bán)", 30, 150_000);
        _context.SpaServices.AddRange(basic, massage, acne, mask);
        var package = new ServicePackage
        {
            Id = DemoIds.PackageAcne,
            Name = "Gói trị mụn 5 buổi (demo)",
            Description = "2 buổi chăm sóc da + 3 buổi trị mụn, cách nhau ít nhất 7 ngày.",
            Price = 1_800_000,
            ValidityDays = 90,
        };
        package.ChangeStatus(CatalogStatus.OnSale);
        package.ReplaceItems([
            new ServicePackageItem { ServicePackageId = package.Id, SpaServiceId = basic.Id, SessionCount = 2, MinDaysBetweenSessions = 7, SortOrder = 1 },
            new ServicePackageItem { ServicePackageId = package.Id, SpaServiceId = acne.Id, SessionCount = 3, MinDaysBetweenSessions = 7, SortOrder = 2 },
        ]);
        _context.ServicePackages.Add(package);
        _context.Promotions.AddRange(
            Promotion(DemoIds.PromotionFree, "DEMO100", "Giảm 100% (thử đơn 0 đ)", 100, now),
            Promotion(DemoIds.PromotionTwenty, "DEMO20", "Giảm 20%", 20, now));

        // Staff: An and Chi work 08–12 and 13–17, Bình only mornings; An does everything, Bình basic + massage, Chi acne + basic.
        AddStaff(DemoIds.StaffAn, "Nguyễn Thị An (demo)", "an.demo@nhunguyetspa.local", "0901000001", passwordHash, today,
            [basic.Id, massage.Id, acne.Id, mask.Id], afternoon: true);
        AddStaff(DemoIds.StaffBinh, "Trần Thị Bình (demo)", "binh.demo@nhunguyetspa.local", "0901000002", passwordHash, today,
            [basic.Id, massage.Id], afternoon: false);
        AddStaff(DemoIds.StaffChi, "Lê Thị Chi (demo)", "chi.demo@nhunguyetspa.local", "0901000003", passwordHash, today,
            [acne.Id, basic.Id], afternoon: true);

        // Customers.
        AddCustomer(DemoIds.CustomerLan, "Phạm Thị Lan (demo)", "lan.demo@nhunguyetspa.local", "0902000001", passwordHash);
        AddCustomer(DemoIds.CustomerMai, "Võ Thị Mai (demo)", "mai.demo@nhunguyetspa.local", "0902000002", passwordHash);
        _context.CustomerAllergies.Add(new CustomerAllergy
        {
            CustomerId = DemoIds.CustomerLan, Allergen = "Cồn", Severity = AllergySeverity.Moderate, Note = "Đỏ da khi dùng toner có cồn",
        });

        // Lan's purchases.
        AddEntitlement(DemoIds.EntitlementLanAvailable, DemoIds.CustomerLan, basic, EntitlementStatus.Available, null, now.AddDays(-2));
        AddEntitlement(DemoIds.EntitlementLanDiscontinued, DemoIds.CustomerLan, mask, EntitlementStatus.Available, null, now.AddDays(-20));
        AddEntitlement(DemoIds.EntitlementLanExpired, DemoIds.CustomerLan, massage, EntitlementStatus.Available, now.AddDays(-1), now.AddDays(-40));
        AddEntitlement(DemoIds.EntitlementLanBooked, DemoIds.CustomerLan, massage, EntitlementStatus.Booked, null, now.AddDays(-5));
        _context.Appointments.Add(Appointment(DemoIds.AppointmentLanBooked, DemoIds.CustomerLan, DemoIds.StaffAn, today.AddDays(1), 14, 0, 45,
            AppointmentStatus.Confirmed, now, entitlementId: DemoIds.EntitlementLanBooked));

        // Lan's package: session 1 completed 3 days ago, session 2 is next (earliest = 3 days ago + 7 = today + 4).
        var sessions = AddPackage(DemoIds.CustomerPackageLan, DemoIds.TreatmentPlanLan, DemoIds.CustomerLan, package, [basic, acne],
            TreatmentPlanStatus.InProgress, now.AddDays(-10), 1);
        sessions[0].Status = TreatmentSessionStatus.Completed;
        sessions[0].CompletedAtUtc = now.AddDays(-3);
        sessions[0].Note = "Da hơi nhạy cảm, nên dùng sữa rửa mặt dịu nhẹ.";
        _context.Appointments.Add(Appointment(Guid.NewGuid(), DemoIds.CustomerLan, DemoIds.StaffAn, today.AddDays(-3), 9, 0, 60,
            AppointmentStatus.Completed, now, sessionId: sessions[0].Id));

        // Mai: one bought service (for "two customers, one slot") and a paused package.
        AddEntitlement(DemoIds.EntitlementMaiAvailable, DemoIds.CustomerMai, basic, EntitlementStatus.Available, null, now.AddDays(-1));
        AddPackage(DemoIds.CustomerPackageMai, DemoIds.TreatmentPlanMai, DemoIds.CustomerMai, package, [basic, acne], TreatmentPlanStatus.Paused,
            now.AddDays(-30), 2);

        await _context.SaveChangesAsync(cancellationToken);
        // The audit interceptor stamps orders with "now"; move them back to when they were bought (due stays 15 minutes later).
        foreach (var (orderId, createdAtUtc) in _backdated)
        {
            await _context.Orders.Where(row => row.Id == orderId).ExecuteUpdateAsync(setters => setters
                .SetProperty(row => row.CreatedAtUtc, createdAtUtc)
                .SetProperty(row => row.PaymentDueAtUtc, createdAtUtc.AddMinutes(15)), cancellationToken);
        }
        // The package for Lan is counted as used once (session 1 completed).
        await _context.CustomerPackages.Where(row => row.Id == DemoIds.CustomerPackageLan)
            .ExecuteUpdateAsync(setters => setters.SetProperty(row => row.UsedSessions, 1), cancellationToken);
    }

    private static SpaService Service(Guid id, string name, int minutes, decimal price)
    {
        var service = new SpaService
        {
            Id = id, Name = name, Category = "Chăm sóc da", DurationMinutes = minutes, Price = price, Description = "Dịch vụ mẫu để thử đặt lịch.",
        };
        service.ChangeStatus(id == DemoIds.ServiceMask ? CatalogStatus.Discontinued : CatalogStatus.OnSale);
        return service;
    }

    private static Promotion Promotion(Guid id, string code, string description, decimal percent, DateTime now) => new()
    {
        Id = id,
        Code = code,
        Description = description,
        DiscountType = DiscountType.Percentage,
        DiscountValue = percent,
        MinOrderAmount = 0,
        StartsAtUtc = now.AddDays(-1),
        EndsAtUtc = now.AddDays(60),
        Status = PromotionStatus.Active,
    };

    private void AddStaff(Guid id, string name, string email, string phone, string passwordHash, DateOnly today, Guid[] skills, bool afternoon)
    {
        _context.Users.Add(new User
        {
            Id = id, FullName = name, Email = email, PhoneNumber = phone, PasswordHash = passwordHash, Role = UserRole.Staff, Status = UserStatus.Active,
        });
        _context.StaffMembers.Add(new StaffMember { Id = id, HireDate = today.AddYears(-1), Specialty = "Chăm sóc da" });
        foreach (var serviceId in skills)
            _context.StaffSkills.Add(new StaffSkill { StaffMemberId = id, SpaServiceId = serviceId });
        for (var day = -3; day <= 14; day++)
        {
            _context.WorkSchedules.Add(WorkSchedule.Create(id, today.AddDays(day), new TimeOnly(8, 0), new TimeOnly(12, 0)));
            if (afternoon)
                _context.WorkSchedules.Add(WorkSchedule.Create(id, today.AddDays(day), new TimeOnly(13, 0), new TimeOnly(17, 0)));
        }
    }

    private void AddCustomer(Guid id, string name, string email, string phone, string passwordHash)
    {
        _context.Users.Add(new User
        {
            Id = id, FullName = name, Email = email, PhoneNumber = phone, PasswordHash = passwordHash, Role = UserRole.Customer, Status = UserStatus.Active,
        });
        _context.Customers.Add(new Customer { Id = id });
    }

    /// <summary>A paid one-line order (payment succeeded two minutes after it was created) and its entitlement.</summary>
    private void AddEntitlement(Guid id, Guid customerId, SpaService service, EntitlementStatus status, DateTime? expiresAtUtc, DateTime orderedAtUtc)
    {
        var order = PaidOrder(customerId, service.Price, orderedAtUtc);
        var line = new OrderItem
        {
            OrderId = order.Id, SpaServiceId = service.Id, ProductName = service.Name, UnitPrice = service.Price, LineTotal = service.Price,
        };
        order.Items.Add(line);
        _context.Orders.Add(order);
        _context.ServiceEntitlements.Add(new ServiceEntitlement
        {
            Id = id, CustomerId = customerId, OrderItemId = line.Id, Status = status, ExpiresAtUtc = expiresAtUtc,
        });
    }

    private List<TreatmentSession> AddPackage(Guid id, Guid planId, Guid customerId, ServicePackage package, SpaService[] services,
        TreatmentPlanStatus planStatus, DateTime boughtAtUtc, int sessionIdBlock)
    {
        var order = PaidOrder(customerId, package.Price, boughtAtUtc.AddMinutes(-2));
        var line = new OrderItem
        {
            OrderId = order.Id, ServicePackageId = package.Id, ProductName = package.Name, UnitPrice = package.Price, LineTotal = package.Price,
        };
        order.Items.Add(line);
        _context.Orders.Add(order);
        var plan = new TreatmentPlan
        {
            Id = planId, CustomerPackageId = id, Status = planStatus, Goal = "Giảm mụn viêm, đều màu da", PrimaryStaffMemberId = DemoIds.StaffAn,
        };
        var sequence = 0;
        foreach (var item in package.Items.OrderBy(item => item.SortOrder))
        {
            var service = services.Single(candidate => candidate.Id == item.SpaServiceId);
            for (var i = 0; i < item.SessionCount; i++)
            {
                plan.Sessions.Add(new TreatmentSession
                {
                    // Session n of block b: 0d000000-0000-0000-0000-0000000b000n.
                    Id = DemoIds.Session(sessionIdBlock, sequence + 1),
                    TreatmentPlanId = plan.Id,
                    SpaServiceId = service.Id,
                    SequenceNumber = ++sequence,
                    ServiceName = service.Name,
                    DurationMinutes = service.DurationMinutes,
                    Status = TreatmentSessionStatus.NotBooked,
                });
            }
        }
        _context.CustomerPackages.Add(new CustomerPackage
        {
            Id = id,
            CustomerId = customerId,
            OrderItemId = line.Id,
            PackageName = package.Name,
            PurchasedAtUtc = boughtAtUtc,
            ActivatedAtUtc = boughtAtUtc,
            ExpiresAtUtc = boughtAtUtc.AddDays(package.ValidityDays),
            TotalSessions = sequence,
            UsedSessions = 0,
            Status = CustomerPackageStatus.Active,
        });
        _context.TreatmentPlans.Add(plan);
        return plan.Sessions.OrderBy(session => session.SequenceNumber).ToList();
    }

    private Order PaidOrder(Guid customerId, decimal amount, DateTime createdAtUtc)
    {
        var order = new Order
        {
            Code = "DM" + Guid.NewGuid().ToString("N")[..12].ToUpperInvariant(),
            CustomerId = customerId,
            Subtotal = amount,
            GrandTotal = amount,
            Status = OrderStatus.Paid,
            PaymentDueAtUtc = _clock.UtcNow.AddMinutes(15),
        };
        _backdated.Add((order.Id, createdAtUtc));
        order.Payments.Add(new Payment
        {
            OrderId = order.Id,
            Provider = "vnpay",
            Amount = amount,
            Status = PaymentStatus.Succeeded,
            RequestCode = order.Code + "01",
            ExpiresAtUtc = createdAtUtc.AddMinutes(15),
            PaidAtUtc = createdAtUtc.AddMinutes(2),
            ProviderTransactionId = "DEMO" + order.Code,
        });
        return order;
    }

    private static Appointment Appointment(Guid id, Guid customerId, Guid staffId, DateOnly date, int hour, int minute, int minutes,
        AppointmentStatus status, DateTime now, Guid? entitlementId = null, Guid? sessionId = null)
    {
        var start = new TimeOnly(hour, minute);
        return new Appointment
        {
            Id = id,
            CustomerId = customerId,
            StaffMemberId = staffId,
            ServiceEntitlementId = entitlementId,
            TreatmentSessionId = sessionId,
            Date = date,
            StartTime = start,
            EndTime = start.AddMinutes(minutes),
            Status = status,
            CreatedAtUtc = now,
        };
    }
}

/// <summary>Fixed ids of the demo rows; the Postman environment carries the same values.</summary>
public static class DemoIds
{
    public static readonly Guid ServiceBasic = Guid.Parse("0d000000-0000-0000-0000-000000000101");
    public static readonly Guid ServiceMassage = Guid.Parse("0d000000-0000-0000-0000-000000000102");
    public static readonly Guid ServiceAcne = Guid.Parse("0d000000-0000-0000-0000-000000000103");
    public static readonly Guid ServiceMask = Guid.Parse("0d000000-0000-0000-0000-000000000104");
    public static readonly Guid PackageAcne = Guid.Parse("0d000000-0000-0000-0000-000000000201");
    public static readonly Guid PromotionFree = Guid.Parse("0d000000-0000-0000-0000-000000000301");
    public static readonly Guid PromotionTwenty = Guid.Parse("0d000000-0000-0000-0000-000000000302");
    public static readonly Guid StaffAn = Guid.Parse("0d000000-0000-0000-0000-000000000401");
    public static readonly Guid StaffBinh = Guid.Parse("0d000000-0000-0000-0000-000000000402");
    public static readonly Guid StaffChi = Guid.Parse("0d000000-0000-0000-0000-000000000403");
    public static readonly Guid CustomerLan = Guid.Parse("0d000000-0000-0000-0000-000000000501");
    public static readonly Guid CustomerMai = Guid.Parse("0d000000-0000-0000-0000-000000000502");
    public static readonly Guid EntitlementLanAvailable = Guid.Parse("0d000000-0000-0000-0000-000000000601");
    public static readonly Guid EntitlementLanDiscontinued = Guid.Parse("0d000000-0000-0000-0000-000000000602");
    public static readonly Guid EntitlementLanExpired = Guid.Parse("0d000000-0000-0000-0000-000000000603");
    public static readonly Guid EntitlementLanBooked = Guid.Parse("0d000000-0000-0000-0000-000000000604");
    public static readonly Guid EntitlementMaiAvailable = Guid.Parse("0d000000-0000-0000-0000-000000000605");
    public static readonly Guid CustomerPackageLan = Guid.Parse("0d000000-0000-0000-0000-000000000701");
    public static readonly Guid CustomerPackageMai = Guid.Parse("0d000000-0000-0000-0000-000000000702");
    public static readonly Guid TreatmentPlanLan = Guid.Parse("0d000000-0000-0000-0000-000000000801");
    public static readonly Guid TreatmentPlanMai = Guid.Parse("0d000000-0000-0000-0000-000000000802");
    public static readonly Guid AppointmentLanBooked = Guid.Parse("0d000000-0000-0000-0000-000000000901");

    /// <summary>Session <paramref name="sequence"/> of the package in <paramref name="block"/> (1 = Lan, 2 = Mai).</summary>
    public static Guid Session(int block, int sequence) => Guid.Parse($"0d000000-0000-0000-0000-{block:D8}{sequence:D4}");
}
